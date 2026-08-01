// GENERATED — DO NOT EDIT. Typed MSW handlers.
//
// Written by `scripts/codegen-api-client.mjs` from `packages/api-client/openapi/openapi.json`.
// Regenerate with `pnpm codegen:api`; a hand edit is caught by `pnpm check:api-drift`.

import type { HttpHandler } from "msw";

import { mockOperation, notStubbed, type ReplyOrResolver } from "../msw-runtime.js";
import { OPERATIONS, type OperationName } from "./manifest.gen.js";
import type {
  BenchAuditTrailResult,
  BenchAuthorScenarioResult,
  BenchGetJobResult,
  BenchGetProvenanceResult,
  BenchGetReplayResult,
  BenchGetReplayManifestResult,
  BenchGetSubmissionResult,
  BenchHealthzResult,
  BenchLeaderboardResult,
  BenchLeaderboardScorecardsResult,
  BenchListScenariosResult,
  BenchPrometheusMetricsResult,
  BenchRetractSubmissionResult,
  BenchSubmitResult,
  BenchSubmitHubResult,
  CloudBackendsResult,
  CloudCompileJobResult,
  CloudCompileSweepResult,
  CloudCompileWorkflowResult,
  CloudExpandSweepResult,
  CloudHealthzResult,
  CloudSubmitJobResult,
  HealthzResult,
  HubDownloadResult,
  HubGetArtifactResult,
  HubHealthResult,
  HubHealthzResult,
  HubPublishResult,
  HubResolveResult,
  HubSearchResult,
  StudioCaptureIntentResult,
  StudioComparisonResult,
  StudioHealthzResult,
  StudioListCatalogResult,
  StudioListWorldsResult,
  StudioPreviewAssetResult,
  StudioPublishCampaignResult,
  StudioPullCampaignResult,
  StudioResolveWorldResult,
  StudioRunStudyResult,
} from "./operations.gen.js";

/**
 * One typed handler factory per operation.
 *
 * The reply is checked against the *document's* response type, so a test whose fixture stops
 * matching the API fails to compile rather than passing against a shape the server never sends.
 * That is the whole reason these are generated rather than written.
 */
export interface MockApi {
  /** Audit Trail — `GET /bench/audit` */
  benchAuditTrail(reply: ReplyOrResolver<BenchAuditTrailResult>): HttpHandler;

  /** Author Scenario — `POST /bench/scenarios` */
  benchAuthorScenario(reply: ReplyOrResolver<BenchAuthorScenarioResult>): HttpHandler;

  /** Get Job — `GET /bench/jobs/{job_id}` */
  benchGetJob(reply: ReplyOrResolver<BenchGetJobResult>): HttpHandler;

  /** Get Provenance — `GET /bench/submissions/{submission_id}/provenance` */
  benchGetProvenance(reply: ReplyOrResolver<BenchGetProvenanceResult>): HttpHandler;

  /** Get Replay — `GET /bench/submissions/{submission_id}/replay` */
  benchGetReplay(reply: ReplyOrResolver<BenchGetReplayResult>): HttpHandler;

  /** Get Replay Manifest — `GET /bench/submissions/{submission_id}/replay/manifest` */
  benchGetReplayManifest(reply: ReplyOrResolver<BenchGetReplayManifestResult>): HttpHandler;

  /** Get Submission — `GET /bench/submissions/{submission_id}` */
  benchGetSubmission(reply: ReplyOrResolver<BenchGetSubmissionResult>): HttpHandler;

  /** Healthz — `GET /bench/healthz` */
  benchHealthz(reply: ReplyOrResolver<BenchHealthzResult>): HttpHandler;

  /** Leaderboard — `GET /bench/leaderboard/{scenario_id}` */
  benchLeaderboard(reply: ReplyOrResolver<BenchLeaderboardResult>): HttpHandler;

  /** Scorecards — `GET /bench/leaderboard/{scenario_id}/scorecards` */
  benchLeaderboardScorecards(reply: ReplyOrResolver<BenchLeaderboardScorecardsResult>): HttpHandler;

  /** List Scenarios — `GET /bench/scenarios` */
  benchListScenarios(reply: ReplyOrResolver<BenchListScenariosResult>): HttpHandler;

  /** Prometheus Metrics — `GET /bench/metrics` */
  benchPrometheusMetrics(reply: ReplyOrResolver<BenchPrometheusMetricsResult>): HttpHandler;

  /** Retract Submission — `DELETE /bench/submissions/{submission_id}` */
  benchRetractSubmission(reply: ReplyOrResolver<BenchRetractSubmissionResult>): HttpHandler;

  /** Submit — `POST /bench/submissions` */
  benchSubmit(reply: ReplyOrResolver<BenchSubmitResult>): HttpHandler;

  /** Submit Hub — `POST /bench/submissions/hub` */
  benchSubmitHub(reply: ReplyOrResolver<BenchSubmitHubResult>): HttpHandler;

  /** Backends — `GET /cloud/backends` */
  cloudBackends(reply: ReplyOrResolver<CloudBackendsResult>): HttpHandler;

  /** Compile Job — `POST /cloud/jobs/compile` */
  cloudCompileJob(reply: ReplyOrResolver<CloudCompileJobResult>): HttpHandler;

  /** Compile Sweep Endpoint — `POST /cloud/sweeps/compile` */
  cloudCompileSweep(reply: ReplyOrResolver<CloudCompileSweepResult>): HttpHandler;

  /** Compile Workflow Endpoint — `POST /cloud/workflows/compile` */
  cloudCompileWorkflow(reply: ReplyOrResolver<CloudCompileWorkflowResult>): HttpHandler;

  /** Expand Sweep — `POST /cloud/sweeps/expand` */
  cloudExpandSweep(reply: ReplyOrResolver<CloudExpandSweepResult>): HttpHandler;

  /** Healthz — `GET /cloud/healthz` */
  cloudHealthz(reply: ReplyOrResolver<CloudHealthzResult>): HttpHandler;

  /** Submit Job — `POST /cloud/jobs` */
  cloudSubmitJob(reply: ReplyOrResolver<CloudSubmitJobResult>): HttpHandler;

  /** Healthz — `GET /healthz` */
  healthz(reply: ReplyOrResolver<HealthzResult>): HttpHandler;

  /** Download — `POST /hub/artifacts/{name}/{version}/download` */
  hubDownload(reply: ReplyOrResolver<HubDownloadResult>): HttpHandler;

  /** Artifact — `GET /hub/artifacts/{name}/{version}` */
  hubGetArtifact(reply: ReplyOrResolver<HubGetArtifactResult>): HttpHandler;

  /** Deprecated alias for /hub/healthz. — `GET /hub/health` */
  hubHealth(reply: ReplyOrResolver<HubHealthResult>): HttpHandler;

  /** Healthz — `GET /hub/healthz` */
  hubHealthz(reply: ReplyOrResolver<HubHealthzResult>): HttpHandler;

  /** Publish — `POST /hub/publish` */
  hubPublish(reply: ReplyOrResolver<HubPublishResult>): HttpHandler;

  /** Do Resolve — `POST /hub/resolve` */
  hubResolve(reply: ReplyOrResolver<HubResolveResult>): HttpHandler;

  /** Do Search — `GET /hub/search` */
  hubSearch(reply: ReplyOrResolver<HubSearchResult>): HttpHandler;

  /** Capture — `POST /studio/intent` */
  studioCaptureIntent(reply: ReplyOrResolver<StudioCaptureIntentResult>): HttpHandler;

  /** Comparison — `POST /studio/studies/comparison` */
  studioComparison(reply: ReplyOrResolver<StudioComparisonResult>): HttpHandler;

  /** Healthz — `GET /studio/healthz` */
  studioHealthz(reply: ReplyOrResolver<StudioHealthzResult>): HttpHandler;

  /** List Catalog — `GET /studio/catalog/assets` */
  studioListCatalog(reply: ReplyOrResolver<StudioListCatalogResult>): HttpHandler;

  /** List Worlds — `GET /studio/catalog/worlds` */
  studioListWorlds(reply: ReplyOrResolver<StudioListWorldsResult>): HttpHandler;

  /** Preview Asset — `GET /studio/catalog/preview/{reference}` */
  studioPreviewAsset(reply: ReplyOrResolver<StudioPreviewAssetResult>): HttpHandler;

  /** Publish Campaign — `POST /studio/campaigns/publish` */
  studioPublishCampaign(reply: ReplyOrResolver<StudioPublishCampaignResult>): HttpHandler;

  /** Pull Campaign — `GET /studio/campaigns/{reference}` */
  studioPullCampaign(reply: ReplyOrResolver<StudioPullCampaignResult>): HttpHandler;

  /** Resolve World — `GET /studio/worlds/{reference}` */
  studioResolveWorld(reply: ReplyOrResolver<StudioResolveWorldResult>): HttpHandler;

  /** Run Study — `POST /studio/studies` */
  studioRunStudy(reply: ReplyOrResolver<StudioRunStudyResult>): HttpHandler;
}

/** Mock handlers for an API served at *baseUrl*. */
export function createMockApi(baseUrl: string): MockApi {
  return {
    benchAuditTrail: mockOperation(baseUrl, OPERATIONS.benchAuditTrail),
    benchAuthorScenario: mockOperation(baseUrl, OPERATIONS.benchAuthorScenario),
    benchGetJob: mockOperation(baseUrl, OPERATIONS.benchGetJob),
    benchGetProvenance: mockOperation(baseUrl, OPERATIONS.benchGetProvenance),
    benchGetReplay: mockOperation(baseUrl, OPERATIONS.benchGetReplay),
    benchGetReplayManifest: mockOperation(baseUrl, OPERATIONS.benchGetReplayManifest),
    benchGetSubmission: mockOperation(baseUrl, OPERATIONS.benchGetSubmission),
    benchHealthz: mockOperation(baseUrl, OPERATIONS.benchHealthz),
    benchLeaderboard: mockOperation(baseUrl, OPERATIONS.benchLeaderboard),
    benchLeaderboardScorecards: mockOperation(baseUrl, OPERATIONS.benchLeaderboardScorecards),
    benchListScenarios: mockOperation(baseUrl, OPERATIONS.benchListScenarios),
    benchPrometheusMetrics: mockOperation(baseUrl, OPERATIONS.benchPrometheusMetrics),
    benchRetractSubmission: mockOperation(baseUrl, OPERATIONS.benchRetractSubmission),
    benchSubmit: mockOperation(baseUrl, OPERATIONS.benchSubmit),
    benchSubmitHub: mockOperation(baseUrl, OPERATIONS.benchSubmitHub),
    cloudBackends: mockOperation(baseUrl, OPERATIONS.cloudBackends),
    cloudCompileJob: mockOperation(baseUrl, OPERATIONS.cloudCompileJob),
    cloudCompileSweep: mockOperation(baseUrl, OPERATIONS.cloudCompileSweep),
    cloudCompileWorkflow: mockOperation(baseUrl, OPERATIONS.cloudCompileWorkflow),
    cloudExpandSweep: mockOperation(baseUrl, OPERATIONS.cloudExpandSweep),
    cloudHealthz: mockOperation(baseUrl, OPERATIONS.cloudHealthz),
    cloudSubmitJob: mockOperation(baseUrl, OPERATIONS.cloudSubmitJob),
    healthz: mockOperation(baseUrl, OPERATIONS.healthz),
    hubDownload: mockOperation(baseUrl, OPERATIONS.hubDownload),
    hubGetArtifact: mockOperation(baseUrl, OPERATIONS.hubGetArtifact),
    hubHealth: mockOperation(baseUrl, OPERATIONS.hubHealth),
    hubHealthz: mockOperation(baseUrl, OPERATIONS.hubHealthz),
    hubPublish: mockOperation(baseUrl, OPERATIONS.hubPublish),
    hubResolve: mockOperation(baseUrl, OPERATIONS.hubResolve),
    hubSearch: mockOperation(baseUrl, OPERATIONS.hubSearch),
    studioCaptureIntent: mockOperation(baseUrl, OPERATIONS.studioCaptureIntent),
    studioComparison: mockOperation(baseUrl, OPERATIONS.studioComparison),
    studioHealthz: mockOperation(baseUrl, OPERATIONS.studioHealthz),
    studioListCatalog: mockOperation(baseUrl, OPERATIONS.studioListCatalog),
    studioListWorlds: mockOperation(baseUrl, OPERATIONS.studioListWorlds),
    studioPreviewAsset: mockOperation(baseUrl, OPERATIONS.studioPreviewAsset),
    studioPublishCampaign: mockOperation(baseUrl, OPERATIONS.studioPublishCampaign),
    studioPullCampaign: mockOperation(baseUrl, OPERATIONS.studioPullCampaign),
    studioResolveWorld: mockOperation(baseUrl, OPERATIONS.studioResolveWorld),
    studioRunStudy: mockOperation(baseUrl, OPERATIONS.studioRunStudy),
  };
}

/**
 * A catch-all per operation, answering `capability_unavailable` with a message naming the
 * operation. Register these **last**: MSW takes the first matching handler, so anything a test
 * stubbed explicitly still wins, and anything it forgot fails by name instead of escaping to the
 * network.
 */
export function notStubbedHandlers(baseUrl: string): HttpHandler[] {
  return (Object.keys(OPERATIONS) as OperationName[]).map((name) =>
    notStubbed(baseUrl, OPERATIONS[name]),
  );
}
