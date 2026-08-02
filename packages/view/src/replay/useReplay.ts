/**
 * `useReplay(source)` — open a recording, decode it, and report honestly while doing so.
 *
 * The whole episode is decoded into a `ReplayTrack` up front. That is the right trade for the Phase-1
 * thin slice — a scrub then costs a binary search rather than a chunk read, which is what "sub-second
 * seek" (view.md §8) has to mean when the user is dragging — and the recordings this renders are
 * episodes, not multi-hour ops sessions. Streaming decode with windowed decimation is the Phase-2
 * gateway's job (view.md §3, §8); `openReplay().readFrames({ startS, endS })` already seeks through
 * the MCAP index, so that path exists when it is needed.
 */

import { useEffect, useRef, useState } from "react";

import { INITIALIZING } from "../globe/status";
import type { GlobeStatus } from "../globe/status";
import { describeChannels } from "./channels";
import type { ReplayChannel } from "./channels";
import { openReplay, replaySourceKey } from "./mcapSource";
import type { OpenReplayOptions, ReplayProvenance, ReplaySource } from "./mcapSource";
import { buildTrack } from "./track";
import type { ReplayTrack } from "./track";

export interface ResolvedReplay {
  readonly track: ReplayTrack | null;
  readonly channels: readonly ReplayChannel[];
  readonly provenance: ReplayProvenance | null;
  readonly status: GlobeStatus;
}

function describe(track: ReplayTrack, channels: readonly ReplayChannel[]): GlobeStatus {
  const placeable = track.agents.filter((agent) => agent.placeable);
  const unplaceable = track.agents.filter((agent) => !agent.placeable);
  const span = `${(track.endS - track.startS).toFixed(0)} s`;

  // Both halves are "degrade, don't blank" (view.md §2 principle 5): the episode plays, and the
  // viewer is told exactly what is missing from it rather than left to count rovers.
  const notes: string[] = [];
  if (unplaceable.length > 0) {
    notes.push(
      `${unplaceable.length} not placeable (${unplaceable
        .map((agent) => `${agent.agentId}: ${agent.unplaceableReason}`)
        .join("; ")})`,
    );
  }
  const channelNote = describeChannels(channels);
  if (channels.some((channel) => !channel.known)) notes.push(channelNote);

  if (notes.length === 0) {
    return { kind: "ready", detail: `Replay ready — ${placeable.length} agents over ${span}.` };
  }
  return {
    kind: "stale",
    detail: `Replay ready — ${placeable.length} of ${track.agents.length} agents over ${span}. ${notes.join(". ")}.`,
  };
}

/**
 * Resolve `source` into a track bound to `bodyFixedFrame`.
 *
 * `bodyFixedFrame` is what decides which agents can be drawn: a pose in `J2000` is not a pose in
 * `MOON_ME`, and View will not pretend otherwise (see `track.ts`).
 */
export function useReplay(
  source: ReplaySource | undefined,
  bodyFixedFrame: string,
  options: OpenReplayOptions = {},
): ResolvedReplay {
  const [resolved, setResolved] = useState<ResolvedReplay>({
    track: null,
    channels: [],
    provenance: null,
    status: INITIALIZING,
  });

  // Held in a ref, not in the effect's deps. A host writing `useReplay(src, frame, { fetchImpl: (u) =>
  // authedFetch(u) })` hands us a new function every render; keying the effect on it would re-fetch
  // and re-decode the whole episode on every frame the clock advances.
  const optionsRef = useRef(options);
  // In an effect, not during render. The options object is a fresh literal every render, which
  // is the whole reason it is held in a ref rather than in the effect's dependencies.
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const sourceKey = replaySourceKey(source);

  // Reset during render when the recording changes, not in the effect. A replay is the case where
  // painting the previous subject's data for a frame is worst: the scrubber would show the old
  // episode's extent under the new episode's name.
  const [seenKey, setSeenKey] = useState(sourceKey);
  if (seenKey !== sourceKey) {
    setSeenKey(sourceKey);
    setResolved(
      source === undefined
        ? {
            track: null,
            channels: [],
            provenance: null,
            status: { kind: "ready", detail: "No recording loaded." },
          }
        : { track: null, channels: [], provenance: null, status: INITIALIZING },
    );
  }

  useEffect(() => {
    if (source === undefined) {
      return;
    }

    let cancelled = false;

    (async () => {
      const recording = await openReplay(source, optionsRef.current);
      const frames = [];
      for await (const frame of recording.readFrames()) frames.push(frame);
      const track = buildTrack(frames, { bodyFixedFrame });
      if (cancelled) return;
      setResolved({
        track,
        channels: recording.channels,
        provenance: recording.provenance,
        status: describe(track, recording.channels),
      });
    })().catch((error: unknown) => {
      if (cancelled) return;
      setResolved({
        track: null,
        channels: [],
        provenance: null,
        status: {
          kind: "unavailable",
          detail: `Replay unavailable (${error instanceof Error ? error.message : String(error)}).`,
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceKey is the identity of source
  }, [sourceKey, bodyFixedFrame]);

  return resolved;
}
