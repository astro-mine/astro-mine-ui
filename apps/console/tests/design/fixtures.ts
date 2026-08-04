// Design fixtures (ui#15–ui#18).
//
// Typed against the generated schema, so a fixture that stops matching the API fails to compile.

import type {
  Campaign,
  CapturedObjective,
  ComparisonCandidate,
  ComparisonView,
  IntentDraft,
  MenuEntry,
  StudyResponse,
  TradeStudy,
  WorldEntry,
  WorldResponse,
} from "@/components/design/types";

export const asset = (over: Partial<MenuEntry> = {}): MenuEntry => ({
  reference: "commons/excavator:1.0.0",
  digest: "sha256:aaaa000000000000000000000000000000000000000000000000000000000000",
  name: "excavator",
  version: "1.0.0",
  kind: "asset",
  namespace: "commons",
  capability_tags: ["excavation"],
  ...over,
});

/** A draft that satisfies every constraint the document states — the baseline to break. */
export const intentDraft = (over: Partial<IntentDraft> = {}): IntentDraft => ({
  id: "draft-1",
  name: "Polar ice campaign",
  author: "designer",
  description: null,
  region: {
    name: "Shackleton rim",
    crs: { body: "MOON", body_fixed_frame: "MOON_ME", reference_radius_m: 1_737_400 },
  },
  products: [
    {
      criterion_id: "product-1",
      metric: "ice_yield",
      unit: "kg",
      target: 1000,
      tolerance: 50,
      direction: "higher_better",
    },
  ],
  constraints: [],
  inventory: [],
  labels: {},
  ...over,
});

export const captured = (over: Partial<CapturedObjective> = {}): CapturedObjective => ({
  digest: "sha256:objective",
  document: {
    objective_version: "0.1",
    objective: {
      id: "objective-1",
      name: "Polar ice campaign",
      success_criteria: [
        {
          id: "product-1",
          binding: {
            metric: "ice_yield",
            unit: "kg",
            direction: "higher_better",
            target: 1000,
            tolerance: 50,
            aggregation: "mean",
          },
          required: true,
        },
      ],
      labels: {},
    },
  },
  provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
  ...over,
});

export const candidateScore = (over: Partial<ComparisonCandidate> = {}): ComparisonCandidate => ({
  candidate_id: "Two excavators",
  seed: 11,
  aggregate: 0.82,
  passed: true,
  on_pareto_front: true,
  metrics: { ice_yield: { value: 1100, uncertainty: 40 } },
  ...over,
});

export const comparison = (over: Partial<ComparisonView> = {}): ComparisonView => ({
  study_id: "study-1",
  objective_hash: "sha256:objective",
  backend: "local",
  evaluator: "sim/1.4.0",
  metrics: ["ice_yield", "traverse_time"],
  candidates: [
    candidateScore(),
    candidateScore({
      candidate_id: "One hauler",
      aggregate: 0.4,
      on_pareto_front: false,
      metrics: {
        ice_yield: { value: 600, uncertainty: null },
        traverse_time: { value: 900, uncertainty: 30 },
      },
    }),
  ],
  pareto_front: ["Two excavators"],
  ...over,
});

export const tradeStudy = (over: Partial<TradeStudy> = {}): TradeStudy => ({
  id: "study-1",
  objective_hash: "sha256:objective",
  backend: "local",
  evaluator: "sim/1.4.0",
  seeds: [11],
  evaluated: [],
  pareto_front: ["Two excavators"],
  provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
  ...over,
});

export const studyResponse = (over: Partial<StudyResponse> = {}): StudyResponse => ({
  jobs: [],
  study: tradeStudy(),
  ...over,
});

export const world = (over: Partial<WorldEntry> = {}): WorldEntry => ({
  reference: "commons/shackleton-rim:0.5.0",
  digest: "sha256:world",
  name: "shackleton-rim",
  version: "0.5.0",
  namespace: "commons",
  body: "MOON",
  ...over,
});

export const resolvedWorld = (over: Partial<WorldResponse> = {}): WorldResponse => ({
  reference: "commons/shackleton-rim:0.5.0",
  digest: "sha256:world",
  world_id: "shackleton-rim",
  manifest_url: "https://api.test/worlds/shackleton-rim/world.json",
  site: {
    body: "MOON",
    frame: "MOON_ME",
    reference_radius_m: 1_737_400,
    latitude_deg: -89.9,
    longitude_deg: 0,
    height_m: 0,
  },
  ...over,
});

export const campaign = (over: Partial<Campaign> = {}): Campaign => ({
  id: "campaign-1",
  name: "polar-ice",
  objective_hash: "sha256:objective",
  chosen: {
    candidate: {
      id: "Two excavators",
      swarm: [{ sadf_ref: "commons/excavator:1.0.0", count: 2 }],
      decision_vector: {},
      infrastructure: [],
      policy_refs: {},
    },
    score: {
      aggregate: 0.82,
      metric_scores: { ice_yield: 1100 },
      metric_uncertainty: { ice_yield: 40 },
      objective_hash: "sha256:objective",
      passed: true,
    },
    seed: 11,
    world_ref: "commons/shackleton-rim:0.5.0",
    provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
  },
  phases: [],
  contingencies: [],
  evaluator: "sim/1.4.0",
  trade_study_ref: "study-1",
  world_ref: "commons/shackleton-rim:0.5.0",
  provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
  ...over,
});
