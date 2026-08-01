"use client";

// The categorical bar chart (ui#4; ui.md §7.1). The leaderboard's primary-metric view.
//
// MUI X draws the bars, the axes and the tooltip; the uncertainty layer is ours, because MUI X ships
// no error bars at all. The layer is mounted as a child of the chart, which puts it inside the same
// SVG and the same data provider, so it reads the *chart's own* scales rather than recomputing a
// scale beside it — two scales is two chances to disagree about where a value is.
//
// **One value axis. Never two.** `BarChartProps` exposes no axis object: the caller gives a unit and
// a title, and the chart owns everything else. Two measures of different scale are two charts, and a
// right-hand axis is the classic way to make an unrelated pair look correlated.
// `tests/types.test-d.ts` asserts the second axis is not expressible.

import { useTheme } from "@mui/material/styles";
import { BarChart as MuiBarChart } from "@mui/x-charts/BarChart";
import { useDrawingArea, useXScale, useYScale } from "@mui/x-charts/hooks";
import type { ReactNode } from "react";

import type { Async } from "../components/AsyncState.js";
import type { CategoricalSeriesKey } from "../theme.js";
import { ChartFrame, openBoundCaption } from "./ChartFrame.js";
import { MarkLayer, UncertaintyMark } from "./marks.js";
import { boundState, type BarDatum } from "./model.js";

const X_AXIS = "am-bar-category";
const Y_AXIS = "am-bar-value";

export interface BarChartProps {
  /** The bars, as a request state. See `ChartFrame` for why this is not an array. */
  readonly state: Async<readonly BarDatum[]>;
  /**
   * The chart's accessible name — **authored, not derived**. A chart's meaning is the caller's
   * knowledge ("Water-ice yield by scenario"), and a name assembled from column headings reads like
   * a database schema to someone who can only hear it.
   */
  readonly title: string;
  /**
   * The unit of the one value axis. **Required, and `null` must be written out** for a genuinely
   * dimensionless quantity — a value with no unit is a bug upstream (conventions.md §5), and an
   * optional prop would let that bug arrive here as a forgotten argument.
   */
  readonly unit: string | null;
  /** Which entry of the theme's categorical palette fills the bars. */
  readonly series?: CategoricalSeriesKey;
  readonly width?: number;
  readonly height?: number;
  readonly empty?: ReactNode;
  readonly loadingLabel?: string;
  readonly errorRemedy?: ReactNode;
}

/**
 * Round a bound away from zero to a readable tick, so no mark is drawn past the end of the scale.
 *
 * The domain is set explicitly rather than left to MUI X because MUI X sizes the axis from the
 * *series* — it knows nothing about our uncertainty layer, and a bar whose upper bound exceeds the
 * bars would have its interval silently clipped at the top of the plot. A clipped error bar reads as
 * a shorter one, which is the same lie in a subtler form.
 */
export function niceBound(value: number): number {
  if (value === 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(value)));
  const rounded = Math.ceil(Math.abs(value) / magnitude) * magnitude;
  return Math.sign(value) * rounded;
}

/** The value-axis domain, widened to hold every interval and to leave the open marks room. */
export function valueDomain(rows: readonly BarDatum[]): { min: number; max: number } {
  const extremes = rows.flatMap((row) => {
    const bound = boundState(row.bound) === "measured" ? (row.bound as number) : 0;
    return [row.value - bound, row.value + bound];
  });
  // A bar is read against zero, so zero is always in the domain — starting a bar axis anywhere else
  // makes a 2% difference look like a 200% one.
  return { min: niceBound(Math.min(0, ...extremes)), max: niceBound(Math.max(0, ...extremes)) };
}

/**
 * What the chart says to a reader who cannot see it.
 *
 * Every bar, its value, its unit, and — for each — whether a bound was measured. The open/closed
 * distinction is the chart's whole point, so it must survive being read aloud; a description that
 * lists only the numbers hands a screen-reader user the false precision the marks refuse to draw.
 */
export function describeBars(
  title: string,
  unit: string | null,
  rows: readonly BarDatum[],
): string {
  const suffix = unit === null ? "" : ` ${unit}`;
  const parts = rows.map((row) =>
    boundState(row.bound) === "open"
      ? `${row.label}: ${row.value}${suffix}, no measured uncertainty bound`
      : `${row.label}: ${row.value} ± ${row.bound}${suffix}`,
  );
  return `${title}. Bar chart of ${rows.length} value${rows.length === 1 ? "" : "s"}. ${parts.join("; ")}.`;
}

/** The uncertainty layer, mounted inside the chart so it shares the chart's scales. */
function BarUncertainty({ rows }: { readonly rows: readonly BarDatum[] }) {
  const xScale = useXScale<"band">(X_AXIS);
  const yScale = useYScale<"linear">(Y_AXIS);
  const drawing = useDrawingArea();

  return (
    <MarkLayer>
      {rows.map((row) => {
        const band = xScale(row.label);
        if (band === undefined) return null;
        const cx = band + xScale.bandwidth() / 2;
        const cy = yScale(row.value);
        const state = boundState(row.bound);
        // The drawing area's own origin, so the marks land on the bars rather than in the margin.
        const clamp = (value: number) =>
          Math.min(drawing.top + drawing.height, Math.max(drawing.top, value));

        return (
          <UncertaintyMark
            key={row.label}
            axis="y"
            state={state}
            cx={cx}
            cy={cy}
            lower={
              state === "measured" ? clamp(yScale(row.value - (row.bound as number))) : undefined
            }
            upper={
              state === "measured" ? clamp(yScale(row.value + (row.bound as number))) : undefined
            }
            datum={row.label}
          />
        );
      })}
    </MarkLayer>
  );
}

/**
 * Categorical bars with per-bar uncertainty.
 *
 * A bar whose bound is `null` gets an **open mark** — dashed, opening outward, terminating in
 * nothing — and never a zero-length tick at its top. A bar whose bound is `0` gets a real,
 * zero-length interval with caps, because that is a measurement.
 */
export function BarChart({
  state,
  title,
  unit,
  series = "series1",
  width = 480,
  height = 260,
  empty,
  loadingLabel,
  errorRemedy,
}: BarChartProps) {
  const theme = useTheme();

  return (
    <ChartFrame
      state={state}
      title={title}
      empty={empty}
      loadingLabel={loadingLabel}
      errorRemedy={errorRemedy}
      description={(rows) => describeBars(title, unit, rows)}
      caption={
        state.status === "ready"
          ? openBoundCaption(
              state.data.filter((row) => boundState(row.bound) === "open").length,
              state.data.length,
            )
          : undefined
      }
    >
      {(rows) => {
        const domain = valueDomain(rows);
        return (
          <MuiBarChart
            width={width}
            height={height}
            // No `title` / `desc`: MUI X hangs both off a `role="none"` element, which axe rejects
            // and which would leave the chart nameless regardless. `ChartFrame`'s figcaption is the
            // accessible surface, and it is the same one for all three charts.
            hideLegend
            xAxis={[{ id: X_AXIS, scaleType: "band", data: rows.map((row) => row.label) }]}
            yAxis={[{ id: Y_AXIS, min: domain.min, max: domain.max, label: unit ?? undefined }]}
            series={[
              {
                id: "am-bar-series",
                label: title,
                data: rows.map((row) => row.value),
                color: theme.vars.palette.categorical[series],
              },
            ]}
          >
            <BarUncertainty rows={rows} />
          </MuiBarChart>
        );
      }}
    </ChartFrame>
  );
}
