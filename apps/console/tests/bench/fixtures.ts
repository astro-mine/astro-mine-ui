// Benchmark fixtures (ui#12, ui#13, ui#14).
//
// Typed against the generated schema, so a fixture that stops matching the API fails to compile.
//
// **The three metric cases have names here**, because they are what most of the leaderboard's
// acceptance criteria are about: a measured bound, a null bound (fewer than two applicable seeds),
// and no value at all (the metric did not apply).

import type {
  MetricScore,
  ProvenanceBundle,
  Submission,
  ViewLeaderboard,
  ViewLeaderboardRow,
  ViewReplay,
} from "@/components/bench/types";

/** A metric with a measured cross-seed spread — the ordinary case. */
export const measured = (over: Partial<MetricScore> = {}): MetricScore => ({
  metric: "ice_yield",
  unit: "kg",
  direction: "higher_better",
  aggregation: "median",
  value: 128.4,
  dispersion: 6.2,
  n: 9,
  ...over,
});

/** A metric whose bound could not be measured: fewer than two applicable seeds. */
export const unbounded = (over: Partial<MetricScore> = {}): MetricScore =>
  measured({ metric: "traverse_time", unit: "s", dispersion: null, n: 1, ...over });

/** A metric that did not apply to this entry at all. */
export const absent = (over: Partial<MetricScore> = {}): MetricScore =>
  measured({ metric: "comms_outage", unit: "s", value: null, dispersion: null, n: 0, ...over });

export const row = (over: Partial<ViewLeaderboardRow> = {}): ViewLeaderboardRow => ({
  rank: 1,
  submission_id: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  runner: "sim/1.4.0",
  integrity: "verified",
  author: "astro-mine",
  method: "ppo",
  source: "hub",
  provenance_hash: "sha256:aaaa",
  trace_hash: null,
  scores: [measured()],
  ...over,
});

/** A row the reference fixture produced — a stand-in that never ran the simulator. */
export const fixtureRow = (over: Partial<ViewLeaderboardRow> = {}): ViewLeaderboardRow =>
  row({
    rank: 2,
    submission_id: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    runner: "fixture/0.1.0",
    method: "fixture-run",
    ...over,
  });

export const board = (over: Partial<ViewLeaderboard> = {}): ViewLeaderboard => ({
  scenario_id: "lunar-polar-ice-v1",
  primary_metric: "ice_yield",
  rows: [row(), fixtureRow()],
  ...over,
});

export const submission = (over: Partial<Submission> = {}): Submission => ({
  submission_id: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  scenario_id: "lunar-polar-ice-v1",
  policy_ref: "commons/excavation-ppo:1.2.0",
  scorecard_hash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  runner: "sim/1.4.0",
  integrity: "verified",
  author: "astro-mine",
  method: "ppo",
  source: "hub",
  provenance_hash: "sha256:aaaa",
  trace_hash: null,
  scores: [measured(), unbounded(), absent()],
  ...over,
});

/**
 * The lineage a leaderboard entry is byte-for-byte reproducible from.
 *
 * Note the shapes, which are easy to guess wrong and which the generated types caught:
 * `core_interface_version` is a **map** of interface → version (not one string), `environment` is
 * an `EnvironmentStamp` object, and `per_seed` is a list of `{seed, metrics}` records rather than a
 * metric-keyed dictionary of columns. The last one matters for the page: the per-seed values behind
 * an aggregate are rows, one per seed, which is how ui#13 renders them.
 */
export const provenance = (over: Partial<ProvenanceBundle> = {}): ProvenanceBundle => ({
  scenario_id: "lunar-polar-ice-v1",
  scenario_spec_hash: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  core_schema_digest: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
  core_interface_version: { env: "0.3.0", policy: "0.3.0" },
  code_version: "0.5.0",
  environment: { python: "3.12.8", platform: "linux-x86_64" },
  environment_lockfile: "sha256:6666666666666666666666666666666666666666666666666666666666666666",
  seeds: [11, 12, 13],
  per_seed: [
    { seed: 11, metrics: { ice_yield: 127.1 } },
    { seed: 12, metrics: { ice_yield: 129.8 } },
    { seed: 13, metrics: { ice_yield: 128.4 } },
  ],
  content_hashes: {
    world: "sha256:7777777777777777777777777777777777777777777777777777777777777777",
    fleet: "sha256:8888888888888888888888888888888888888888888888888888888888888888",
  },
  scorecard_hash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  source: "hub",
  source_digest: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
  ...over,
});

export const replay = (over: Partial<ViewReplay> = {}): ViewReplay => ({
  submission_id: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  scenario_id: "lunar-polar-ice-v1",
  mcap_digest: "sha256:abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
  content_hash: "sha256:abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
  agents: ["excavator-1", "hauler-1"],
  frame_count: 3600,
  observation_count: 7200,
  seed: 11,
  sim_time_start_s: 0,
  sim_time_end_s: 3600,
  size_bytes: 4_200_000,
  ...over,
});
