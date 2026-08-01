// GENERATED — DO NOT EDIT. The API surface: one method per operation id.
//
// Written by `scripts/codegen-api-client.mjs` from `packages/api-client/openapi/openapi.json`.
// Regenerate with `pnpm codegen:api`; a hand edit is caught by `pnpm check:api-drift`.

import type { CallOptions, RequestFn } from "../request.js";
import { OPERATIONS } from "./manifest.gen.js";
import type { operations } from "./schema.gen.js";

/** Audit Trail — `GET /bench/audit` */
export type BenchAuditTrailResult =
  operations["bench_audit_trail"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchAuditTrail`. */
export interface BenchAuditTrailArgs {
  /** Query parameters. */
  query?: operations["bench_audit_trail"]["parameters"]["query"];
  /** Header parameters declared by the document. */
  header?: operations["bench_audit_trail"]["parameters"]["header"];
}

/** Author Scenario — `POST /bench/scenarios` */
export type BenchAuthorScenarioResult =
  operations["bench_author_scenario"]["responses"][201]["content"]["application/json"];

/** Arguments for `benchAuthorScenario`. */
export interface BenchAuthorScenarioArgs {
  /** Header parameters declared by the document. */
  header?: operations["bench_author_scenario"]["parameters"]["header"];
  /** The request body. */
  body: NonNullable<
    operations["bench_author_scenario"]["requestBody"]
  >["content"]["application/json"];
}

/** Get Job — `GET /bench/jobs/{job_id}` */
export type BenchGetJobResult =
  operations["bench_get_job"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchGetJob`. */
export interface BenchGetJobArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_get_job"]["parameters"]["path"]>;
}

/** Get Provenance — `GET /bench/submissions/{submission_id}/provenance` */
export type BenchGetProvenanceResult =
  operations["bench_get_provenance"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchGetProvenance`. */
export interface BenchGetProvenanceArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_get_provenance"]["parameters"]["path"]>;
}

/** Get Replay — `GET /bench/submissions/{submission_id}/replay` */
export type BenchGetReplayResult = Blob;

/** Arguments for `benchGetReplay`. */
export interface BenchGetReplayArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_get_replay"]["parameters"]["path"]>;
}

/** Get Replay Manifest — `GET /bench/submissions/{submission_id}/replay/manifest` */
export type BenchGetReplayManifestResult =
  operations["bench_get_replay_manifest"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchGetReplayManifest`. */
export interface BenchGetReplayManifestArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_get_replay_manifest"]["parameters"]["path"]>;
}

/** Get Submission — `GET /bench/submissions/{submission_id}` */
export type BenchGetSubmissionResult =
  operations["bench_get_submission"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchGetSubmission`. */
export interface BenchGetSubmissionArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_get_submission"]["parameters"]["path"]>;
}

/** Healthz — `GET /bench/healthz` */
export type BenchHealthzResult =
  operations["bench_healthz"]["responses"][200]["content"]["application/json"];

/** Leaderboard — `GET /bench/leaderboard/{scenario_id}` */
export type BenchLeaderboardResult =
  operations["bench_leaderboard"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchLeaderboard`. */
export interface BenchLeaderboardArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_leaderboard"]["parameters"]["path"]>;
}

/** Scorecards — `GET /bench/leaderboard/{scenario_id}/scorecards` */
export type BenchLeaderboardScorecardsResult =
  operations["bench_leaderboard_scorecards"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchLeaderboardScorecards`. */
export interface BenchLeaderboardScorecardsArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_leaderboard_scorecards"]["parameters"]["path"]>;
}

/** List Scenarios — `GET /bench/scenarios` */
export type BenchListScenariosResult =
  operations["bench_list_scenarios"]["responses"][200]["content"]["application/json"];

/** Prometheus Metrics — `GET /bench/metrics` */
export type BenchPrometheusMetricsResult = string;

/** Retract Submission — `DELETE /bench/submissions/{submission_id}` */
export type BenchRetractSubmissionResult =
  operations["bench_retract_submission"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchRetractSubmission`. */
export interface BenchRetractSubmissionArgs {
  /** Path parameters. */
  path: NonNullable<operations["bench_retract_submission"]["parameters"]["path"]>;
  /** Header parameters declared by the document. */
  header?: operations["bench_retract_submission"]["parameters"]["header"];
}

/** Submit — `POST /bench/submissions` */
export type BenchSubmitResult =
  operations["bench_submit"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchSubmit`. */
export interface BenchSubmitArgs {
  /** Header parameters declared by the document. */
  header?: operations["bench_submit"]["parameters"]["header"];
  /** The request body. */
  body: NonNullable<operations["bench_submit"]["requestBody"]>["content"]["application/json"];
}

/** Submit Hub — `POST /bench/submissions/hub` */
export type BenchSubmitHubResult =
  operations["bench_submit_hub"]["responses"][200]["content"]["application/json"];

/** Arguments for `benchSubmitHub`. */
export interface BenchSubmitHubArgs {
  /** Header parameters declared by the document. */
  header?: operations["bench_submit_hub"]["parameters"]["header"];
  /** The request body. */
  body: NonNullable<operations["bench_submit_hub"]["requestBody"]>["content"]["application/json"];
}

/** Backends — `GET /cloud/backends` */
export type CloudBackendsResult =
  operations["cloud_backends"]["responses"][200]["content"]["application/json"];

/** Compile Job — `POST /cloud/jobs/compile` */
export type CloudCompileJobResult =
  operations["cloud_compile_job"]["responses"][200]["content"]["application/json"];

/** Arguments for `cloudCompileJob`. */
export interface CloudCompileJobArgs {
  /** Query parameters. */
  query?: operations["cloud_compile_job"]["parameters"]["query"];
  /** The request body. */
  body: NonNullable<operations["cloud_compile_job"]["requestBody"]>["content"]["application/json"];
}

/** Compile Sweep Endpoint — `POST /cloud/sweeps/compile` */
export type CloudCompileSweepResult =
  operations["cloud_compile_sweep"]["responses"][200]["content"]["application/json"];

/** Arguments for `cloudCompileSweep`. */
export interface CloudCompileSweepArgs {
  /** Query parameters. */
  query?: operations["cloud_compile_sweep"]["parameters"]["query"];
  /** The request body. */
  body: NonNullable<
    operations["cloud_compile_sweep"]["requestBody"]
  >["content"]["application/json"];
}

/** Compile Workflow Endpoint — `POST /cloud/workflows/compile` */
export type CloudCompileWorkflowResult =
  operations["cloud_compile_workflow"]["responses"][200]["content"]["application/json"];

/** Arguments for `cloudCompileWorkflow`. */
export interface CloudCompileWorkflowArgs {
  /** Query parameters. */
  query?: operations["cloud_compile_workflow"]["parameters"]["query"];
  /** The request body. */
  body: NonNullable<
    operations["cloud_compile_workflow"]["requestBody"]
  >["content"]["application/json"];
}

/** Expand Sweep — `POST /cloud/sweeps/expand` */
export type CloudExpandSweepResult =
  operations["cloud_expand_sweep"]["responses"][200]["content"]["application/json"];

/** Arguments for `cloudExpandSweep`. */
export interface CloudExpandSweepArgs {
  /** The request body. */
  body: NonNullable<operations["cloud_expand_sweep"]["requestBody"]>["content"]["application/json"];
}

/** Healthz — `GET /cloud/healthz` */
export type CloudHealthzResult =
  operations["cloud_healthz"]["responses"][200]["content"]["application/json"];

/** Submit Job — `POST /cloud/jobs` */
export type CloudSubmitJobResult =
  operations["cloud_submit_job"]["responses"][200]["content"]["application/json"];

/** Arguments for `cloudSubmitJob`. */
export interface CloudSubmitJobArgs {
  /** Query parameters. */
  query?: operations["cloud_submit_job"]["parameters"]["query"];
  /** The request body. */
  body: NonNullable<operations["cloud_submit_job"]["requestBody"]>["content"]["application/json"];
}

/** Healthz — `GET /healthz` */
export type HealthzResult = operations["healthz"]["responses"][200]["content"]["application/json"];

/** Download — `POST /hub/artifacts/{name}/{version}/download` */
export type HubDownloadResult =
  operations["hub_download"]["responses"][200]["content"]["application/json"];

/** Arguments for `hubDownload`. */
export interface HubDownloadArgs {
  /** Path parameters. */
  path: NonNullable<operations["hub_download"]["parameters"]["path"]>;
  /** The request body. */
  body: NonNullable<operations["hub_download"]["requestBody"]>["content"]["application/json"];
}

/** Artifact — `GET /hub/artifacts/{name}/{version}` */
export type HubGetArtifactResult =
  operations["hub_get_artifact"]["responses"][200]["content"]["application/json"];

/** Arguments for `hubGetArtifact`. */
export interface HubGetArtifactArgs {
  /** Path parameters. */
  path: NonNullable<operations["hub_get_artifact"]["parameters"]["path"]>;
}

/** Deprecated alias for /hub/healthz. — `GET /hub/health` */
export type HubHealthResult =
  operations["hub_health"]["responses"][200]["content"]["application/json"];

/** Healthz — `GET /hub/healthz` */
export type HubHealthzResult =
  operations["hub_healthz"]["responses"][200]["content"]["application/json"];

/** Publish — `POST /hub/publish` */
export type HubPublishResult =
  operations["hub_publish"]["responses"][200]["content"]["application/json"];

/** Arguments for `hubPublish`. */
export interface HubPublishArgs {
  /** The request body. */
  body: NonNullable<operations["hub_publish"]["requestBody"]>["content"]["application/json"];
}

/** Do Resolve — `POST /hub/resolve` */
export type HubResolveResult =
  operations["hub_resolve"]["responses"][200]["content"]["application/json"];

/** Arguments for `hubResolve`. */
export interface HubResolveArgs {
  /** The request body. */
  body: NonNullable<operations["hub_resolve"]["requestBody"]>["content"]["application/json"];
}

/** Do Search — `GET /hub/search` */
export type HubSearchResult =
  operations["hub_search"]["responses"][200]["content"]["application/json"];

/** Arguments for `hubSearch`. */
export interface HubSearchArgs {
  /** Query parameters. */
  query?: operations["hub_search"]["parameters"]["query"];
}

/** Capture — `POST /studio/intent` */
export type StudioCaptureIntentResult =
  operations["studio_capture_intent"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioCaptureIntent`. */
export interface StudioCaptureIntentArgs {
  /** The request body. */
  body: NonNullable<
    operations["studio_capture_intent"]["requestBody"]
  >["content"]["application/json"];
}

/** Comparison — `POST /studio/studies/comparison` */
export type StudioComparisonResult =
  operations["studio_comparison"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioComparison`. */
export interface StudioComparisonArgs {
  /** The request body. */
  body: NonNullable<operations["studio_comparison"]["requestBody"]>["content"]["application/json"];
}

/** Healthz — `GET /studio/healthz` */
export type StudioHealthzResult =
  operations["studio_healthz"]["responses"][200]["content"]["application/json"];

/** List Catalog — `GET /studio/catalog/assets` */
export type StudioListCatalogResult =
  operations["studio_list_catalog"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioListCatalog`. */
export interface StudioListCatalogArgs {
  /** Query parameters. */
  query?: operations["studio_list_catalog"]["parameters"]["query"];
}

/** List Worlds — `GET /studio/catalog/worlds` */
export type StudioListWorldsResult =
  operations["studio_list_worlds"]["responses"][200]["content"]["application/json"];

/** Preview Asset — `GET /studio/catalog/preview/{reference}` */
export type StudioPreviewAssetResult =
  operations["studio_preview_asset"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioPreviewAsset`. */
export interface StudioPreviewAssetArgs {
  /** Path parameters. */
  path: NonNullable<operations["studio_preview_asset"]["parameters"]["path"]>;
}

/** Publish Campaign — `POST /studio/campaigns/publish` */
export type StudioPublishCampaignResult =
  operations["studio_publish_campaign"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioPublishCampaign`. */
export interface StudioPublishCampaignArgs {
  /** The request body. */
  body: NonNullable<
    operations["studio_publish_campaign"]["requestBody"]
  >["content"]["application/json"];
}

/** Pull Campaign — `GET /studio/campaigns/{reference}` */
export type StudioPullCampaignResult =
  operations["studio_pull_campaign"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioPullCampaign`. */
export interface StudioPullCampaignArgs {
  /** Path parameters. */
  path: NonNullable<operations["studio_pull_campaign"]["parameters"]["path"]>;
}

/** Resolve World — `GET /studio/worlds/{reference}` */
export type StudioResolveWorldResult =
  operations["studio_resolve_world"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioResolveWorld`. */
export interface StudioResolveWorldArgs {
  /** Path parameters. */
  path: NonNullable<operations["studio_resolve_world"]["parameters"]["path"]>;
}

/** Run Study — `POST /studio/studies` */
export type StudioRunStudyResult =
  operations["studio_run_study"]["responses"][200]["content"]["application/json"];

/** Arguments for `studioRunStudy`. */
export interface StudioRunStudyArgs {
  /** The request body. */
  body: NonNullable<operations["studio_run_study"]["requestBody"]>["content"]["application/json"];
}

/**
 * Every operation the API serves, named by its operation id (api#3).
 *
 * A method resolves with the success body and **throws** on anything else: `ApiProblemError` when
 * the API answered a problem document, `ApiTransportError` when no usable response arrived. That
 * is what the design system's `AsyncState` discipline expects — a returned union would put a
 * branch at every call site, and the point of the problem contract is that a page branches on
 * `code` only where it has something different to say.
 */
export interface ApiOperations {
  /** Audit Trail — `GET /bench/audit` */
  benchAuditTrail(
    args?: BenchAuditTrailArgs,
    options?: CallOptions,
  ): Promise<BenchAuditTrailResult>;

  /** Author Scenario — `POST /bench/scenarios` */
  benchAuthorScenario(
    args: BenchAuthorScenarioArgs,
    options?: CallOptions,
  ): Promise<BenchAuthorScenarioResult>;

  /** Get Job — `GET /bench/jobs/{job_id}` */
  benchGetJob(args: BenchGetJobArgs, options?: CallOptions): Promise<BenchGetJobResult>;

  /** Get Provenance — `GET /bench/submissions/{submission_id}/provenance` */
  benchGetProvenance(
    args: BenchGetProvenanceArgs,
    options?: CallOptions,
  ): Promise<BenchGetProvenanceResult>;

  /** Get Replay — `GET /bench/submissions/{submission_id}/replay` */
  benchGetReplay(args: BenchGetReplayArgs, options?: CallOptions): Promise<BenchGetReplayResult>;

  /** Get Replay Manifest — `GET /bench/submissions/{submission_id}/replay/manifest` */
  benchGetReplayManifest(
    args: BenchGetReplayManifestArgs,
    options?: CallOptions,
  ): Promise<BenchGetReplayManifestResult>;

  /** Get Submission — `GET /bench/submissions/{submission_id}` */
  benchGetSubmission(
    args: BenchGetSubmissionArgs,
    options?: CallOptions,
  ): Promise<BenchGetSubmissionResult>;

  /** Healthz — `GET /bench/healthz` */
  benchHealthz(options?: CallOptions): Promise<BenchHealthzResult>;

  /** Leaderboard — `GET /bench/leaderboard/{scenario_id}` */
  benchLeaderboard(
    args: BenchLeaderboardArgs,
    options?: CallOptions,
  ): Promise<BenchLeaderboardResult>;

  /** Scorecards — `GET /bench/leaderboard/{scenario_id}/scorecards` */
  benchLeaderboardScorecards(
    args: BenchLeaderboardScorecardsArgs,
    options?: CallOptions,
  ): Promise<BenchLeaderboardScorecardsResult>;

  /** List Scenarios — `GET /bench/scenarios` */
  benchListScenarios(options?: CallOptions): Promise<BenchListScenariosResult>;

  /** Prometheus Metrics — `GET /bench/metrics` */
  benchPrometheusMetrics(options?: CallOptions): Promise<BenchPrometheusMetricsResult>;

  /** Retract Submission — `DELETE /bench/submissions/{submission_id}` */
  benchRetractSubmission(
    args: BenchRetractSubmissionArgs,
    options?: CallOptions,
  ): Promise<BenchRetractSubmissionResult>;

  /** Submit — `POST /bench/submissions` */
  benchSubmit(args: BenchSubmitArgs, options?: CallOptions): Promise<BenchSubmitResult>;

  /** Submit Hub — `POST /bench/submissions/hub` */
  benchSubmitHub(args: BenchSubmitHubArgs, options?: CallOptions): Promise<BenchSubmitHubResult>;

  /** Backends — `GET /cloud/backends` */
  cloudBackends(options?: CallOptions): Promise<CloudBackendsResult>;

  /** Compile Job — `POST /cloud/jobs/compile` */
  cloudCompileJob(args: CloudCompileJobArgs, options?: CallOptions): Promise<CloudCompileJobResult>;

  /** Compile Sweep Endpoint — `POST /cloud/sweeps/compile` */
  cloudCompileSweep(
    args: CloudCompileSweepArgs,
    options?: CallOptions,
  ): Promise<CloudCompileSweepResult>;

  /** Compile Workflow Endpoint — `POST /cloud/workflows/compile` */
  cloudCompileWorkflow(
    args: CloudCompileWorkflowArgs,
    options?: CallOptions,
  ): Promise<CloudCompileWorkflowResult>;

  /** Expand Sweep — `POST /cloud/sweeps/expand` */
  cloudExpandSweep(
    args: CloudExpandSweepArgs,
    options?: CallOptions,
  ): Promise<CloudExpandSweepResult>;

  /** Healthz — `GET /cloud/healthz` */
  cloudHealthz(options?: CallOptions): Promise<CloudHealthzResult>;

  /** Submit Job — `POST /cloud/jobs` */
  cloudSubmitJob(args: CloudSubmitJobArgs, options?: CallOptions): Promise<CloudSubmitJobResult>;

  /** Healthz — `GET /healthz` */
  healthz(options?: CallOptions): Promise<HealthzResult>;

  /** Download — `POST /hub/artifacts/{name}/{version}/download` */
  hubDownload(args: HubDownloadArgs, options?: CallOptions): Promise<HubDownloadResult>;

  /** Artifact — `GET /hub/artifacts/{name}/{version}` */
  hubGetArtifact(args: HubGetArtifactArgs, options?: CallOptions): Promise<HubGetArtifactResult>;

  /** Deprecated alias for /hub/healthz. — `GET /hub/health` */
  hubHealth(options?: CallOptions): Promise<HubHealthResult>;

  /** Healthz — `GET /hub/healthz` */
  hubHealthz(options?: CallOptions): Promise<HubHealthzResult>;

  /** Publish — `POST /hub/publish` */
  hubPublish(args: HubPublishArgs, options?: CallOptions): Promise<HubPublishResult>;

  /** Do Resolve — `POST /hub/resolve` */
  hubResolve(args: HubResolveArgs, options?: CallOptions): Promise<HubResolveResult>;

  /** Do Search — `GET /hub/search` */
  hubSearch(args?: HubSearchArgs, options?: CallOptions): Promise<HubSearchResult>;

  /** Capture — `POST /studio/intent` */
  studioCaptureIntent(
    args: StudioCaptureIntentArgs,
    options?: CallOptions,
  ): Promise<StudioCaptureIntentResult>;

  /** Comparison — `POST /studio/studies/comparison` */
  studioComparison(
    args: StudioComparisonArgs,
    options?: CallOptions,
  ): Promise<StudioComparisonResult>;

  /** Healthz — `GET /studio/healthz` */
  studioHealthz(options?: CallOptions): Promise<StudioHealthzResult>;

  /** List Catalog — `GET /studio/catalog/assets` */
  studioListCatalog(
    args?: StudioListCatalogArgs,
    options?: CallOptions,
  ): Promise<StudioListCatalogResult>;

  /** List Worlds — `GET /studio/catalog/worlds` */
  studioListWorlds(options?: CallOptions): Promise<StudioListWorldsResult>;

  /** Preview Asset — `GET /studio/catalog/preview/{reference}` */
  studioPreviewAsset(
    args: StudioPreviewAssetArgs,
    options?: CallOptions,
  ): Promise<StudioPreviewAssetResult>;

  /** Publish Campaign — `POST /studio/campaigns/publish` */
  studioPublishCampaign(
    args: StudioPublishCampaignArgs,
    options?: CallOptions,
  ): Promise<StudioPublishCampaignResult>;

  /** Pull Campaign — `GET /studio/campaigns/{reference}` */
  studioPullCampaign(
    args: StudioPullCampaignArgs,
    options?: CallOptions,
  ): Promise<StudioPullCampaignResult>;

  /** Resolve World — `GET /studio/worlds/{reference}` */
  studioResolveWorld(
    args: StudioResolveWorldArgs,
    options?: CallOptions,
  ): Promise<StudioResolveWorldResult>;

  /** Run Study — `POST /studio/studies` */
  studioRunStudy(args: StudioRunStudyArgs, options?: CallOptions): Promise<StudioRunStudyResult>;
}

/** Bind every operation to *request*. The one place the table becomes callable methods. */
export function createOperations(request: RequestFn): ApiOperations {
  return {
    benchAuditTrail: (args, options) =>
      request<BenchAuditTrailResult>(OPERATIONS.benchAuditTrail, args, options),
    benchAuthorScenario: (args, options) =>
      request<BenchAuthorScenarioResult>(OPERATIONS.benchAuthorScenario, args, options),
    benchGetJob: (args, options) =>
      request<BenchGetJobResult>(OPERATIONS.benchGetJob, args, options),
    benchGetProvenance: (args, options) =>
      request<BenchGetProvenanceResult>(OPERATIONS.benchGetProvenance, args, options),
    benchGetReplay: (args, options) =>
      request<BenchGetReplayResult>(OPERATIONS.benchGetReplay, args, options),
    benchGetReplayManifest: (args, options) =>
      request<BenchGetReplayManifestResult>(OPERATIONS.benchGetReplayManifest, args, options),
    benchGetSubmission: (args, options) =>
      request<BenchGetSubmissionResult>(OPERATIONS.benchGetSubmission, args, options),
    benchHealthz: (options) =>
      request<BenchHealthzResult>(OPERATIONS.benchHealthz, undefined, options),
    benchLeaderboard: (args, options) =>
      request<BenchLeaderboardResult>(OPERATIONS.benchLeaderboard, args, options),
    benchLeaderboardScorecards: (args, options) =>
      request<BenchLeaderboardScorecardsResult>(
        OPERATIONS.benchLeaderboardScorecards,
        args,
        options,
      ),
    benchListScenarios: (options) =>
      request<BenchListScenariosResult>(OPERATIONS.benchListScenarios, undefined, options),
    benchPrometheusMetrics: (options) =>
      request<BenchPrometheusMetricsResult>(OPERATIONS.benchPrometheusMetrics, undefined, options),
    benchRetractSubmission: (args, options) =>
      request<BenchRetractSubmissionResult>(OPERATIONS.benchRetractSubmission, args, options),
    benchSubmit: (args, options) =>
      request<BenchSubmitResult>(OPERATIONS.benchSubmit, args, options),
    benchSubmitHub: (args, options) =>
      request<BenchSubmitHubResult>(OPERATIONS.benchSubmitHub, args, options),
    cloudBackends: (options) =>
      request<CloudBackendsResult>(OPERATIONS.cloudBackends, undefined, options),
    cloudCompileJob: (args, options) =>
      request<CloudCompileJobResult>(OPERATIONS.cloudCompileJob, args, options),
    cloudCompileSweep: (args, options) =>
      request<CloudCompileSweepResult>(OPERATIONS.cloudCompileSweep, args, options),
    cloudCompileWorkflow: (args, options) =>
      request<CloudCompileWorkflowResult>(OPERATIONS.cloudCompileWorkflow, args, options),
    cloudExpandSweep: (args, options) =>
      request<CloudExpandSweepResult>(OPERATIONS.cloudExpandSweep, args, options),
    cloudHealthz: (options) =>
      request<CloudHealthzResult>(OPERATIONS.cloudHealthz, undefined, options),
    cloudSubmitJob: (args, options) =>
      request<CloudSubmitJobResult>(OPERATIONS.cloudSubmitJob, args, options),
    healthz: (options) => request<HealthzResult>(OPERATIONS.healthz, undefined, options),
    hubDownload: (args, options) =>
      request<HubDownloadResult>(OPERATIONS.hubDownload, args, options),
    hubGetArtifact: (args, options) =>
      request<HubGetArtifactResult>(OPERATIONS.hubGetArtifact, args, options),
    hubHealth: (options) => request<HubHealthResult>(OPERATIONS.hubHealth, undefined, options),
    hubHealthz: (options) => request<HubHealthzResult>(OPERATIONS.hubHealthz, undefined, options),
    hubPublish: (args, options) => request<HubPublishResult>(OPERATIONS.hubPublish, args, options),
    hubResolve: (args, options) => request<HubResolveResult>(OPERATIONS.hubResolve, args, options),
    hubSearch: (args, options) => request<HubSearchResult>(OPERATIONS.hubSearch, args, options),
    studioCaptureIntent: (args, options) =>
      request<StudioCaptureIntentResult>(OPERATIONS.studioCaptureIntent, args, options),
    studioComparison: (args, options) =>
      request<StudioComparisonResult>(OPERATIONS.studioComparison, args, options),
    studioHealthz: (options) =>
      request<StudioHealthzResult>(OPERATIONS.studioHealthz, undefined, options),
    studioListCatalog: (args, options) =>
      request<StudioListCatalogResult>(OPERATIONS.studioListCatalog, args, options),
    studioListWorlds: (options) =>
      request<StudioListWorldsResult>(OPERATIONS.studioListWorlds, undefined, options),
    studioPreviewAsset: (args, options) =>
      request<StudioPreviewAssetResult>(OPERATIONS.studioPreviewAsset, args, options),
    studioPublishCampaign: (args, options) =>
      request<StudioPublishCampaignResult>(OPERATIONS.studioPublishCampaign, args, options),
    studioPullCampaign: (args, options) =>
      request<StudioPullCampaignResult>(OPERATIONS.studioPullCampaign, args, options),
    studioResolveWorld: (args, options) =>
      request<StudioResolveWorldResult>(OPERATIONS.studioResolveWorld, args, options),
    studioRunStudy: (args, options) =>
      request<StudioRunStudyResult>(OPERATIONS.studioRunStudy, args, options),
  };
}
