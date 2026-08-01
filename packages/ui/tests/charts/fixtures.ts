// The committed fixtures, typed once (ui#4).
//
// "Both the leaderboard bar chart and the Pareto scatter render from committed fixtures in tests,
// in both modes" is an acceptance criterion, so the data lives in JSON beside these tests rather
// than inline in them: a fixture written into a test is a fixture only that test can be wrong
// about, and the same rows are asserted from three different angles here.
//
// Each fixture deliberately contains **every uncertainty case at once** — a measured bound, a
// measured bound of exactly zero, an explicit `null`, and an absent key — because those four are
// two different answers ("measured" and "not measured") and the whole layer exists to keep them
// apart.

import comparison from "../fixtures/comparison.json" with { type: "json" };
import leaderboard from "../fixtures/leaderboard.json" with { type: "json" };
import pareto from "../fixtures/pareto.json" with { type: "json" };

import type { BarDatum, ParallelAxis, ParallelRow, ScatterPoint } from "../../src/charts/model.js";

/** Five scenarios scored on one metric: two bounded, one bound of zero, two unbounded. */
export const LEADERBOARD: readonly BarDatum[] = leaderboard;

/** Five candidates on two metrics, with uncertainty missing from either axis independently. */
export const PARETO: readonly ScatterPoint[] = pareto;

export const COMPARISON_AXES: readonly ParallelAxis[] = comparison.axes;

/** The same five candidates over four metrics — the last one scoring only two of them. */
export const COMPARISON_ROWS: readonly ParallelRow[] = comparison.rows;
