/**
 * Opening an MCAP recording in the browser — the `replay/` reader, index, and seek (view.md §3, §8).
 *
 * Three ways in, matching how a recording actually reaches a viewer:
 *
 * - `{ data }` / `{ blob }` — a local file. Tier-1: a researcher drops an episode on the page and it
 *   plays, with no cluster, no gateway, and no Hub (view.md §7).
 * - `{ url }` — **range-requested**, so a multi-hour recording seeks without downloading itself. The
 *   indexed reader asks for the summary at the tail, then only the chunks a seek touches.
 * - `{ url, digest }` — a **Bench-provided recording opened by content hash**. Bench serves the bytes
 *   at `GET /submissions/{id}/replay` and content-addresses them as `sha256:…`
 *   (`Submission.trace_hash`, `ViewReplay.mcap_digest`). Given a digest, View downloads the whole
 *   file and verifies it **before decoding a single record** — fail-closed, like Hub's own pull
 *   (conventions.md §5, §9). Verification and range requests are mutually exclusive by construction:
 *   you cannot hash bytes you declined to fetch.
 *
 * **Decompression is pure JavaScript, not wasm.** Sim's writer zstd-compresses its chunks. Foxglove's
 * `@foxglove/wasm-zstd` is emscripten glue that fetches a separate `wasm-zstd.wasm` at runtime from
 * its own script directory — a second `CESIUM_BASE_URL`-shaped staging burden on every host, in a
 * library whose whole packaging story (view.md §2.4, §7) is *not* doing that. `fzstd` decodes the
 * same frames in ~10 kB of ESM that bundles into `dist/index.js`. So "the MCAP wasm reader"
 * (view.md §4) is here the MCAP **TypeScript** reader; `@mcap/core` was never wasm to begin with.
 */

import { McapIndexedReader } from "@mcap/core";
import type { IReadable } from "@mcap/core";
import { decompress } from "fzstd";

import { isKnownChannel } from "./channels";
import type { ReplayChannel } from "./channels";
import { decodeSimFrame, ReplayError, SIM_FRAMES_TOPIC } from "./frames";
import type { ReplayFrame } from "./frames";

/** Where a recording's bytes come from. */
export type ReplaySource =
  | { readonly data: Uint8Array }
  | { readonly blob: Blob }
  | { readonly url: string; readonly digest?: string };

/** The provenance envelope Sim stamps into every recording. */
export interface ReplayProvenance {
  readonly contentHash: string | null;
  readonly scenario: string | null;
  readonly seed: number | null;
}

/** An opened recording: its channels, its extent, and a way to read frames out of it. */
export interface ReplayRecording {
  readonly channels: readonly ReplayChannel[];
  readonly provenance: ReplayProvenance | null;
  /** The verified `sha256:…` digest, when the caller supplied one. */
  readonly digest: string | null;
  /** Read `/sim/frames` messages, optionally restricted to a simulated-time window. */
  readFrames(window?: {
    readonly startS?: number;
    readonly endS?: number;
  }): AsyncIterable<ReplayFrame>;
}

export interface OpenReplayOptions {
  /** Injectable `fetch`, for tests and for hosts that proxy the recording. */
  readonly fetchImpl?: typeof fetch;
  /** Injectable digest, for environments without WebCrypto. */
  readonly digestImpl?: (bytes: Uint8Array) => Promise<string>;
}

const NS_PER_S = 1_000_000_000;

/** `log_time` is nanoseconds; Sim derives it from `sim_time_s`, so the two are the same clock. */
function toNanoseconds(seconds: number): bigint {
  return BigInt(Math.round(seconds * NS_PER_S));
}

/** MCAP's own reader interface over an in-memory buffer. */
function bufferReadable(bytes: Uint8Array): IReadable {
  return {
    size: async () => BigInt(bytes.byteLength),
    read: async (offset, size) => bytes.subarray(Number(offset), Number(offset + size)),
  };
}

function blobReadable(blob: Blob): IReadable {
  return {
    size: async () => BigInt(blob.size),
    read: async (offset, size) => {
      const start = Number(offset);
      const slice = await blob.slice(start, start + Number(size)).arrayBuffer();
      return new Uint8Array(slice);
    },
  };
}

/**
 * An `IReadable` backed by HTTP range requests, degrading to a single full download.
 *
 * A server that ignores `Range` answers 200 with the whole body. Handing that back as if it were the
 * requested slice would corrupt every offset the reader computed, so the first non-206 response
 * switches this to buffering the body once and slicing it in memory. Wrong answers are not an option;
 * a slower one is.
 */
async function rangeReadable(url: string, fetchImpl: typeof fetch): Promise<IReadable> {
  let buffered: Uint8Array | null = null;
  let totalSize: number | null = null;

  const downloadAll = async (): Promise<Uint8Array> => {
    if (buffered === null) {
      buffered = new Uint8Array(await (await fetchOk(url, fetchImpl)).arrayBuffer());
      totalSize = buffered.byteLength;
    }
    return buffered;
  };

  return {
    size: async () => {
      if (totalSize !== null) return BigInt(totalSize);
      // One-byte range probe: it reports the total in `Content-Range` and proves range support in
      // the same round trip, without a HEAD that CORS may not expose.
      const response = await fetchImpl(url, { headers: { Range: "bytes=0-0" } });
      const contentRange = response.headers.get("content-range");
      if (response.status === 206 && contentRange !== null) {
        const total = Number(contentRange.split("/")[1]);
        if (Number.isFinite(total)) {
          totalSize = total;
          return BigInt(total);
        }
      }
      return BigInt((await downloadAll()).byteLength);
    },
    read: async (offset, size) => {
      if (buffered !== null) return buffered.subarray(Number(offset), Number(offset + size));

      const start = Number(offset);
      const end = start + Number(size) - 1;
      const response = await fetchImpl(url, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status !== 206) {
        const all = await downloadAll();
        return all.subarray(start, end + 1);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

async function fetchOk(url: string, fetchImpl: typeof fetch): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new ReplayError(`could not fetch recording ${url}`, cause);
  }
  if (!response.ok) {
    throw new ReplayError(`recording ${url} returned HTTP ${response.status}`);
  }
  return response;
}

/** `sha256:<hex>` over the bytes, via WebCrypto. */
async function sha256(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new ReplayError(
      "opening a recording by content hash needs WebCrypto (crypto.subtle), which this environment " +
        "does not expose — serve the page over https, or open the recording without a digest",
    );
  }
  // `digest` takes any BufferSource, and a view carries its own offset and length — so hash the view
  // rather than copying the bytes into a fresh `ArrayBuffer`. That copy was not just wasteful: jsdom's
  // `SubtleCrypto` brand-checks its argument against its *own* realm's `ArrayBuffer` and rejects one
  // allocated here. `bytes.buffer` is typed `ArrayBufferLike` because a view *could* sit on a
  // `SharedArrayBuffer`; a recording read from a fetch, a blob, or a file never does.
  const view = new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
  const hashed = await subtle.digest("SHA-256", view);
  const hex = [...new Uint8Array(hashed)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

/** Identities handed out to byte-carrying sources, so two distinct blobs never share a key. */
const SOURCE_IDS = new WeakMap<object, number>();
let nextSourceId = 0;

/**
 * A stable value-identity for a `ReplaySource`, for keying a React effect on.
 *
 * `JSON.stringify` is what the world-manifest hook uses, and it is wrong here: a `Blob` serializes to
 * `{}`, so dropping a second recording on the page would produce the same key as the first and the
 * viewer would keep showing the old one. A `Uint8Array` serializes to every byte it holds, which for
 * a local episode means stringifying megabytes on every animation frame.
 *
 * A URL source is keyed by value, because hosts pass an inline object literal. A byte source is keyed
 * by object identity, because that is the only thing that distinguishes two blobs.
 */
export function replaySourceKey(source: ReplaySource | undefined): string {
  if (source === undefined) return "";
  if ("url" in source) return `url:${source.url}|${source.digest ?? ""}`;

  const carrier: object = "blob" in source ? source.blob : source.data;
  let id = SOURCE_IDS.get(carrier);
  if (id === undefined) {
    id = nextSourceId += 1;
    SOURCE_IDS.set(carrier, id);
  }
  return `bytes:${id}`;
}

/** Accept Bench's `sha256:<hex>` or a bare hex digest; anything else is a caller error. */
function normalizeDigest(digest: string): string {
  const lowered = digest.trim().toLowerCase();
  const hex = lowered.startsWith("sha256:") ? lowered.slice("sha256:".length) : lowered;
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new ReplayError(`"${digest}" is not a sha256 content hash`);
  }
  return `sha256:${hex}`;
}

async function resolveReadable(
  source: ReplaySource,
  { fetchImpl = fetch, digestImpl = sha256 }: OpenReplayOptions,
): Promise<{ readable: IReadable; digest: string | null }> {
  if ("data" in source) return { readable: bufferReadable(source.data), digest: null };
  if ("blob" in source) return { readable: blobReadable(source.blob), digest: null };

  if (source.digest === undefined) {
    return { readable: await rangeReadable(source.url, fetchImpl), digest: null };
  }

  const expected = normalizeDigest(source.digest);
  const bytes = new Uint8Array(await (await fetchOk(source.url, fetchImpl)).arrayBuffer());
  const actual = await digestImpl(bytes);
  if (actual !== expected) {
    // Fail closed. A recording that is not the recording you asked for is worse than none.
    throw new ReplayError(
      `recording ${source.url} does not match its content hash (expected ${expected}, got ${actual})`,
    );
  }
  return { readable: bufferReadable(bytes), digest: expected };
}

/** Open a recording and index it. Throws `ReplayError` on anything unreadable. */
export async function openReplay(
  source: ReplaySource,
  options: OpenReplayOptions = {},
): Promise<ReplayRecording> {
  const { readable, digest } = await resolveReadable(source, options);

  let reader: McapIndexedReader;
  try {
    reader = await McapIndexedReader.Initialize({
      readable,
      decompressHandlers: {
        // `fzstd` writes into a caller-supplied buffer; MCAP tells us exactly how big it is.
        zstd: (buffer, decompressedSize) =>
          decompress(buffer, new Uint8Array(Number(decompressedSize))),
      },
    });
  } catch (cause) {
    throw new ReplayError(
      "could not read the MCAP recording — it is malformed, or it carries no summary index " +
        "(seeking a recording without one is not supported)",
      cause,
    );
  }

  const channels: ReplayChannel[] = [...reader.channelsById.values()].map((channel) => {
    const schema = channel.schemaId === 0 ? undefined : reader.schemasById.get(channel.schemaId);
    const schemaName = schema?.name ?? "";
    return {
      id: channel.id,
      topic: channel.topic,
      schemaName,
      schemaEncoding: schema?.encoding ?? "",
      messageEncoding: channel.messageEncoding,
      known: isKnownChannel(channel.topic, schemaName),
    };
  });

  let provenance: ReplayProvenance | null = null;
  for await (const record of reader.readMetadata({ name: "provenance" })) {
    const seed = record.metadata.get("seed");
    provenance = {
      contentHash: record.metadata.get("content_hash") ?? null,
      scenario: record.metadata.get("scenario") ?? null,
      seed: seed === undefined ? null : Number(seed),
    };
  }

  const frameChannel = channels.find((channel) => channel.topic === SIM_FRAMES_TOPIC);
  if (frameChannel === undefined) {
    throw new ReplayError(
      `recording has no "${SIM_FRAMES_TOPIC}" channel, so it carries no episode to replay ` +
        `(it declares: ${channels.map((c) => c.topic).join(", ") || "nothing"})`,
    );
  }

  async function* readFrames(window?: { startS?: number; endS?: number }) {
    const messages = reader.readMessages({
      topics: [SIM_FRAMES_TOPIC],
      startTime: window?.startS === undefined ? undefined : toNanoseconds(window.startS),
      endTime: window?.endS === undefined ? undefined : toNanoseconds(window.endS),
    });
    for await (const message of messages) yield decodeSimFrame(message.data);
  }

  return { channels, provenance, digest, readFrames };
}
