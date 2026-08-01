// The uncertainty marks, in chart space (ui#4; ui.md §7.1, honesty rule 2).
//
// **This is the file the acceptance criterion is about.** "A null bound renders as an open mark,
// asserted by a unit test on every chart that takes one." Every chart in this package draws its
// uncertainty through {@link UncertaintyMark} and no chart draws its own, so there is exactly one
// place where the rule can be broken and exactly one place a test has to watch.
//
// The mark publishes `data-uncertainty-bound="open" | "measured"` — the same attribute
// `UncertaintyValue` puts on a single number. One attribute, one property, whether the reader is
// looking at a table cell or at a scatter point.
//
// **Why the shapes differ the way they do.** A measured interval terminates in two serifs that say
// "it stops here". An open mark has no serifs: it is dashed, it opens outward at both ends, and its
// length is arbitrary *and looks it*. A reader must not be able to measure an open mark, because
// there is nothing to measure — which is exactly the false claim a zero-length tick makes.

import Box from "@mui/material/Box";

import type { BoundState } from "./model.js";

/** Half-width of the serif that closes a measured interval, in pixels. */
const CAP = 4;

/** Half-length of an open mark's stem, in pixels. Deliberately fixed: it encodes no quantity. */
const OPEN_REACH = 9;

/** Length of one arm of an open mark's outward chevron, in pixels. */
const CHEVRON = 4;

export interface UncertaintyMarkProps {
  /**
   * Which axis the uncertainty is on. A scatter point carries one of each, because `x` and `y` are
   * different measurements and can be separately unbounded.
   */
  readonly axis: "x" | "y";
  readonly state: BoundState;
  /** The value's position in the drawing area, in pixels. */
  readonly cx: number;
  readonly cy: number;
  /**
   * The interval's ends along `axis`, in pixels — required when `state` is `"measured"` and ignored
   * otherwise. They are passed already scaled because only the chart knows its own scales, and a
   * mark that resolved its own would need one implementation per chart.
   */
  readonly lower?: number;
  readonly upper?: number;
  /** The datum this mark belongs to, published so a test and a tooltip can name it. */
  readonly datum: string;
}

/**
 * One uncertainty mark: a closed interval where a bound was measured, an open mark where none was.
 *
 * Strokes `currentColor`, so the colour comes from the layer that mounts it and no colour literal
 * appears outside the theme.
 */
export function UncertaintyMark({
  axis,
  state,
  cx,
  cy,
  lower,
  upper,
  datum,
}: UncertaintyMarkProps) {
  const shared = {
    "data-uncertainty-bound": state,
    "data-uncertainty-axis": axis,
    "data-uncertainty-for": datum,
    // The mark restates a value the accessible description already carries in words, so exposing it
    // to assistive technology would read the same number twice with no new information.
    "aria-hidden": true as const,
  };

  if (state === "measured") {
    // A measured bound of exactly zero is a real result and draws a real, zero-length interval —
    // the caps still render, so it reads as "measured, and it did not vary", which is what happened.
    const from = lower ?? (axis === "y" ? cy : cx);
    const to = upper ?? (axis === "y" ? cy : cx);
    const line =
      axis === "y" ? { x1: cx, y1: from, x2: cx, y2: to } : { x1: from, y1: cy, x2: to, y2: cy };
    const caps =
      axis === "y"
        ? [
            { x1: cx - CAP, y1: from, x2: cx + CAP, y2: from },
            { x1: cx - CAP, y1: to, x2: cx + CAP, y2: to },
          ]
        : [
            { x1: from, y1: cy - CAP, x2: from, y2: cy + CAP },
            { x1: to, y1: cy - CAP, x2: to, y2: cy + CAP },
          ];

    return (
      <g {...shared}>
        <line {...line} stroke="currentColor" strokeWidth={1.5} />
        {caps.map((cap, index) => (
          <line key={index} {...cap} stroke="currentColor" strokeWidth={1.5} />
        ))}
      </g>
    );
  }

  // Open: dashed, and it terminates in chevrons that point away from the value. Nothing closes it,
  // because nothing is known to close it.
  const stem =
    axis === "y"
      ? { x1: cx, y1: cy - OPEN_REACH, x2: cx, y2: cy + OPEN_REACH }
      : { x1: cx - OPEN_REACH, y1: cy, x2: cx + OPEN_REACH, y2: cy };
  const chevrons =
    axis === "y"
      ? [
          `${cx - CHEVRON},${cy - OPEN_REACH + CHEVRON} ${cx},${cy - OPEN_REACH} ${cx + CHEVRON},${cy - OPEN_REACH + CHEVRON}`,
          `${cx - CHEVRON},${cy + OPEN_REACH - CHEVRON} ${cx},${cy + OPEN_REACH} ${cx + CHEVRON},${cy + OPEN_REACH - CHEVRON}`,
        ]
      : [
          `${cx - OPEN_REACH + CHEVRON},${cy - CHEVRON} ${cx - OPEN_REACH},${cy} ${cx - OPEN_REACH + CHEVRON},${cy + CHEVRON}`,
          `${cx + OPEN_REACH - CHEVRON},${cy - CHEVRON} ${cx + OPEN_REACH},${cy} ${cx + OPEN_REACH - CHEVRON},${cy + CHEVRON}`,
        ];

  return (
    <g {...shared}>
      <line {...stem} stroke="currentColor" strokeWidth={1.5} strokeDasharray="2 2" />
      {chevrons.map((points, index) => (
        <polyline
          key={index}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

/**
 * The layer marks are mounted in.
 *
 * It exists to hold the colour in one place: `text.secondary` is set here, the marks stroke
 * `currentColor`, and no chart names a colour. `pointer-events: none` keeps the marks from stealing
 * the hover a chart's own hit areas need.
 */
export function MarkLayer({ children }: { readonly children: React.ReactNode }) {
  return (
    <Box component="g" sx={{ color: "text.secondary", pointerEvents: "none" }}>
      {children}
    </Box>
  );
}
