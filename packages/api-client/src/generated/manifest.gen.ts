// GENERATED — DO NOT EDIT. The operation table.
//
// Written by `scripts/codegen-api-client.mjs` from `packages/api-client/openapi/openapi.json`.
// Regenerate with `pnpm codegen:api`; a hand edit is caught by `pnpm check:api-drift`.

/** Every operation the API serves, by its generated method name. */
export type OperationName =
  | "benchAuditTrail"
  | "benchAuthorScenario"
  | "benchGetJob"
  | "benchGetProvenance"
  | "benchGetReplay"
  | "benchGetReplayManifest"
  | "benchGetSubmission"
  | "benchHealthz"
  | "benchLeaderboard"
  | "benchLeaderboardScorecards"
  | "benchListScenarios"
  | "benchPrometheusMetrics"
  | "benchRetractSubmission"
  | "benchSubmit"
  | "benchSubmitHub"
  | "cloudBackends"
  | "cloudCompileJob"
  | "cloudCompileSweep"
  | "cloudCompileWorkflow"
  | "cloudExpandSweep"
  | "cloudHealthz"
  | "cloudSubmitJob"
  | "healthz"
  | "hubDownload"
  | "hubGetArtifact"
  | "hubHealth"
  | "hubHealthz"
  | "hubPublish"
  | "hubResolve"
  | "hubSearch"
  | "studioCaptureIntent"
  | "studioComparison"
  | "studioHealthz"
  | "studioListCatalog"
  | "studioListWorlds"
  | "studioPreviewAsset"
  | "studioPublishCampaign"
  | "studioPullCampaign"
  | "studioResolveWorld"
  | "studioRunStudy";

/** How one operation is addressed and how its success body is read. */
export interface OperationSpec {
  /** The document's operation id — the name on the wire, and the one api#3 stabilised. */
  readonly operationId: string;
  /** The generated method name: the operation id in camelCase. */
  readonly name: OperationName;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** The path template, with `{name}` placeholders. */
  readonly path: string;
  /** The success status this operation answers with. */
  readonly status: number;
  /** Which `Response` reader produces the success body. */
  readonly decode: "json" | "text" | "blob";
}

/**
 * The whole surface, as data.
 *
 * A table rather than 40 hand-maintained constants: the mock factories bind to it, and the
 * generated-surface test asserts it covers the document exactly — no operation missing, none
 * invented.
 */
export const OPERATIONS: Record<OperationName, OperationSpec> = {
  benchAuditTrail: {
    operationId: "bench_audit_trail",
    name: "benchAuditTrail",
    method: "GET",
    path: "/bench/audit",
    status: 200,
    decode: "json",
  },
  benchAuthorScenario: {
    operationId: "bench_author_scenario",
    name: "benchAuthorScenario",
    method: "POST",
    path: "/bench/scenarios",
    status: 201,
    decode: "json",
  },
  benchGetJob: {
    operationId: "bench_get_job",
    name: "benchGetJob",
    method: "GET",
    path: "/bench/jobs/{job_id}",
    status: 200,
    decode: "json",
  },
  benchGetProvenance: {
    operationId: "bench_get_provenance",
    name: "benchGetProvenance",
    method: "GET",
    path: "/bench/submissions/{submission_id}/provenance",
    status: 200,
    decode: "json",
  },
  benchGetReplay: {
    operationId: "bench_get_replay",
    name: "benchGetReplay",
    method: "GET",
    path: "/bench/submissions/{submission_id}/replay",
    status: 200,
    decode: "blob",
  },
  benchGetReplayManifest: {
    operationId: "bench_get_replay_manifest",
    name: "benchGetReplayManifest",
    method: "GET",
    path: "/bench/submissions/{submission_id}/replay/manifest",
    status: 200,
    decode: "json",
  },
  benchGetSubmission: {
    operationId: "bench_get_submission",
    name: "benchGetSubmission",
    method: "GET",
    path: "/bench/submissions/{submission_id}",
    status: 200,
    decode: "json",
  },
  benchHealthz: {
    operationId: "bench_healthz",
    name: "benchHealthz",
    method: "GET",
    path: "/bench/healthz",
    status: 200,
    decode: "json",
  },
  benchLeaderboard: {
    operationId: "bench_leaderboard",
    name: "benchLeaderboard",
    method: "GET",
    path: "/bench/leaderboard/{scenario_id}",
    status: 200,
    decode: "json",
  },
  benchLeaderboardScorecards: {
    operationId: "bench_leaderboard_scorecards",
    name: "benchLeaderboardScorecards",
    method: "GET",
    path: "/bench/leaderboard/{scenario_id}/scorecards",
    status: 200,
    decode: "json",
  },
  benchListScenarios: {
    operationId: "bench_list_scenarios",
    name: "benchListScenarios",
    method: "GET",
    path: "/bench/scenarios",
    status: 200,
    decode: "json",
  },
  benchPrometheusMetrics: {
    operationId: "bench_prometheus_metrics",
    name: "benchPrometheusMetrics",
    method: "GET",
    path: "/bench/metrics",
    status: 200,
    decode: "text",
  },
  benchRetractSubmission: {
    operationId: "bench_retract_submission",
    name: "benchRetractSubmission",
    method: "DELETE",
    path: "/bench/submissions/{submission_id}",
    status: 200,
    decode: "json",
  },
  benchSubmit: {
    operationId: "bench_submit",
    name: "benchSubmit",
    method: "POST",
    path: "/bench/submissions",
    status: 200,
    decode: "json",
  },
  benchSubmitHub: {
    operationId: "bench_submit_hub",
    name: "benchSubmitHub",
    method: "POST",
    path: "/bench/submissions/hub",
    status: 200,
    decode: "json",
  },
  cloudBackends: {
    operationId: "cloud_backends",
    name: "cloudBackends",
    method: "GET",
    path: "/cloud/backends",
    status: 200,
    decode: "json",
  },
  cloudCompileJob: {
    operationId: "cloud_compile_job",
    name: "cloudCompileJob",
    method: "POST",
    path: "/cloud/jobs/compile",
    status: 200,
    decode: "json",
  },
  cloudCompileSweep: {
    operationId: "cloud_compile_sweep",
    name: "cloudCompileSweep",
    method: "POST",
    path: "/cloud/sweeps/compile",
    status: 200,
    decode: "json",
  },
  cloudCompileWorkflow: {
    operationId: "cloud_compile_workflow",
    name: "cloudCompileWorkflow",
    method: "POST",
    path: "/cloud/workflows/compile",
    status: 200,
    decode: "json",
  },
  cloudExpandSweep: {
    operationId: "cloud_expand_sweep",
    name: "cloudExpandSweep",
    method: "POST",
    path: "/cloud/sweeps/expand",
    status: 200,
    decode: "json",
  },
  cloudHealthz: {
    operationId: "cloud_healthz",
    name: "cloudHealthz",
    method: "GET",
    path: "/cloud/healthz",
    status: 200,
    decode: "json",
  },
  cloudSubmitJob: {
    operationId: "cloud_submit_job",
    name: "cloudSubmitJob",
    method: "POST",
    path: "/cloud/jobs",
    status: 200,
    decode: "json",
  },
  healthz: {
    operationId: "healthz",
    name: "healthz",
    method: "GET",
    path: "/healthz",
    status: 200,
    decode: "json",
  },
  hubDownload: {
    operationId: "hub_download",
    name: "hubDownload",
    method: "POST",
    path: "/hub/artifacts/{name}/{version}/download",
    status: 200,
    decode: "json",
  },
  hubGetArtifact: {
    operationId: "hub_get_artifact",
    name: "hubGetArtifact",
    method: "GET",
    path: "/hub/artifacts/{name}/{version}",
    status: 200,
    decode: "json",
  },
  hubHealth: {
    operationId: "hub_health",
    name: "hubHealth",
    method: "GET",
    path: "/hub/health",
    status: 200,
    decode: "json",
  },
  hubHealthz: {
    operationId: "hub_healthz",
    name: "hubHealthz",
    method: "GET",
    path: "/hub/healthz",
    status: 200,
    decode: "json",
  },
  hubPublish: {
    operationId: "hub_publish",
    name: "hubPublish",
    method: "POST",
    path: "/hub/publish",
    status: 200,
    decode: "json",
  },
  hubResolve: {
    operationId: "hub_resolve",
    name: "hubResolve",
    method: "POST",
    path: "/hub/resolve",
    status: 200,
    decode: "json",
  },
  hubSearch: {
    operationId: "hub_search",
    name: "hubSearch",
    method: "GET",
    path: "/hub/search",
    status: 200,
    decode: "json",
  },
  studioCaptureIntent: {
    operationId: "studio_capture_intent",
    name: "studioCaptureIntent",
    method: "POST",
    path: "/studio/intent",
    status: 200,
    decode: "json",
  },
  studioComparison: {
    operationId: "studio_comparison",
    name: "studioComparison",
    method: "POST",
    path: "/studio/studies/comparison",
    status: 200,
    decode: "json",
  },
  studioHealthz: {
    operationId: "studio_healthz",
    name: "studioHealthz",
    method: "GET",
    path: "/studio/healthz",
    status: 200,
    decode: "json",
  },
  studioListCatalog: {
    operationId: "studio_list_catalog",
    name: "studioListCatalog",
    method: "GET",
    path: "/studio/catalog/assets",
    status: 200,
    decode: "json",
  },
  studioListWorlds: {
    operationId: "studio_list_worlds",
    name: "studioListWorlds",
    method: "GET",
    path: "/studio/catalog/worlds",
    status: 200,
    decode: "json",
  },
  studioPreviewAsset: {
    operationId: "studio_preview_asset",
    name: "studioPreviewAsset",
    method: "GET",
    path: "/studio/catalog/preview/{reference}",
    status: 200,
    decode: "json",
  },
  studioPublishCampaign: {
    operationId: "studio_publish_campaign",
    name: "studioPublishCampaign",
    method: "POST",
    path: "/studio/campaigns/publish",
    status: 200,
    decode: "json",
  },
  studioPullCampaign: {
    operationId: "studio_pull_campaign",
    name: "studioPullCampaign",
    method: "GET",
    path: "/studio/campaigns/{reference}",
    status: 200,
    decode: "json",
  },
  studioResolveWorld: {
    operationId: "studio_resolve_world",
    name: "studioResolveWorld",
    method: "GET",
    path: "/studio/worlds/{reference}",
    status: 200,
    decode: "json",
  },
  studioRunStudy: {
    operationId: "studio_run_study",
    name: "studioRunStudy",
    method: "POST",
    path: "/studio/studies",
    status: 200,
    decode: "json",
  },
};
