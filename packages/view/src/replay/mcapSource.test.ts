import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { McapWriter } from "@mcap/core";

import { openReplay, replaySourceKey } from "./mcapSource";
import { ReplayError } from "./frames";
import { buildTrack, posesAt } from "./track";

/**
 * The committed fixture, recorded by Sim's own MCAP writer — zstd-compressed chunks, a summary
 * index, a `provenance.json` attachment. See `scripts/gen-replay-fixture.py`.
 *
 * These tests read the real bytes on purpose. A hand-rolled MCAP would prove only that View agrees
 * with itself; this proves it agrees with the producer, decompresses real zstd, and seeks a real
 * index (conventions.md §11, contract tests).
 */
// Vitest's root is `lib/`, and `import.meta.url` is not a file: URL under its transform.
const FIXTURE = new Uint8Array(
  readFileSync(resolve(process.cwd(), "fixtures/replay/episode.mcap")),
);

const FIXTURE_DIGEST = `sha256:${createHash("sha256").update(FIXTURE).digest("hex")}`;

/**
 * Always lend the jsdom lane Node's WebCrypto, rather than only when `crypto.subtle` is missing.
 *
 * Whether jsdom exposes a `SubtleCrypto` at all varies with the Node version, and the one it does
 * expose brand-checks its `BufferSource` argument against its own realm — so it rejects a buffer the
 * library allocated, in a way no browser does. Pinning the implementation keeps this lane testing
 * *our* digest logic instead of jsdom's realm boundary.
 */
beforeAll(() => {
  vi.stubGlobal("crypto", { subtle: webcrypto.subtle });
});

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

describe("opening a recording from local bytes", () => {
  it("reads Sim's channel, schema, and provenance", async () => {
    const recording = await openReplay({ data: FIXTURE });

    expect(recording.channels).toEqual([
      {
        id: 1,
        topic: "/sim/frames",
        schemaName: "astro_mine.sim.Frame",
        schemaEncoding: "jsonschema",
        messageEncoding: "json",
        known: true,
      },
    ]);
    expect(recording.provenance).toEqual({
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      scenario: "anchor-crater-ring-fixture",
      seed: 1001,
    });
    expect(recording.digest).toBeNull();
  });

  it("decompresses zstd chunks and decodes every frame", async () => {
    const recording = await openReplay({ data: FIXTURE });
    const frames = await collect(recording.readFrames());

    expect(frames).toHaveLength(25);
    expect(frames[0].kind).toBe("reset");
    expect(frames.at(-1)!.simTimeS).toBe(720);
    expect(frames[0].observations.map((o) => o.agentId)).toEqual([
      "relay",
      "rover-0",
      "rover-1",
      "rover-2",
      "rover-3",
      "rover-4",
      "rover-5",
    ]);
  });

  it("seeks through the index rather than scanning — a window reads only its own messages", async () => {
    const recording = await openReplay({ data: FIXTURE });
    const frames = await collect(recording.readFrames({ startS: 300, endS: 400 }));
    expect(frames.map((frame) => frame.simTimeS)).toEqual([300, 330, 360, 390]);
  });

  // The `{ blob }` source is exercised in the Playwright lane (`e2e/replay.spec.ts`): jsdom's `Blob`
  // implements neither `arrayBuffer()` nor `slice().arrayBuffer()`, so it cannot read its own bytes.

  it("produces a track whose rovers are placeable and whose relay is not", async () => {
    const recording = await openReplay({ data: FIXTURE });
    const track = buildTrack(await collect(recording.readFrames()), { bodyFixedFrame: "MOON_ME" });

    expect(track.startS).toBe(0);
    expect(track.endS).toBe(720);
    expect(track.agents.filter((agent) => agent.placeable)).toHaveLength(6);

    const relay = track.agents.find((agent) => agent.agentId === "relay")!;
    expect(relay.frame.name).toBe("J2000");
    expect(relay.placeable).toBe(false);

    const poses = posesAt(track, 360);
    expect([...poses.keys()]).toEqual([
      "rover-0",
      "rover-1",
      "rover-2",
      "rover-3",
      "rover-4",
      "rover-5",
    ]);
    // Each rover stands on the Moon's surface, not at its centre.
    for (const pose of poses.values()) {
      const { xM, yM, zM } = pose.translationM;
      expect(Math.hypot(xM, yM, zM)).toBeGreaterThan(1_700_000);
    }
  });
});

describe("opening a recording over HTTP", () => {
  /** A server that honours `Range`, and counts how many bytes it actually served. */
  function rangeServer() {
    let served = 0;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const range = (init?.headers as Record<string, string> | undefined)?.Range;
      if (range === undefined) {
        served += FIXTURE.byteLength;
        return new Response(FIXTURE, { status: 200 });
      }
      const [start, end] = range.replace("bytes=", "").split("-").map(Number);
      const slice = FIXTURE.subarray(start, end + 1);
      served += slice.byteLength;
      return new Response(slice, {
        status: 206,
        headers: { "content-range": `bytes ${start}-${end}/${FIXTURE.byteLength}` },
      });
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, served: () => served };
  }

  it("range-requests only what the index and the seek window need", async () => {
    const server = rangeServer();
    const recording = await openReplay(
      { url: "https://bench.example/replay.mcap" },
      { fetchImpl: server.fetchImpl },
    );
    const frames = await collect(recording.readFrames({ startS: 300, endS: 400 }));

    expect(frames.map((frame) => frame.simTimeS)).toEqual([300, 330, 360, 390]);
    // The whole file was never downloaded in one go.
    expect(server.served()).toBeLessThan(FIXTURE.byteLength);
  });

  it("falls back to a full download when the server ignores Range", async () => {
    const fetchImpl = vi.fn(async () => new Response(FIXTURE, { status: 200 }));
    const recording = await openReplay(
      { url: "https://bench.example/replay.mcap" },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    const frames = await collect(recording.readFrames({ startS: 0, endS: 30 }));
    expect(frames.map((frame) => frame.simTimeS)).toEqual([0, 30]);
  });

  it("reports an unfetchable recording rather than throwing something opaque", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    await expect(
      openReplay(
        { url: "https://bench.example/missing.mcap", digest: FIXTURE_DIGEST },
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      ),
    ).rejects.toThrow(/returned HTTP 404/);
  });

  it("wraps a network failure, keeping the cause", async () => {
    const boom = new TypeError("network down");
    const fetchImpl = vi.fn(async () => {
      throw boom;
    });
    const error = await openReplay(
      { url: "https://bench.example/replay.mcap", digest: FIXTURE_DIGEST },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    ).catch((e: ReplayError) => e);

    expect(error).toBeInstanceOf(ReplayError);
    expect((error as ReplayError).message).toMatch(/could not fetch recording/);
    expect((error as ReplayError).cause).toBe(boom);
  });
});

describe("opening a Bench recording by content hash", () => {
  const serve = () =>
    vi.fn(async () => new Response(FIXTURE, { status: 200 })) as unknown as typeof fetch;

  it("verifies the digest and reports it", async () => {
    const recording = await openReplay(
      { url: "https://bench.example/replay.mcap", digest: FIXTURE_DIGEST },
      { fetchImpl: serve() },
    );
    expect(recording.digest).toBe(FIXTURE_DIGEST);
    expect(await collect(recording.readFrames({ startS: 0, endS: 0 }))).toHaveLength(1);
  });

  it("accepts a bare hex digest as well as Bench's sha256: prefix", async () => {
    const recording = await openReplay(
      {
        url: "https://bench.example/replay.mcap",
        digest: FIXTURE_DIGEST.slice("sha256:".length).toUpperCase(),
      },
      { fetchImpl: serve() },
    );
    expect(recording.digest).toBe(FIXTURE_DIGEST);
  });

  it("fails closed on a mismatch, before decoding a single record", async () => {
    const digestImpl = vi.fn(async () => `sha256:${"0".repeat(64)}`);
    await expect(
      openReplay(
        { url: "https://bench.example/replay.mcap", digest: FIXTURE_DIGEST },
        { fetchImpl: serve(), digestImpl },
      ),
    ).rejects.toThrow(/does not match its content hash/);
    expect(digestImpl).toHaveBeenCalledOnce();
  });

  it("rejects a digest that is not a sha256 at all", async () => {
    await expect(
      openReplay(
        { url: "https://bench.example/replay.mcap", digest: "md5:deadbeef" },
        { fetchImpl: serve() },
      ),
    ).rejects.toThrow(/is not a sha256 content hash/);
  });

  it("says so plainly when the page has no WebCrypto to verify with", async () => {
    vi.stubGlobal("crypto", {});
    await expect(
      openReplay(
        { url: "https://bench.example/replay.mcap", digest: FIXTURE_DIGEST },
        { fetchImpl: serve() },
      ),
    ).rejects.toThrow(/needs WebCrypto/);
    vi.stubGlobal("crypto", { subtle: webcrypto.subtle });
  });
});

describe("keying a source, so a viewer reloads exactly when the recording changes", () => {
  it("keys a URL by value — hosts pass an inline object literal every render", () => {
    const key = replaySourceKey({ url: "/a.mcap" });
    expect(replaySourceKey({ url: "/a.mcap" })).toBe(key);
    expect(replaySourceKey({ url: "/b.mcap" })).not.toBe(key);
    expect(replaySourceKey({ url: "/a.mcap", digest: FIXTURE_DIGEST })).not.toBe(key);
    expect(replaySourceKey(undefined)).toBe("");
  });

  it("distinguishes two blobs, which JSON.stringify would both render as {}", () => {
    const first = new Blob([FIXTURE]);
    const second = new Blob([FIXTURE]);
    expect(JSON.stringify({ blob: first })).toBe(JSON.stringify({ blob: second }));

    expect(replaySourceKey({ blob: first })).toBe(replaySourceKey({ blob: first }));
    expect(replaySourceKey({ blob: first })).not.toBe(replaySourceKey({ blob: second }));
  });

  it("distinguishes two byte buffers without stringifying either", () => {
    const first = FIXTURE;
    const second = FIXTURE.slice();
    expect(replaySourceKey({ data: first })).toBe(replaySourceKey({ data: first }));
    expect(replaySourceKey({ data: first })).not.toBe(replaySourceKey({ data: second }));
    // The key is an identity, not the megabytes themselves.
    expect(replaySourceKey({ data: first }).length).toBeLessThan(32);
  });
});

describe("a recording View cannot replay", () => {
  /** Build a valid, indexed MCAP carrying only a channel View has no decoder for. */
  async function verdictsOnly(): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let position = 0n;
    const writer = new McapWriter({
      writable: {
        position: () => position,
        write: async (buffer: Uint8Array) => {
          chunks.push(new Uint8Array(buffer));
          position += BigInt(buffer.byteLength);
        },
      },
    });
    await writer.start({ profile: "astro-mine-sim", library: "test" });
    const schemaId = await writer.registerSchema({
      name: "astro_mine.core.SafetyVerdict",
      encoding: "jsonschema",
      data: new TextEncoder().encode("{}"),
    });
    const channelId = await writer.registerChannel({
      topic: "/guard/verdicts",
      schemaId,
      messageEncoding: "json",
      metadata: new Map(),
    });
    await writer.addMessage({
      channelId,
      sequence: 0,
      logTime: 0n,
      publishTime: 0n,
      data: new TextEncoder().encode("{}"),
    });
    await writer.end();

    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  it("refuses a recording with no /sim/frames channel, and names what it did find", async () => {
    const bytes = await verdictsOnly();
    await expect(openReplay({ data: bytes })).rejects.toThrow(
      /has no "\/sim\/frames" channel.*\/guard\/verdicts/s,
    );
  });

  it("reports malformed bytes as a ReplayError, not an MCAP internal", async () => {
    await expect(openReplay({ data: new Uint8Array([1, 2, 3, 4]) })).rejects.toBeInstanceOf(
      ReplayError,
    );
  });
});
