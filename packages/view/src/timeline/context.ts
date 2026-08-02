/**
 * The clock's React seam: one timeline, many subscribers (view.md §3).
 *
 * A widget reads `useTimeline()` and re-renders when the clock moves. It never owns a clock of its
 * own — that is what makes the globe, a future dashboard, and a future explanation panel show the
 * same instant.
 */

import { createContext, useContext } from "react";

import type { ClockState } from "./clock";

/** The clock, plus the transitions a control surface may drive it through. */
export interface TimelineValue {
  readonly clock: ClockState;
  readonly seek: (tS: number) => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly setRate: (rate: number) => void;
}

export const TimelineContext = createContext<TimelineValue | null>(null);

/** The enclosing `<TimelineProvider>`'s clock. Throws outside one, rather than inventing time. */
export function useTimeline(): TimelineValue {
  const value = useContext(TimelineContext);
  if (value === null) {
    throw new Error("useTimeline() must be used inside a <TimelineProvider>");
  }
  return value;
}
