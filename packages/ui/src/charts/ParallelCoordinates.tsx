"use client";

// Parallel coordinates (ui#4; ui.md §7.1). Studio's every-metric-at-once view.
//
// **Hand-built, as it was before.** MUI X Charts does not provide parallel coordinates, and this is
// the one chart in the package with no MUI X plot underneath it — only the theme. That is a stated
// consequence of D7 rather than a gap: Plotly had `parcoords` as a trace type, and giving it up was
// part of the price of one component family.
//
// **This chart takes no uncertainty bound, and that is deliberate.** A polyline crossing six axes
// has nowhere to put six intervals that a reader could still follow, and drawing some of them would
// be worse than drawing none — it would imply the unmarked axes were measured. The honesty this
// chart owes is a different one: a candidate missing any metric is **excluded and counted**, never
// imputed, because threading a line through an invented value draws a design nobody evaluated.
// `ScatterChart` is where a metric's uncertainty is read.

import Box from "@mui/material/Box";
import type { ReactNode } from "react";

import type { Async } from "../components/AsyncState.js";
import { ChartFrame } from "./ChartFrame.js";
import { ItemSelector } from "./ItemSelector.js";
import type { ParallelAxis, ParallelRow } from "./model.js";

const MARGIN = { top: 44, right: 24, bottom: 28, left: 24 } as const;

export interface ParallelCoordinatesProps {
  readonly state: Async<readonly ParallelRow[]>;
  /** The chart's accessible name — authored, not derived. */
  readonly title: string;
  /**
   * The axes, in order, left to right. Each is **independently scaled and carries its own unit**;
   * no two share a scale, which is what makes this not a chart with six y-axes (ui.md §7.1).
   */
  readonly axes: readonly ParallelAxis[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string | null) => void;
  readonly width?: number;
  readonly height?: number;
  readonly empty?: ReactNode;
  readonly loadingLabel?: string;
  readonly errorRemedy?: ReactNode;
}

/** A row is drawable only if it has a value on every axis. */
export function drawableRows(
  rows: readonly ParallelRow[],
  axes: readonly ParallelAxis[],
): readonly ParallelRow[] {
  return rows.filter((row) => axes.every((axis) => typeof row.values[axis.key] === "number"));
}

/** One axis's value range, over the rows that will actually be drawn. */
export function axisExtent(
  rows: readonly ParallelRow[],
  axis: ParallelAxis,
): { min: number; max: number } {
  // Only the scores that exist. `drawableRows` has already dropped the rows that lack one, but
  // this narrows rather than asserting: an extent computed from a `NaN` is a silently ruined axis.
  const values = rows
    .map((row) => row.values[axis.key])
    .filter((value): value is number => typeof value === "number");
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Every candidate scoring the same on one metric is a real and interesting outcome. Collapsing
  // the axis to a single pixel row would hide it; widening it by one unit keeps the line visible and
  // keeps the axis readable as "they are all the same here".
  return min === max ? { min: min - 0.5, max: max + 0.5 } : { min, max };
}

/** The caption a chart shows when rows were left out. Silence about an exclusion is a lie by omission. */
export function exclusionCaption(drawn: number, total: number): string | null {
  const excluded = total - drawn;
  if (excluded === 0) return null;
  // The noun agrees with `total` and the verb with `excluded` — "1 of 5 candidates is not drawn".
  const noun = total === 1 ? "candidate" : "candidates";
  const verb = excluded === 1 ? "is" : "are";
  return (
    `${excluded} of ${total} ${noun} ${verb} not drawn: ` +
    "a candidate with no score on one of these metrics has no place on its axis, and a line " +
    "threaded through an imputed value would show a design that was never evaluated."
  );
}

/** What the chart says to a reader who cannot see it. */
export function describeParallel(
  title: string,
  rows: readonly ParallelRow[],
  axes: readonly ParallelAxis[],
): string {
  const axisNames = axes
    .map((axis) => (axis.unit === null ? axis.label : `${axis.label} in ${axis.unit}`))
    .join(", ");
  const lines = rows.map((row) => {
    const values = axes.map((axis) => `${axis.label} ${row.values[axis.key]}`).join(", ");
    return `${row.label}${row.onFront ? ", on the Pareto front" : ""}: ${values}.`;
  });
  return (
    `${title}. Parallel coordinates over ${axes.length} axes: ${axisNames}. ` +
    `${rows.length} candidate${rows.length === 1 ? "" : "s"} drawn. ${lines.join(" ")}`
  );
}

export function ParallelCoordinates({
  state,
  title,
  axes,
  selectedId = null,
  onSelect,
  width = 640,
  height = 320,
  empty,
  loadingLabel,
  errorRemedy,
}: ParallelCoordinatesProps) {
  const drawn = state.status === "ready" ? drawableRows(state.data, axes) : [];

  return (
    <ChartFrame
      state={state}
      title={title}
      empty={empty}
      loadingLabel={loadingLabel}
      errorRemedy={errorRemedy}
      description={(rows) => describeParallel(title, drawableRows(rows, axes), axes)}
      caption={
        state.status === "ready" ? exclusionCaption(drawn.length, state.data.length) : undefined
      }
    >
      {(rows) => {
        const drawable = drawableRows(rows, axes);
        const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
        const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
        const extents = axes.map((axis) => axisExtent(drawable, axis));

        const xOf = (index: number) =>
          axes.length === 1
            ? MARGIN.left + innerWidth / 2
            : MARGIN.left + (index * innerWidth) / (axes.length - 1);
        const yOf = (index: number, value: number) => {
          const { min, max } = extents[index];
          return MARGIN.top + innerHeight - ((value - min) / (max - min)) * innerHeight;
        };

        return (
          <>
            {/* `aria-hidden`, like MUI X's own surface: the chart's words are in `ChartFrame`'s
              figcaption, and duplicating them here would read the whole plot twice. Selection is
              `ItemSelector`'s job for exactly that reason. */}
            <Box
              component="svg"
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              aria-hidden="true"
              sx={{ maxWidth: "100%", height: "auto", color: "text.secondary" }}
            >
              {axes.map((axis, index) => (
                <g key={axis.key}>
                  <line
                    x1={xOf(index)}
                    y1={MARGIN.top}
                    x2={xOf(index)}
                    y2={MARGIN.top + innerHeight}
                    stroke="currentColor"
                    strokeWidth={1}
                  />
                  <Box
                    component="text"
                    x={xOf(index)}
                    y={MARGIN.top - 24}
                    textAnchor="middle"
                    sx={{ fill: "text.primary", fontSize: 12, fontWeight: 600 }}
                  >
                    {axis.label}
                  </Box>
                  <Box
                    component="text"
                    x={xOf(index)}
                    y={MARGIN.top - 10}
                    textAnchor="middle"
                    sx={{ fill: "text.secondary", fontSize: 10 }}
                  >
                    {/* The unit is always written, and a dimensionless axis says so rather than
                      leaving a reader to assume one (conventions.md §5). */}
                    {axis.unit ?? "dimensionless"}
                  </Box>
                  <Box
                    component="text"
                    x={xOf(index)}
                    y={MARGIN.top + innerHeight + 16}
                    textAnchor="middle"
                    sx={{
                      fill: "text.secondary",
                      fontSize: 10,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {extents[index].min}
                  </Box>
                </g>
              ))}

              {drawable.map((row) => {
                // Safe by construction: `drawableRows` kept only the rows with a score on every axis.
                const points = axes
                  .map(
                    (axis, index) => `${xOf(index)},${yOf(index, row.values[axis.key] as number)}`,
                  )
                  .join(" ");
                const selected = selectedId === row.id;
                const interactive = onSelect !== undefined;

                return (
                  <Box
                    component="g"
                    key={row.id}
                    data-pareto-front={row.onFront ? "on" : "off"}
                    data-row-id={row.id}
                    data-selected={selected ? "true" : undefined}
                    onClick={interactive ? () => onSelect?.(selected ? null : row.id) : undefined}
                    sx={{
                      // Front membership is a colour AND a dash pattern AND a stroke width, so it
                      // survives being read by someone who cannot separate the two hues.
                      color: row.onFront ? "categorical.series1" : "text.secondary",
                      cursor: interactive ? "pointer" : undefined,
                    }}
                  >
                    <polyline
                      points={points}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={selected ? 3 : row.onFront ? 2 : 1}
                      strokeDasharray={row.onFront ? undefined : "4 3"}
                      opacity={row.onFront ? 1 : 0.75}
                    />
                  </Box>
                );
              })}
            </Box>
            {onSelect === undefined ? null : (
              <ItemSelector
                listLabel="Select a candidate"
                items={drawable.map((row) => ({
                  id: row.id,
                  label: row.label,
                  description: `${row.label}, ${row.onFront ? "on" : "not on"} the Pareto front`,
                }))}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
          </>
        );
      }}
    </ChartFrame>
  );
}
