/**
 * `timeline/` — the shared clock every widget subscribes to (RM-P1-VIEW-04).
 *
 * Phase 1 ships the **replay** clock: fixed-rate playback and scrub. Live-follow is Phase 2 and
 * arrives as a new source behind the same channel model, not as a second clock (view.md §2
 * principle 2).
 */

export {
  advance,
  createClock,
  DEFAULT_RATE,
  IDLE_CLOCK,
  pause,
  play,
  progress,
  seek,
  setRate,
} from "./clock";
export type { ClockState } from "./clock";

export { TimelineContext, useTimeline } from "./context";
export type { TimelineValue } from "./context";

export { TimelineProvider } from "./TimelineProvider";
export type { TimelineProviderProps } from "./TimelineProvider";

export { TimelineScrubber } from "./TimelineScrubber";
export type { TimelineScrubberProps } from "./TimelineScrubber";
