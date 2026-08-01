"use client";

// The trade-off scatter (ui#4; ui.md §7.1). Studio's Pareto front.
//
// Three things this chart must do that MUI X does not do for it:
//
//   1. **Uncertainty on both axes.** `x` and `y` are different measurements and can be separately
//      unbounded, so each point carries its own mark per axis. MUI X ships no error bars.
//   2. **Pareto membership without colour alone** (ui.md §7 rule 7). Membership is a *shape* — a
//      filled circle on the front, a hollow square off it — and a colour, and a word in the
//      description. Two hues would be one hue to a dichromat, and the front is the whole point of
//      the plot.
//   3. **Selection that a keyboard can reach.** The marks are clickable, but they cannot *be* the
//      keyboard affordance: MUI X renders its SVG `aria-hidden`, so a focusable element inside it is
//      one assistive technology cannot see and axe rejects outright (`aria-hidden-focus`). The
//      keyboard and screen-reader path is therefore `ItemSelector` — real buttons, in a real list,
//      hidden from the page until something in it takes focus. That is the standard construction
//      for an interactive graphic, and the cost is one tab stop per point — the right trade for the
//      tens of candidates a study compares, and the reason this is not the chart to plot ten
//      thousand points with.

import { useTheme } from "@mui/material/styles";
import { ScatterChart as MuiScatterChart } from "@mui/x-charts/ScatterChart";
import type { ScatterMarkerProps } from "@mui/x-charts/ScatterChart";
import { useDrawingArea, useXScale, useYScale } from "@mui/x-charts/hooks";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Async } from "../components/AsyncState.js";
import { ChartFrame, openBoundCaption } from "./ChartFrame.js";
import { ItemSelector } from "./ItemSelector.js";
import { MarkLayer, UncertaintyMark } from "./marks.js";
import { boundState, type ScatterPoint } from "./model.js";

const X_AXIS = "am-scatter-x";
const Y_AXIS = "am-scatter-y";
const FRONT = "am-scatter-front";
const OFF_FRONT = "am-scatter-off-front";

export interface ScatterChartProps {
  readonly state: Async<readonly ScatterPoint[]>;
  /** The chart's accessible name — authored, not derived. */
  readonly title: string;
  readonly xLabel: string;
  /** The x axis's unit. Required; write `null` out for a dimensionless quantity. */
  readonly xUnit: string | null;
  readonly yLabel: string;
  /** The y axis's unit. Required; write `null` out for a dimensionless quantity. */
  readonly yUnit: string | null;
  /** The selected point's id, or `null`. Controlled: the page owns the selection. */
  readonly selectedId?: string | null;
  /** Called with a point's id, or `null` when the selected point is chosen again. */
  readonly onSelect?: (id: string | null) => void;
  readonly width?: number;
  readonly height?: number;
  readonly empty?: ReactNode;
  readonly loadingLabel?: string;
  readonly errorRemedy?: ReactNode;
}

/** Split into the two series MUI X draws, keeping the original point beside each datum. */
function partition(points: readonly ScatterPoint[]) {
  return {
    front: points.filter((point) => point.onFront),
    offFront: points.filter((point) => !point.onFront),
  };
}

/**
 * How to describe one point in words.
 *
 * The bound is named for **each** axis, because "no bound" is a property of a measurement and not of
 * a point: a candidate can have a well-characterised mass and an unbounded yield.
 */
export function describePoint(point: ScatterPoint, xUnit: string | null, yUnit: string | null) {
  const say = (measured: { value: number; bound?: number | null }, unit: string | null) => {
    const suffix = unit === null ? "" : ` ${unit}`;
    return boundState(measured.bound) === "open"
      ? `${measured.value}${suffix}, no measured uncertainty bound`
      : `${measured.value} ± ${measured.bound}${suffix}`;
  };
  const membership = point.onFront ? "on the Pareto front" : "not on the Pareto front";
  return `${point.label}, ${membership}. x: ${say(point.x, xUnit)}. y: ${say(point.y, yUnit)}.`;
}

/** What the chart says to a reader who cannot see it. */
export function describeScatter(
  title: string,
  points: readonly ScatterPoint[],
  xLabel: string,
  xUnit: string | null,
  yLabel: string,
  yUnit: string | null,
): string {
  const onFront = points.filter((point) => point.onFront).length;
  return (
    `${title}. Scatter plot of ${points.length} point${points.length === 1 ? "" : "s"}, ` +
    `${xLabel} against ${yLabel}. ${onFront} on the Pareto front. ` +
    points.map((point) => describePoint(point, xUnit, yUnit)).join(" ")
  );
}

// --- the marker -------------------------------------------------------------

interface MarkerContextValue {
  readonly bySeries: Readonly<Record<string, readonly ScatterPoint[]>>;
  readonly selectedId: string | null;
  readonly onSelect?: (id: string | null) => void;
  readonly xUnit: string | null;
  readonly yUnit: string | null;
}

/**
 * The marker slot receives only `seriesId` and `dataIndex`, so the point behind a mark is looked up
 * through context rather than closed over: a component defined inside `render` is a new component
 * *type* on every render, which unmounts and remounts every mark and loses focus mid-interaction.
 */
const MarkerContext = createContext<MarkerContextValue | null>(null);

function ParetoMarker({ seriesId, dataIndex, x, y, size, color }: ScatterMarkerProps) {
  const context = useContext(MarkerContext);
  const point = context?.bySeries[String(seriesId)]?.[dataIndex];
  if (context === undefined || context === null || point === undefined) return null;

  const selected = context.selectedId === point.id;
  const radius = size / 2;
  const select = () => context.onSelect?.(selected ? null : point.id);
  const interactive = context.onSelect !== undefined;

  // Filled circle on the front, hollow square off it. The shape carries the membership; the colour
  // repeats it for readers who can use colour, and the label states it for readers who cannot.
  const shape = point.onFront ? (
    <circle cx={x} cy={y} r={radius} fill={color} />
  ) : (
    <rect
      x={x - radius}
      y={y - radius}
      width={radius * 2}
      height={radius * 2}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    />
  );

  // No ARIA and no tabindex: this lives inside MUI X's `aria-hidden` SVG, where a focusable element
  // would be unreachable by assistive technology and a violation besides. The mark is the *mouse*
  // affordance; `ItemSelector` is the keyboard and screen-reader one, and both call the same
  // handler.
  return (
    <g
      data-pareto-front={point.onFront ? "on" : "off"}
      data-point-id={point.id}
      data-selected={selected ? "true" : undefined}
      onClick={interactive ? select : undefined}
      style={interactive ? { cursor: "pointer" } : undefined}
    >
      {/* The selection ring is drawn outside the mark rather than by recolouring it, so selection
          and Pareto membership never compete for the same channel. */}
      {selected ? (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          pointerEvents="none"
        />
      ) : null}
      {shape}
    </g>
  );
}

// --- the uncertainty layer --------------------------------------------------

function ScatterUncertainty({ points }: { readonly points: readonly ScatterPoint[] }) {
  const xScale = useXScale<"linear">(X_AXIS);
  const yScale = useYScale<"linear">(Y_AXIS);
  const drawing = useDrawingArea();

  const clampX = (value: number) =>
    Math.min(drawing.left + drawing.width, Math.max(drawing.left, value));
  const clampY = (value: number) =>
    Math.min(drawing.top + drawing.height, Math.max(drawing.top, value));

  return (
    <MarkLayer>
      {points.map((point) => {
        const cx = xScale(point.x.value);
        const cy = yScale(point.y.value);
        const xState = boundState(point.x.bound);
        const yState = boundState(point.y.bound);
        return (
          <g key={point.id}>
            <UncertaintyMark
              axis="x"
              state={xState}
              cx={cx}
              cy={cy}
              lower={
                xState === "measured"
                  ? clampX(xScale(point.x.value - (point.x.bound as number)))
                  : undefined
              }
              upper={
                xState === "measured"
                  ? clampX(xScale(point.x.value + (point.x.bound as number)))
                  : undefined
              }
              datum={point.id}
            />
            <UncertaintyMark
              axis="y"
              state={yState}
              cx={cx}
              cy={cy}
              lower={
                yState === "measured"
                  ? clampY(yScale(point.y.value - (point.y.bound as number)))
                  : undefined
              }
              upper={
                yState === "measured"
                  ? clampY(yScale(point.y.value + (point.y.bound as number)))
                  : undefined
              }
              datum={point.id}
            />
          </g>
        );
      })}
    </MarkLayer>
  );
}

// --- the chart --------------------------------------------------------------

/**
 * A two-metric trade-off scatter with uncertainty on both axes.
 *
 * **One y axis**, and no way to ask for a second: `ScatterChartProps` exposes labels and units, not
 * axis objects. A right-hand axis is how two unrelated series are made to look correlated, and
 * `tests/types.test-d.ts` asserts it cannot be expressed here.
 */
export function ScatterChart({
  state,
  title,
  xLabel,
  xUnit,
  yLabel,
  yUnit,
  selectedId = null,
  onSelect,
  width = 520,
  height = 360,
  empty,
  loadingLabel,
  errorRemedy,
}: ScatterChartProps) {
  const theme = useTheme();

  const openCount =
    state.status === "ready"
      ? state.data.filter(
          (point) => boundState(point.x.bound) === "open" || boundState(point.y.bound) === "open",
        ).length
      : 0;

  return (
    <ChartFrame
      state={state}
      title={title}
      empty={empty}
      loadingLabel={loadingLabel}
      errorRemedy={errorRemedy}
      description={(points) => describeScatter(title, points, xLabel, xUnit, yLabel, yUnit)}
      caption={
        state.status === "ready" ? openBoundCaption(openCount, state.data.length) : undefined
      }
    >
      {(points) => (
        <Plot
          points={points}
          xLabel={xLabel}
          xUnit={xUnit}
          yLabel={yLabel}
          yUnit={yUnit}
          selectedId={selectedId}
          onSelect={onSelect}
          width={width}
          height={height}
          frontColor={theme.vars.palette.categorical.series1}
          offFrontColor={theme.vars.palette.text.secondary}
        />
      )}
    </ChartFrame>
  );
}

interface PlotProps {
  readonly points: readonly ScatterPoint[];
  readonly xLabel: string;
  readonly xUnit: string | null;
  readonly yLabel: string;
  readonly yUnit: string | null;
  readonly selectedId: string | null;
  readonly onSelect?: (id: string | null) => void;
  readonly width: number;
  readonly height: number;
  readonly frontColor: string;
  readonly offFrontColor: string;
}

function Plot({
  points,
  xLabel,
  xUnit,
  yLabel,
  yUnit,
  selectedId,
  onSelect,
  width,
  height,
  frontColor,
  offFrontColor,
}: PlotProps) {
  const { front, offFront } = useMemo(() => partition(points), [points]);

  const context = useMemo<MarkerContextValue>(
    () => ({
      bySeries: { [FRONT]: front, [OFF_FRONT]: offFront },
      selectedId,
      onSelect,
      xUnit,
      yUnit,
    }),
    [front, offFront, selectedId, onSelect, xUnit, yUnit],
  );

  const axisLabel = (label: string, unit: string | null) =>
    unit === null ? label : `${label} (${unit})`;

  return (
    <MarkerContext.Provider value={context}>
      {/* No `title` / `desc`: MUI X hangs both off a `role="none"` element, which axe rejects.
          `ChartFrame`'s figcaption is the accessible surface for every chart in this package. */}
      <MuiScatterChart
        width={width}
        height={height}
        xAxis={[{ id: X_AXIS, label: axisLabel(xLabel, xUnit) }]}
        yAxis={[{ id: Y_AXIS, label: axisLabel(yLabel, yUnit) }]}
        series={[
          {
            id: FRONT,
            label: "On the Pareto front",
            color: frontColor,
            data: front.map((point) => ({ id: point.id, x: point.x.value, y: point.y.value })),
          },
          {
            id: OFF_FRONT,
            label: "Not on the Pareto front",
            color: offFrontColor,
            data: offFront.map((point) => ({ id: point.id, x: point.x.value, y: point.y.value })),
          },
        ]}
        slots={{ marker: ParetoMarker }}
      >
        <ScatterUncertainty points={points} />
      </MuiScatterChart>
      {onSelect === undefined ? null : (
        <ItemSelector
          listLabel="Select a point"
          items={points.map((point) => ({
            id: point.id,
            label: point.label,
            description: describePoint(point, xUnit, yUnit),
          }))}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </MarkerContext.Provider>
  );
}
