// Reading a scorecard honestly (ui#12; bench.md §5; ui.md §7 honesty rules 1, 2 and 5).
//
// Four small functions, and each of them is a rule the leaderboard would otherwise get wrong.
//
// **Ported from the retired `@astro-mine/bench-ui` rather than reinvented.** That package worked
// these out against the same API and its reasoning is worth keeping — particularly the fixture
// predicate, which matches on the runner's *namespace* so that `fixture/0.2.0` stays
// fixture-labelled when the reference runner is next versioned. A predicate written as
// `runner === "fixture/0.1.0"` silently stops labelling the day that constant moves, and the
// failure mode is a stand-in result presented as a simulated one.

import type { MetricScore } from "./types";

/**
 * The runner-id namespace that marks the dependency-clean reference fixture.
 *
 * The platform's own constant is `REFERENCE_EPISODE_RUNNER_ID = "fixture/0.1.0"`
 * (`astro_mine.bench.baseline._runner`), and the API's schema documents the convention: `runner` is
 * `"fixture/0.1.0"` for the reference fixture, else a Sim runner's id.
 */
export const FIXTURE_RUNNER = "fixture";

/**
 * Did a stand-in produce this scorecard, rather than a simulation?
 *
 * **The single predicate the row's honesty badge turns on.** A fixture runner is a deterministic
 * reference that never ran Sim, and its number is not a measurement of anything — presenting it
 * with the same authority as a simulated run is exactly the laundering the leaderboard must not do
 * (ui.md §7 rule 1; gap report §8.2.6, G1.1/G1.8).
 */
export function isFixtureRunner(runner: string): boolean {
  return runner.split("/")[0] === FIXTURE_RUNNER;
}

/** `"fixture/0.1.0"` → `"Fixture"`; a Sim runner keeps its id, which is what identifies it. */
export function runnerLabel(runner: string): string {
  return isFixtureRunner(runner) ? "Fixture" : runner;
}

/**
 * How a metric's value compares, in words.
 *
 * A direction is not decoration: without it a reader cannot tell a good 0.2 from a bad one, and
 * `higher_better` / `lower_better` is a vocabulary the API owns rather than something to infer from
 * a metric's name.
 */
export function directionPhrase(direction: string): string {
  if (direction === "higher_better") return "higher is better";
  if (direction === "lower_better") return "lower is better";
  // Not an enum this build knows. Saying so is better than guessing a direction and being wrong
  // about which end of the table is good.
  return `direction “${direction}” is not one this build recognises`;
}

/**
 * How this score was aggregated, and over how many seeds — the sentence that goes before the number.
 *
 * Provenance before interpretation (honesty rule 5). "0.83 m³" means nothing until a reader knows it
 * is the median over nine held-out seeds rather than the best of two.
 */
export function aggregationPhrase(score: MetricScore): string {
  const seeds = score.n === 1 ? "1 seed" : `${score.n} seeds`;
  return `${score.aggregation} over ${seeds}`;
}

/**
 * Comparator for one metric column, with **nulls last in both directions**.
 *
 * The rule ui#12 states as an acceptance criterion, and the reason it needs stating: a `null` value
 * means the metric did not apply to this entry, and any comparator that treats it as a number sorts
 * it to one end — where it reads as *best* on one click and *worst* on the next. Neither is true.
 * Sorting it last regardless means "inapplicable" never masquerades as a ranking position.
 *
 * `descending` is about the *click*, not about the metric's direction. The reader is asking for the
 * biggest or smallest values; which of those is good is what `directionPhrase` says.
 */
export function compareByMetric(
  a: number | null | undefined,
  b: number | null | undefined,
  descending: boolean,
): number {
  const left = a ?? null;
  const right = b ?? null;
  if (left === null && right === null) return 0;
  // Positive means "a goes after b", so an absent value always sinks — whichever way the arrow
  // is pointing.
  if (left === null) return 1;
  if (right === null) return -1;
  return descending ? right - left : left - right;
}

/** The score for one metric on one row, or `undefined` when that row was not scored on it. */
export function scoreFor(scores: readonly MetricScore[], metric: string): MetricScore | undefined {
  return scores.find((score) => score.metric === metric);
}

/**
 * Every metric name any row carries, in first-seen order.
 *
 * Derived from the rows rather than assumed uniform: a leaderboard can hold entries scored under
 * different metric sets — an older submission predating a metric, say — and a column list taken
 * from the first row alone would silently drop the rest.
 */
export function metricsOf(rows: readonly { scores: readonly MetricScore[] }[]): string[] {
  const seen: string[] = [];
  for (const row of rows) {
    for (const score of row.scores) {
      if (!seen.includes(score.metric)) seen.push(score.metric);
    }
  }
  return seen;
}
