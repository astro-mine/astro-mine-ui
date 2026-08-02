/**
 * `<TimelineScrubber>` — the control surface for the shared clock: play/pause, scrub, and a readout.
 *
 * Deliberately plain: a range input and a button. View is read-mostly (view.md §2 principle 1), and
 * a scrubber commands nothing but the viewer's own clock.
 *
 * **The readout is TDB, never UTC.** An epoch is rendered through `frames/time.ts`, which suffixes
 * every string `TDB`/`ET` and refuses to print a `Z`. Converting to civil time needs leap-second
 * kernels that live in `astro-mine-spice`, so a `Z` here would be a quietly wrong time. A recording
 * with no epoch shows simulated seconds instead, and says that is what they are.
 */
import type { CSSProperties, JSX } from "react";

import { formatEpoch } from "../frames/time";
import type { Epoch } from "../frames/types";
import { progress } from "./clock";
import { useTimeline } from "./context";
import { CONTROL, OVERLAY } from "../palette";

export interface TimelineScrubberProps {
  /** The epoch at the clock's current time, when the recording carries one. */
  readonly epoch?: Epoch | null;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Range inputs work in integers most reliably; 1000 steps is well under a pixel per step. */
const STEPS = 1000;

const bar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.4rem 0.6rem",
  font: "0.75rem system-ui, sans-serif",
  background: OVERLAY.timeline.background,
  color: OVERLAY.timeline.foreground,
};

const button: CSSProperties = {
  minWidth: "4.5rem",
  padding: "0.2rem 0.5rem",
  border: `1px solid ${CONTROL.border}`,
  borderRadius: 4,
  background: CONTROL.background,
  color: CONTROL.foreground,
  cursor: "pointer",
  font: "inherit",
};

export function TimelineScrubber({ epoch, className, style }: TimelineScrubberProps): JSX.Element {
  const { clock, seek, toggle } = useTimeline();
  const span = clock.endS - clock.startS;
  const empty = span <= 0;

  const readout =
    epoch !== null && epoch !== undefined
      ? formatEpoch(epoch, 1)
      : `t = ${clock.tS.toFixed(1)} s (simulated)`;

  return (
    <div
      className={className}
      style={{ ...bar, ...style }}
      data-testid="timeline-scrubber"
      data-playing={clock.playing}
      data-time-s={clock.tS}
    >
      <button
        type="button"
        style={button}
        onClick={toggle}
        disabled={empty}
        data-testid="timeline-toggle"
        aria-label={clock.playing ? "Pause replay" : "Play replay"}
      >
        {clock.playing ? "❚❚ Pause" : "▶ Play"}
      </button>

      <input
        type="range"
        min={0}
        max={STEPS}
        step={1}
        value={empty ? 0 : Math.round(progress(clock) * STEPS)}
        disabled={empty}
        onChange={(event) => seek(clock.startS + (Number(event.target.value) / STEPS) * span)}
        style={{ flex: 1 }}
        data-testid="timeline-range"
        aria-label="Replay position"
      />

      <span data-testid="timeline-readout" style={{ fontVariantNumeric: "tabular-nums" }}>
        {readout}
      </span>
    </div>
  );
}
