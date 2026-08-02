/**
 * The shared clock (view.md §3, "Clock"): the single timeline every widget subscribes to, so the
 * whole UI is time-coherent.
 *
 * Phase 1 ships two of its three modes — **fixed-rate replay** and **scrub**. The third,
 * *live-follow*, is Phase 2; it is deliberately absent rather than stubbed, because "one viewer, two
 * clocks — live and replay are the same code" (view.md §2 principle 2) means live arrives as a new
 * *source* behind the same channel model, not as a new clock. Nothing here would need to change.
 *
 * Time is **simulated seconds**, the axis Sim records on (`sim_time_s`). Rendering an epoch is a
 * separate concern: `replay/track.ts` maps a simulated time to a TDB `Epoch`, and `frames/time.ts`
 * formats it. There is no wall-clock, no UTC, and no `Date` anywhere in this module.
 *
 * Pure and immutable — every transition returns a new state, so this is exhaustively testable in the
 * Vitest lane without a renderer or a timer.
 */

/** The clock's whole state. `tS` is always within `[startS, endS]`. */
export interface ClockState {
  readonly startS: number;
  readonly endS: number;
  readonly tS: number;
  readonly playing: boolean;
  /** Simulated seconds per wall-clock second. Must be positive. */
  readonly rate: number;
}

/** Default playback rate: one simulated second per wall second. */
export const DEFAULT_RATE = 1;

/** The clock over an empty or unresolved recording — parked at zero, paused. */
export const IDLE_CLOCK: ClockState = {
  startS: 0,
  endS: 0,
  tS: 0,
  playing: false,
  rate: DEFAULT_RATE,
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** A fresh clock over `[startS, endS]`, parked at the start. */
export function createClock(startS: number, endS: number, rate = DEFAULT_RATE): ClockState {
  if (!Number.isFinite(startS) || !Number.isFinite(endS) || endS < startS) {
    throw new RangeError(`a clock window must be finite and non-empty, got [${startS}, ${endS}]`);
  }
  return { startS, endS, tS: startS, playing: false, rate: requireRate(rate) };
}

function requireRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError(`playback rate must be positive and finite, got ${rate}`);
  }
  return rate;
}

/** Scrub to `tS`, clamped into the window. Seeking never changes whether the clock is playing. */
export function seek(state: ClockState, tS: number): ClockState {
  if (!Number.isFinite(tS)) throw new RangeError(`cannot seek to ${tS}`);
  return { ...state, tS: clamp(tS, state.startS, state.endS) };
}

/** Start fixed-rate playback. Playing from the very end rewinds first, or it would do nothing. */
export function play(state: ClockState): ClockState {
  if (state.startS === state.endS) return state;
  const tS = state.tS >= state.endS ? state.startS : state.tS;
  return { ...state, tS, playing: true };
}

export function pause(state: ClockState): ClockState {
  return state.playing ? { ...state, playing: false } : state;
}

export function setRate(state: ClockState, rate: number): ClockState {
  return { ...state, rate: requireRate(rate) };
}

/**
 * Advance a playing clock by `wallDtS` seconds of wall time.
 *
 * On reaching the end the clock **stops there** rather than looping: a replay that silently restarts
 * looks exactly like a replay that never ended, and an operator watching a fault would not know
 * which they were seeing.
 */
export function advance(state: ClockState, wallDtS: number): ClockState {
  if (!state.playing || wallDtS <= 0) return state;
  const tS = state.tS + wallDtS * state.rate;
  if (tS >= state.endS) return { ...state, tS: state.endS, playing: false };
  return { ...state, tS };
}

/** Where the clock sits in its window, in `[0, 1]`. Zero for an empty window. */
export function progress(state: ClockState): number {
  const span = state.endS - state.startS;
  return span > 0 ? (state.tS - state.startS) / span : 0;
}
