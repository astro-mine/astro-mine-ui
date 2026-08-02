/**
 * `<TimelineProvider>` — owns the shared clock and ticks it during fixed-rate playback.
 *
 * Playback advances off `requestAnimationFrame` and the *elapsed* wall time between frames, not a
 * fixed increment per frame: a browser that drops to 30 fps must replay at the same speed, not half
 * of it. The rAF loop exists only while `playing`, so a paused or scrubbing timeline costs nothing.
 *
 * The window is a prop rather than internal state, because it comes from the recording — the clock
 * cannot know its own extent until `replay/` has read the index.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, JSX } from "react";

import {
  advance,
  createClock,
  DEFAULT_RATE,
  IDLE_CLOCK,
  pause,
  play,
  seek,
  setRate,
} from "./clock";
import type { ClockState } from "./clock";
import { TimelineContext } from "./context";
import type { TimelineValue } from "./context";

export interface TimelineProviderProps {
  /** The recording's extent, in simulated seconds. `null` while it is still resolving. */
  readonly window: { readonly startS: number; readonly endS: number } | null;
  /** Simulated seconds per wall second. Changing it re-speeds the clock; it does not rewind it. */
  readonly rate?: number;
  /** Begin playing as soon as the window resolves. Read once, when the window arrives. */
  readonly autoplay?: boolean;
  readonly children?: ReactNode;
}

export function TimelineProvider({
  window: replayWindow,
  rate = DEFAULT_RATE,
  autoplay = false,
  children,
}: TimelineProviderProps): JSX.Element {
  const [clock, setClock] = useState<ClockState>(IDLE_CLOCK);

  const startS = replayWindow?.startS ?? null;
  const endS = replayWindow?.endS ?? null;

  // Rebuild the clock when the recording's extent arrives or changes, and re-speed it when `rate`
  // does — both during render, via React's documented "adjusting state when a prop changes", rather
  // than in effects. Two things follow, and the second is why this is not merely lint compliance:
  // no frame is ever painted with the previous recording's clock under the new recording's extent,
  // and the rebuild is not one render behind the extent that caused it.
  //
  // Scrub position is deliberately not preserved across recordings: t = 12 s means nothing in an
  // episode that never had a 12th second.
  // `null` is "no extent has been seen yet", which is NOT the same as an extent of `[null, null]`:
  // the clock must be built on the first render that has one, and an initial value equal to the
  // current props would skip it. The effect this replaced ran on mount for free; a render-time
  // guard has to say so.
  const [seenExtent, setSeenExtent] = useState<readonly [number | null, number | null] | null>(
    null,
  );
  const [seenRate, setSeenRate] = useState(rate);

  if (seenExtent === null || seenExtent[0] !== startS || seenExtent[1] !== endS) {
    setSeenExtent([startS, endS]);
    setSeenRate(rate);
    if (startS === null || endS === null) {
      setClock(IDLE_CLOCK);
    } else {
      const fresh = createClock(startS, endS, rate);
      // `rate` and `autoplay` seed a *new* clock and must never rebuild the current one — a host
      // wiring `rate` to a speed control would otherwise rewind the replay to t = 0 the moment
      // the operator picked "2×". That is why the rate branch below is an `else if`.
      setClock(autoplay ? play(fresh) : fresh);
    }
  } else if (seenRate !== rate) {
    // A later `rate` change re-speeds the clock in place, exactly as `setRate()` does — and must
    // not rewind it, which is what rebuilding would do.
    setSeenRate(rate);
    setClock((current) => (current.rate === rate ? current : setRate(current, rate)));
  }

  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!clock.playing) return;

    let last = performance.now();
    const tick = (now: number) => {
      const wallDtS = (now - last) / 1000;
      last = now;
      setClock((current) => advance(current, wallDtS));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [clock.playing]);

  const value = useMemo<TimelineValue>(
    () => ({
      clock,
      seek: (tS) => setClock((current) => seek(current, tS)),
      play: () => setClock(play),
      pause: () => setClock(pause),
      toggle: () => setClock((current) => (current.playing ? pause(current) : play(current))),
      setRate: (next) => setClock((current) => setRate(current, next)),
    }),
    [clock],
  );

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
