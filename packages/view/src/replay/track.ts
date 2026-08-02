/**
 * A decoded episode as the scene consumes it: per-agent pose samples, indexed by simulated time.
 *
 * **Zero-order hold, never interpolation.** Between two recorded samples a track reports the earlier
 * one, unchanged, until the next arrives. Sim records at a fixed `dt_s` (30 s in the committed
 * fixture), so a smooth slide between poses would look better and *would be a fabrication*: View is
 * a faithful renderer and "must never synthesize a plausible-but-wrong" state (view.md §2 principle
 * 3). A rover that jumps every 30 s is telling the truth about the recording's cadence.
 *
 * **Only body-fixed agents can stand on a body-fixed globe.** Sim records inertial agents too — the
 * fixture's `relay` is in `J2000` — and their `translation_m` is metres about the body's *centre* in
 * a non-rotating frame. Plotting those numbers in `MOON_ME` would put the relay confidently in the
 * wrong place. Resolving `J2000 → MOON_ME` needs kernels and a SPICE implementation, which live in
 * `astro-mine-spice` (RFC-0002) and not in a browser. So the track marks such agents *unplaceable*
 * and the scene says so (`view.md` §2 principle 5, degrade-don't-blank).
 */

import type { Pose } from "../frames/pose";
import type { Epoch, ReferenceFrame } from "../frames/types";
import { FrameClass } from "../frames/types";
import type { ReplayFrame } from "./frames";

/** One agent's recorded motion. */
export interface ReplayAgentTrack {
  readonly agentId: string;
  readonly frame: ReferenceFrame;
  /** Whether this agent's poses can be drawn in the scene's body-fixed frame. */
  readonly placeable: boolean;
  /** Why not, when `placeable` is false. */
  readonly unplaceableReason: string | null;
  /** Ascending in `simTimeS`. */
  readonly samples: readonly { readonly simTimeS: number; readonly pose: Pose }[];
}

/** A whole episode, ready to drive a clock. */
export interface ReplayTrack {
  readonly startS: number;
  readonly endS: number;
  readonly agents: readonly ReplayAgentTrack[];
  /**
   * The epoch of `startS`, when the recording carried one. `tdb_seconds + (t - startS)` is the epoch
   * at any later `t`, because TDB is a uniform SI-second scale.
   */
  readonly startEpoch: Epoch | null;
}

/** How a track is bound to a scene: only poses in this frame are placeable. */
export interface TrackOptions {
  /** The scene's body-fixed frame, e.g. `MOON_ME`. */
  readonly bodyFixedFrame: string;
}

function classify(
  frame: ReferenceFrame,
  { bodyFixedFrame }: TrackOptions,
): { placeable: boolean; unplaceableReason: string | null } {
  if (frame.name === bodyFixedFrame) return { placeable: true, unplaceableReason: null };

  if (frame.frame_class === FrameClass.BODY_FIXED) {
    return {
      placeable: false,
      unplaceableReason: `recorded in body-fixed frame "${frame.name}", but the scene renders "${bodyFixedFrame}"`,
    };
  }
  return {
    placeable: false,
    unplaceableReason:
      `recorded in ${frame.frame_class} frame "${frame.name}"; resolving it into "${bodyFixedFrame}" ` +
      "needs SPICE (astro-mine-spice), which View does not carry",
  };
}

/**
 * Build a track from decoded frames.
 *
 * An agent whose frame changes mid-episode is a Sim bug, not something to average over: the first
 * frame it reports wins, and a later disagreement throws rather than silently placing half a
 * trajectory in the wrong space.
 */
export function buildTrack(frames: readonly ReplayFrame[], options: TrackOptions): ReplayTrack {
  const byAgent = new Map<
    string,
    { frame: ReferenceFrame; samples: { simTimeS: number; pose: Pose }[] }
  >();
  let startEpoch: Epoch | null = null;

  for (const frame of frames) {
    for (const observation of frame.observations) {
      if (startEpoch === null && observation.epoch !== null) {
        startEpoch = observation.epoch;
      }
      let entry = byAgent.get(observation.agentId);
      if (entry === undefined) {
        entry = { frame: observation.frame, samples: [] };
        byAgent.set(observation.agentId, entry);
      } else if (entry.frame.name !== observation.frame.name) {
        throw new Error(
          `agent "${observation.agentId}" changes reference frame mid-episode ` +
            `("${entry.frame.name}" → "${observation.frame.name}")`,
        );
      }
      entry.samples.push({ simTimeS: observation.simTimeS, pose: observation.pose });
    }
  }

  const times = frames.map((frame) => frame.simTimeS);
  const agents = [...byAgent.entries()]
    .map(([agentId, { frame, samples }]) => ({
      agentId,
      frame,
      ...classify(frame, options),
      samples: [...samples].sort((a, b) => a.simTimeS - b.simTimeS),
    }))
    .sort((a, b) => a.agentId.localeCompare(b.agentId));

  return {
    startS: times.length > 0 ? Math.min(...times) : 0,
    endS: times.length > 0 ? Math.max(...times) : 0,
    agents,
    startEpoch,
  };
}

/** The last sample at or before `simTimeS`; the first sample if `simTimeS` precedes the track. */
function holdIndex(samples: readonly { readonly simTimeS: number }[], simTimeS: number): number {
  // Binary search: a multi-hour episode is scrubbed continuously, so this is on the hot path.
  let low = 0;
  let high = samples.length - 1;
  if (high < 0 || simTimeS < samples[0].simTimeS) return 0;

  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (samples[mid].simTimeS <= simTimeS) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Every placeable agent's pose at `simTimeS`, held from its last recorded sample. */
export function posesAt(track: ReplayTrack, simTimeS: number): Map<string, Pose> {
  const poses = new Map<string, Pose>();
  for (const agent of track.agents) {
    if (!agent.placeable || agent.samples.length === 0) continue;
    poses.set(agent.agentId, agent.samples[holdIndex(agent.samples, simTimeS)].pose);
  }
  return poses;
}

/** The epoch at `simTimeS`, when the recording carried one. TDB has no leap seconds, so this is exact. */
export function epochAt(track: ReplayTrack, simTimeS: number): Epoch | null {
  if (track.startEpoch === null) return null;
  return {
    tdb_seconds: track.startEpoch.tdb_seconds + (simTimeS - track.startS),
    scale: track.startEpoch.scale,
  };
}
