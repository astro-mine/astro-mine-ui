/**
 * `replay/` — the MCAP reader, its index/seek, and the channel mapping (RM-P1-VIEW-04).
 *
 * Pure TypeScript, no Cesium: a host can open a recording, inspect its channels, and read poses out
 * of it without a renderer. `globe/ReplayLayer.tsx` is where a track meets the scene.
 */

export { describeChannels, isKnownChannel } from "./channels";
export type { ReplayChannel } from "./channels";

export { decodeSimFrame, ReplayError, SIM_FRAME_SCHEMA, SIM_FRAMES_TOPIC } from "./frames";
export type { ReplayFrame, ReplayObservation } from "./frames";

export { openReplay } from "./mcapSource";
export type {
  OpenReplayOptions,
  ReplayProvenance,
  ReplayRecording,
  ReplaySource,
} from "./mcapSource";

export { buildTrack, epochAt, posesAt } from "./track";
export type { ReplayAgentTrack, ReplayTrack, TrackOptions } from "./track";

export { useReplay } from "./useReplay";
export type { ResolvedReplay } from "./useReplay";
