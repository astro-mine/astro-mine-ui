// The one loading / error / empty discipline, for charts — and the one accessible-description
// discipline (ui#4; ui.md §2, §7, §7.1).
//
// Every chart in this package takes an `Async<…>` rather than an array, and renders through this
// frame. That is not ceremony: "empty, loading and error states routed through `AsyncState`, not
// bespoke per chart" is an acceptance criterion, and the way to hold it is to make a chart *unable*
// to receive a bare array. There is no branch for a page to write, so there is no branch for a page
// to write differently.
//
// **A `ready` chart with no rows is folded into `empty`.** A chart with no marks is a blank pane
// with axes drawn on it, which is precisely the failure `EmptyState` exists to prevent — the reader
// cannot tell "nothing scored" from "still loading" from "the request failed and the axes are all
// that survived". `AsyncState` already distinguishes empty from ready; this makes the chart's
// zero-row case use it.
//
// **The chart's words live here, not in the plot.** Every chart is a `<figure>` whose `<figcaption>`
// carries the full description, visually hidden, followed by whatever honesty caption the chart owes
// the reader. That is the whole accessible surface, and it is ours rather than the chart library's
// for a concrete reason: MUI X renders its SVG `aria-hidden` and attaches its own `title` to a
// `role="none"` element, which is an ARIA violation axe rejects outright and which would leave the
// chart nameless anyway. A `figure` + `figcaption` is the standard construction, it needs nothing
// from the plotting library, and it is identical across all three charts — including the one that
// has no MUI X underneath it at all.

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { AsyncState, type Async } from "../components/AsyncState.js";

/**
 * Present to assistive technology, absent from the page.
 *
 * Declared here rather than imported from `@mui/utils` so the design system does not take a direct
 * dependency on a MUI internal package for nine lines of CSS. `clip` rather than `display: none`,
 * because a hidden element is not in the accessibility tree and the point is to be in it.
 */
export const VISUALLY_HIDDEN = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;

export interface ChartFrameProps<T> {
  /** The request's state. Never a bare array — see the header. */
  readonly state: Async<readonly T[]>;
  /** The chart's accessible name, used for the loading announcement. */
  readonly title: string;
  /** Draws the chart. Called only with a non-empty set of rows. */
  readonly children: (rows: readonly T[]) => ReactNode;
  /**
   * The chart in words — everything a reader who cannot see it needs, including which values carry
   * no measured bound. This is the entire chart for a screen-reader user, so a description that
   * lists only the numbers hands them the false precision the marks refuse to draw.
   */
  readonly description: (rows: readonly T[]) => string;
  /**
   * Rendered under the chart, and read as part of its caption. This is where the honesty notes go —
   * which points carry no measured bound, which candidates were left out — so they sit with the
   * marks rather than in a page footnote.
   */
  readonly caption?: ReactNode;
  /** Replaces the default empty state; pass an `EmptyState` with words that fit the page. */
  readonly empty?: ReactNode;
  /** Defaults to naming the chart, which beats an unattributed spinner on a page of them. */
  readonly loadingLabel?: string;
  /** What to try, when the caller knows something better than "try again". */
  readonly errorRemedy?: ReactNode;
}

export function ChartFrame<T>({
  state,
  title,
  children,
  description,
  caption,
  empty,
  loadingLabel,
  errorRemedy,
}: ChartFrameProps<T>) {
  const resolved: Async<readonly T[]> =
    state.status === "ready" && state.data.length === 0 ? { status: "empty" } : state;

  return (
    <AsyncState
      state={resolved}
      loadingLabel={loadingLabel ?? `Loading ${title}…`}
      empty={empty}
      errorRemedy={errorRemedy}
    >
      {(rows) => (
        <Stack component="figure" spacing={1} sx={{ m: 0 }}>
          {children(rows)}
          <Box component="figcaption">
            <Box component="span" sx={VISUALLY_HIDDEN}>
              {description(rows)}
            </Box>
            {caption === undefined || caption === null ? null : (
              <Typography variant="caption" component="span" sx={{ color: "text.secondary" }}>
                {caption}
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </AsyncState>
  );
}

/**
 * The caption a chart shows when some of its marks are open.
 *
 * **"Some points", not "this axis has no uncertainty".** A surrogate-pruned candidate can sit beside
 * four that were re-evaluated at full fidelity; saying the axis is unbounded would misdescribe the
 * four. Returns `null` when every bound was measured, so a chart with nothing to disclose shows no
 * caption rather than an empty one.
 */
export function openBoundCaption(openCount: number, total: number): string | null {
  if (openCount === 0) return null;
  const tail =
    " Those marks are drawn open and end in nothing: the spread was never measured, not measured" +
    " as zero.";
  if (openCount === total) {
    return `No point on this chart carries a measured uncertainty bound.${tail}`;
  }
  const verb = openCount === 1 ? "carries" : "carry";
  return `${openCount} of ${total} points ${verb} no measured uncertainty bound.${tail}`;
}
