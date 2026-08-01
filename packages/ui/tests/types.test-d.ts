// A SECOND Y-AXIS IS NOT EXPRESSIBLE (ui#4; ui.md §7.1, conventions.md §2.1).
//
// **This file is an assertion, and `tsc` is what runs it.** Every `@ts-expect-error` below fails the
// build if the line beneath it *stops* being an error — so a change that opened a second axis, or
// that let a chart be given a raw MUI X series, or that made the unit optional, turns this file red.
// It is checked by `tsc -p tsconfig.test.json`, which `pnpm typecheck` and CI already run; there is
// nothing extra to remember to invoke.
//
// It is not a `.test.ts`, and that is deliberate: Vitest's `include` matches `tests/**/*.test.ts`,
// and nothing here executes. The property is about what the compiler will accept, and the compiler
// is the only thing that can check it.
//
// **Why this is a test at all.** The previous chart library made it a property — a second y-axis was
// unrepresentable by construction, because there was no API that could carry one. MUI X Charts takes
// `yAxis` as an array, and it will happily draw two. What stops the application growing a chart with
// a right-hand axis is now this file and the shape of the props above it, so the shape must be
// narrow: the charts take labels and units, never axis objects.

import type { BarChartProps, ParallelCoordinatesProps, ScatterChartProps } from "../src/index.js";

// --- the bar chart ----------------------------------------------------------

const bar: BarChartProps = {
  state: { status: "ready", data: [{ label: "a", value: 1, bound: 0.1 }] },
  title: "Water-ice yield",
  unit: "kg/sol",
  series: "series2",
};
void bar;

// @ts-expect-error a chart may not be given an axis. Two measures of different scale are two charts.
const barWithSecondAxis: BarChartProps = { ...bar, yAxis: [{ id: "left" }, { id: "right" }] };
void barWithSecondAxis;

// @ts-expect-error not even one axis object — the chart owns its axes, and the caller owns the unit.
const barWithAxis: BarChartProps = { ...bar, yAxis: [{ min: 0, max: 10 }] };
void barWithAxis;

// @ts-expect-error a right-hand axis by any other name is the same chart.
const barWithRightAxis: BarChartProps = { ...bar, rightAxis: "secondary" };
void barWithRightAxis;

// @ts-expect-error `series` names an entry of the theme's palette, not a MUI X series to draw.
const barWithRawSeries: BarChartProps = { ...bar, series: [{ data: [1, 2, 3] }] };
void barWithRawSeries;

// @ts-expect-error `series` is closed over the palette: there is no sixth colour to ask for.
const barWithUnknownSeries: BarChartProps = { ...bar, series: "series6" };
void barWithUnknownSeries;

// @ts-expect-error the unit is required — `null` must be written out for a dimensionless quantity,
// so a forgotten argument cannot pass for a deliberate one (conventions.md §5).
const barWithoutUnit: BarChartProps = { state: bar.state, title: "Yield" };
void barWithoutUnit;

const dimensionlessBar: BarChartProps = { state: bar.state, title: "Coverage", unit: null };
void dimensionlessBar;

// @ts-expect-error a chart takes a request state, never a bare array — that is what routes empty,
// loading and error through the one `AsyncState` discipline.
const barFromArray: BarChartProps = { state: [], title: "Yield", unit: "kg" };
void barFromArray;

// --- the scatter ------------------------------------------------------------

const scatter: ScatterChartProps = {
  state: { status: "ready", data: [] },
  title: "Yield against mass",
  xLabel: "Fleet mass",
  xUnit: "kg",
  yLabel: "Coverage",
  yUnit: null,
};
void scatter;

// @ts-expect-error one y axis, named by a label and a unit. There is no second to configure.
const scatterWithSecondAxis: ScatterChartProps = { ...scatter, yAxis: [{}, {}] };
void scatterWithSecondAxis;

// @ts-expect-error and no second unit either, which is the same chart with the axis left implicit.
const scatterWithSecondUnit: ScatterChartProps = { ...scatter, y2Unit: "kW" };
void scatterWithSecondUnit;

// @ts-expect-error both units are required; a dimensionless axis says `null`.
const scatterWithoutYUnit: ScatterChartProps = {
  state: scatter.state,
  title: "T",
  xLabel: "x",
  xUnit: "kg",
  yLabel: "y",
};
void scatterWithoutYUnit;

// --- parallel coordinates ---------------------------------------------------

const parallel: ParallelCoordinatesProps = {
  state: { status: "ready", data: [] },
  title: "Comparison",
  axes: [
    { key: "yield", label: "Yield", unit: "kg/sol" },
    { key: "coverage", label: "Coverage", unit: null },
  ],
};
void parallel;

// Its axes are a data description, not a plotting configuration: many independent scales are the
// whole point, and none of them is a second y-axis to configure.
// @ts-expect-error a chart may not be given an axis object
const parallelWithAxisObject: ParallelCoordinatesProps = { ...parallel, yAxis: [{ min: 0 }] };
void parallelWithAxisObject;

// Every axis carries its own unit, and `null` must be written out. The directive sits against the
// offending member rather than the declaration, because `@ts-expect-error` suppresses the *next
// line* and a multi-line literal reports its error where the member is.
const parallelWithoutUnit: ParallelCoordinatesProps = {
  state: parallel.state,
  title: "Comparison",
  // @ts-expect-error every axis must state its unit, `null` included
  axes: [{ key: "yield", label: "Yield" }],
};
void parallelWithoutUnit;
