// GENERATED — DO NOT EDIT. The OpenAPI document as TypeScript.
//
// Written by `scripts/codegen-api-client.mjs` from `packages/api-client/openapi/openapi.json`.
// Regenerate with `pnpm codegen:api`; a hand edit is caught by `pnpm check:api-drift`.

export interface paths {
  "/bench/audit": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Audit Trail
     * @description Query the authN/authZ + verification audit trail — ``audit:read``, admin-only (bench#29).
     *
     *     The queryable half of "disputes are auditable" (bench.md §9): filter by who, what, and the
     *     outcome, newest first.
     */
    get: operations["bench_audit_trail"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/healthz": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Healthz */
    get: operations["bench_healthz"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/jobs/{job_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Job */
    get: operations["bench_get_job"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/leaderboard/{scenario_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Leaderboard */
    get: operations["bench_leaderboard"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/leaderboard/{scenario_id}/scorecards": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Scorecards
     * @description The full per-metric leaderboard dataset View renders (bench.md §6; RM-P1-BENCH-12).
     *
     *     Same ranking as ``/bench/leaderboard/{scenario_id}`` but every row carries its complete
     *     scorecard with per-metric uncertainty, so View shows scorecards and bounds, not just the
     *     primary.
     */
    get: operations["bench_leaderboard_scorecards"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/metrics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Prometheus Metrics
     * @description Prometheus exposition for the submission pipeline (bench.md §10; bench#32).
     *
     *     Queue depth, re-execution mismatch rate (the key integrity signal), evaluation latency,
     *     authorization decisions, supply-chain verifications, and sandbox terminations. Left
     *     unauthenticated so a Prometheus scraper needs no account — the deployment restricts it at
     *     the network layer, as is conventional.
     */
    get: operations["bench_prometheus_metrics"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/scenarios": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List Scenarios
     * @description The scenario ids in the zoo — account-free, like every read path.
     */
    get: operations["bench_list_scenarios"];
    put?: never;
    /**
     * Author Scenario
     * @description Publish a ScenarioSpec into the hosted catalog — ``scenario:author`` (bench#29).
     *
     *     The write surface of the Postgres/pgvector zoo catalog (bench#33): only a maintainer or an
     *     admin may add to the commons' benchmark catalog, and the act is audit-logged. Returns 503 on
     *     a deployment whose catalog is the read-only packaged filesystem zoo.
     */
    post: operations["bench_author_scenario"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Submit
     * @description Submit an importable ``policy_ref``; it runs **in a sandbox**, never in-process.
     */
    post: operations["bench_submit"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions/{submission_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Submission */
    get: operations["bench_get_submission"];
    put?: never;
    post?: never;
    /**
     * Retract Submission
     * @description Retract an entry from the board — ``ranking:mutate``, admin-only, audit-logged.
     */
    delete: operations["bench_retract_submission"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions/{submission_id}/provenance": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Provenance */
    get: operations["bench_get_provenance"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions/{submission_id}/replay": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Replay
     * @description The MCAP episode replay bytes View plays (``application/octet-stream``), 404 if none.
     *
     *     Bench provides the MCAP replays; View renders them (bench.md §6). A replay is present only
     *     when one was attached to the entry (``LeaderboardService.attach_replay``).
     */
    get: operations["bench_get_replay"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions/{submission_id}/replay/manifest": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Replay Manifest
     * @description The decoded replay manifest (frames, agents, sim-time span); 404 if no replay.
     */
    get: operations["bench_get_replay_manifest"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/bench/submissions/hub": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Submit Hub
     * @description Submit a community artifact by Hub digest; verified (cosign/SLSA/SBOM) then sandboxed.
     */
    post: operations["bench_submit_hub"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/backends": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Backends */
    get: operations["cloud_backends"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/healthz": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Healthz */
    get: operations["cloud_healthz"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/jobs": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Submit Job
     * @description Submit a JobSpec through *backend* -- the same call site as the CLI/library.
     */
    post: operations["cloud_submit_job"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/jobs/compile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Compile Job
     * @description Compile a JobSpec to its engine manifest (auto-routed unless *engine* is given).
     *
     *     **Deliberately an open object.** The response is an execution engine's own manifest — an
     *     Argo ``Workflow`` or a Kubernetes ``Job`` — whose schema belongs to that engine and changes
     *     with it. Declaring a closed model here would either be a lie the first time an engine added
     *     a field, or a second copy of someone else's API that this repository would have to chase.
     *     A client that needs to read one of these knows which engine it asked for.
     */
    post: operations["cloud_compile_job"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/sweeps/compile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Compile Sweep Endpoint
     * @description Compile a SweepSpec to its Argo fan-out Workflow.
     *
     *     An open object for the same reason as ``compile_job`` above: this is Argo's schema.
     */
    post: operations["cloud_compile_sweep"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/sweeps/expand": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Expand Sweep
     * @description Preview a SweepSpec's deterministic expansion into concrete jobs.
     */
    post: operations["cloud_expand_sweep"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/cloud/workflows/compile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Compile Workflow Endpoint
     * @description Compile a WorkflowSpec to its Argo DAG Workflow.
     *
     *     An open object for the same reason as ``compile_job`` above: this is Argo's schema.
     */
    post: operations["cloud_compile_workflow"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/healthz": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Healthz
     * @description Liveness for the deployment as a whole, naming what it serves.
     *
     *     Each surface answers ``/healthz`` under its own prefix — this one answers "is this process
     *     up, and which surfaces did it mount?", which is the question a load balancer in front of a
     *     multi-surface deployment actually asks.
     */
    get: operations["healthz"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/artifacts/{name}/{version}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Artifact */
    get: operations["hub_get_artifact"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/artifacts/{name}/{version}/download": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Download */
    post: operations["hub_download"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Deprecated alias for /hub/healthz.
     * @deprecated
     * @description The pre-convergence spelling, answering the same body as ``/hub/healthz``.
     *
     *     Hub was the one surface spelling this ``/health``; ``api.md`` §4 said the spelling
     *     converges during the move, and it has. This stays for one cycle so nothing that probes it
     *     breaks on the deploy that converges it, and says so in the document and in its headers.
     */
    get: operations["hub_health"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/healthz": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Healthz */
    get: operations["hub_healthz"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Publish
     * @description Index an already-stored artifact — after proving the caller's claims about it.
     *
     *     Every field in the body is a *claim*: the digest, the manifest, and the namespace. This
     *     endpoint used to take all three on the caller's word, which let a request forge content
     *     provenance rather than merely omit it. Admission now re-derives each from the registry
     *     (hub.md §2.3), and a caller-asserted trust tier above ``open`` is refused outright —
     *     promotion is a curated, audited action (hub.md §9), never a field in a publish request.
     */
    post: operations["hub_publish"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/resolve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Do Resolve */
    post: operations["hub_resolve"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/hub/search": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Do Search */
    get: operations["hub_search"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/campaigns/{reference}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Pull Campaign
     * @description Pull a published campaign back by reference or digest, re-verified before trusted.
     */
    get: operations["studio_pull_campaign"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/campaigns/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Publish Campaign
     * @description Freeze and publish a campaign to Hub as a signed, content-addressed artifact.
     */
    post: operations["studio_publish_campaign"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/catalog/assets": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List Catalog
     * @description The robot menu: the Hub asset catalog, optionally filtered by capability tag.
     */
    get: operations["studio_list_catalog"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/catalog/preview/{reference}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Preview Asset
     * @description Materialize a selected asset's geometry from Hub by digest; hand View a URL to fetch.
     */
    get: operations["studio_preview_asset"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/catalog/worlds": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List Worlds
     * @description The world menu: the world bundles present in the configured registry.
     *
     *     `GET /studio/worlds/{reference}` already materializes whichever of these is chosen — only
     *     the front door was missing, so terrain was reachable solely by hand-editing `?world=`.
     */
    get: operations["studio_list_worlds"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/healthz": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Healthz */
    get: operations["studio_healthz"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/intent": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Capture */
    post: operations["studio_capture_intent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/studies": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Run Study */
    post: operations["studio_run_study"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/studies/comparison": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Comparison
     * @description The Pareto front with per-metric uncertainty — bounds, not bare point estimates.
     */
    post: operations["studio_comparison"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/studio/worlds/{reference}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Resolve World
     * @description Materialize a Worlds bundle from Hub by digest, and hand View the URL to fetch.
     */
    get: operations["studio_resolve_world"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /**
     * ArtifactDetail
     * @description A single artifact: its projection, its catalog record, its manifest attributes, and what is
     *     attested.
     *
     *     ``attestations`` names the attestation *types present in the registry* — it is emphatically not
     *     a verification verdict, and the front end is required to say so in those words (ui.md §7).
     *     Empty when the deployment has no registry to ask.
     *
     *     ``attributes`` is the Core manifest's open map, served **verbatim** and kept out of ``record``
     *     because ``record`` is Core's ``CatalogRecord`` projection and that projection deliberately drops
     *     it. It is unbounded and unschematized by design — read a key only if you know the producer
     *     stamps it, and never assume one is present.
     */
    ArtifactDetail: {
      /** Artifact Kind */
      artifact_kind?: string | null;
      /** Attestations */
      attestations?: string[];
      /** Attributes */
      attributes?: {
        [key: string]: unknown;
      };
      /**
       * Deprecated
       * @default false
       */
      deprecated: boolean;
      /** Digest */
      digest: string;
      /** Kind */
      kind?: string | null;
      /** License */
      license?: string | null;
      /** Name */
      name: string;
      /** Namespace */
      namespace?: string | null;
      /** Publisher */
      publisher?: string | null;
      /** Record */
      record: {
        [key: string]: unknown;
      };
      /** Reference */
      reference: string;
      /** Score */
      score: number;
      /** Version */
      version: string;
      /**
       * Yanked
       * @default false
       */
      yanked: boolean;
    };
    /**
     * ArtifactProvenance
     * @description The reproducibility envelope stamped on every produced Studio artifact.
     */
    ArtifactProvenance: {
      /** Code Version */
      code_version?: string | null;
      /** Core Interface Versions */
      core_interface_versions?: {
        [key: string]: string;
      };
      /** Engine Versions */
      engine_versions?: {
        [key: string]: string;
      };
      /** Env Lockfile */
      env_lockfile?: string | null;
      /** Input Hashes */
      input_hashes?: string[];
      /** Seed */
      seed?: number | null;
      /** Toolchain Version */
      toolchain_version?: string | null;
    };
    /**
     * AssetPreviewResponse
     * @description An asset Studio pulled from Hub by digest and is now serving to the embedded View.
     */
    AssetPreviewResponse: {
      /** Digest */
      digest: string;
      /** Document Url */
      document_url: string;
      /** Reference */
      reference: string;
    };
    /**
     * AssetSelection
     * @description A Fleet SADF asset chosen for a swarm, by content reference + count. ``sadf_ref``
     *     is a content hash / catalog id resolved from Hub, never an imported object.
     */
    AssetSelection: {
      /** Count */
      count: number;
      /** Sadf Ref */
      sadf_ref: string;
    };
    /**
     * AuditDecision
     * @description What the trail records: an authorization outcome, or the outcome of a verification.
     * @enum {string}
     */
    AuditDecision: "allow" | "deny" | "verified" | "rejected";
    /**
     * AuditEvent
     * @description One decision, recorded. Frozen: the trail is append-only.
     *
     *     ``event_id`` content-addresses the record, so the same decision logged twice is recognisably the
     *     same decision, and an event cannot be silently altered without changing its id.
     */
    AuditEvent: {
      /** Action */
      action: string;
      decision: components["schemas"]["AuditDecision"];
      /** Detail */
      detail?: {
        [key: string]: unknown;
      };
      /** Event Id */
      event_id: string;
      /** Issuer */
      issuer?: string | null;
      /** Job Id */
      job_id?: string | null;
      /**
       * Occurred At
       * Format: date-time
       */
      occurred_at: string;
      /**
       * Reason
       * @default
       */
      reason: string;
      /**
       * Resource
       * @default
       */
      resource: string;
      /** Subject */
      subject?: string | null;
      /** Submission Id */
      submission_id?: string | null;
      /** Trace Id */
      trace_id?: string | null;
    };
    /**
     * BenchJobRecord
     * @description Bench's evaluation job record, named for the document rather than for the module.
     *
     *     Bench and Studio each own a ``JobRecord``, and they are genuinely different things — one tracks
     *     an evaluation, the other a design study. Mounted in one process they collide in the OpenAPI
     *     document, and FastAPI disambiguates by prefixing the module path, which produces
     *     ``astro_mine__bench__leaderboard___jobs__JobRecord`` and a generated client method returning a
     *     type nobody can type.
     *
     *     The collision is an artifact of *composition* — it exists only because this distribution serves
     *     both surfaces from one document — so it is resolved here rather than by renaming a platform type
     *     that is unambiguous on its own. This subclass adds nothing: every field is inherited, so the
     *     document and the platform model cannot drift.
     */
    BenchJobRecord: {
      /** Detail */
      detail?: string | null;
      /** Job Id */
      job_id: string;
      /** Result Id */
      result_id?: string | null;
      status: components["schemas"]["SubmissionStatus"];
    };
    /**
     * Campaign
     * @description A chosen design authored into a timeline with contingency branches — the Core-shaped
     *     artifact handed to Ops **unchanged** in Phase 2 (studio.md §3, §9 "hand-off, don't
     *     fork"). Studio-owned (Core has no campaign schema in the pinned interface); frozen and
     *     content-addressed once handed off.
     */
    Campaign: {
      chosen: components["schemas"]["EvaluatedCandidate"];
      /** Contingencies */
      contingencies?: components["schemas"]["ContingencyBranch"][];
      /** Evaluator */
      evaluator?: string | null;
      /** Id */
      id: string;
      /** Name */
      name: string;
      /** Objective Hash */
      objective_hash: string;
      /** Phases */
      phases: components["schemas"]["CampaignPhase"][];
      provenance: components["schemas"]["ArtifactProvenance"];
      /** Trade Study Ref */
      trade_study_ref?: string | null;
      /** World Ref */
      world_ref?: string | null;
    };
    /**
     * CampaignPhase
     * @description One phase of a campaign timeline (studio.md §3). ``objective_ref`` optionally binds
     *     a phase to a per-phase objective by content hash; single-phase campaigns are the
     *     common lunar case (a single-``surface``-phase Mission is exactly a campaign, RFC-0001).
     */
    CampaignPhase: {
      /** Duration S */
      duration_s?: number | null;
      /** Id */
      id: string;
      /** Name */
      name: string;
      /** Objective Ref */
      objective_ref?: string | null;
    };
    /**
     * CandidateScore
     * @description The Bench score of a candidate against an objective. Uncertainty is **shown, not
     *     hidden** (studio.md §2 principle 7): surrogate/low-fidelity estimates carry an
     *     explicit per-metric bound alongside the point estimate.
     */
    CandidateScore: {
      /** Aggregate */
      aggregate: number;
      /** Metric Scores */
      metric_scores: {
        [key: string]: number;
      };
      /** Metric Uncertainty */
      metric_uncertainty?: {
        [key: string]: number;
      };
      /** Objective Hash */
      objective_hash: string;
      /** Passed */
      passed: boolean;
    };
    /**
     * CapturedObjective
     * @description The persisted result of intent capture: the validated document, its content
     *     address, and the provenance that reproduces it.
     */
    CapturedObjective: {
      /** Digest */
      digest: string;
      document: components["schemas"]["ObjectiveDocument"];
      provenance: components["schemas"]["ArtifactProvenance"];
    };
    /** CaptureRequest */
    CaptureRequest: {
      draft: components["schemas"]["IntentDraft"];
      /** Model */
      model?: string | null;
      vocabulary?: components["schemas"]["MetricVocabulary"] | null;
    };
    /**
     * CheckpointPolicy
     * @description When to checkpoint a long/preemptible job so a spot eviction loses <= one interval.
     *
     *     A job carrying a checkpoint policy is resumable: ``autoscale/checkpoint.py`` writes
     *     content-addressed checkpoints to the artifact store every ``interval_seconds`` and, on
     *     preemption, resumes from the last one (``cloud.md`` §8; RM-P1-CLOUD-03).
     */
    CheckpointPolicy: {
      /** Interval Seconds */
      interval_seconds: number;
      /**
       * Resume
       * @default true
       */
      resume: boolean;
    };
    /**
     * ComparisonCandidate
     * @description One evaluated candidate, as the trade-off plots read it.
     */
    ComparisonCandidate: {
      /** Aggregate */
      aggregate: number;
      /** Candidate Id */
      candidate_id: string;
      /** Metrics */
      metrics: {
        [key: string]: components["schemas"]["MetricEstimate"];
      };
      /** On Pareto Front */
      on_pareto_front: boolean;
      /** Passed */
      passed: boolean;
      /** Seed */
      seed: number;
    };
    /**
     * ComparisonView
     * @description A trade study reshaped for the Pareto scatter and parallel-coordinates plots.
     */
    ComparisonView: {
      /** Backend */
      backend: string;
      /** Candidates */
      candidates: components["schemas"]["ComparisonCandidate"][];
      /** Evaluator */
      evaluator: string;
      /** Metrics */
      metrics: string[];
      /** Objective Hash */
      objective_hash: string;
      /** Pareto Front */
      pareto_front: string[];
      /** Study Id */
      study_id: string;
    };
    /**
     * ContingencyBranch
     * @description An alternate phase sequence taken when ``trigger`` fires (studio.md §3).
     */
    ContingencyBranch: {
      /** Id */
      id: string;
      /** Phases */
      phases: components["schemas"]["CampaignPhase"][];
      /** Trigger */
      trigger: string;
    };
    /**
     * DeploymentHealth
     * @description Liveness for the deployment as a whole, naming what it mounted.
     *
     *     The surface health shape plus one field, rather than a shape of its own: a probe or a status
     *     page that reads ``/hub/healthz`` reads this the same way, and only has to know about
     *     ``surfaces`` if it cares which ones this process serves.
     */
    DeploymentHealth: {
      /** Component */
      component: string;
      /**
       * Status
       * @default ok
       */
      status: string;
      /** Surfaces */
      surfaces: string[];
      /** Version */
      version: string;
    };
    /**
     * DesignCandidate
     * @description A proposed solution: an SADF swarm composition + infrastructure + a policy stack
     *     (drawn from Hub by ref), plus the decision-variable vector that produced it
     *     (STUDIO-02 fills the vector; STUDIO-03 only consumes the candidate).
     */
    DesignCandidate: {
      /** Decision Vector */
      decision_vector?: {
        [key: string]: number;
      };
      /** Id */
      id: string;
      /** Infrastructure */
      infrastructure?: string[];
      /** Policy Refs */
      policy_refs?: {
        [key: string]: string;
      };
      /** Swarm */
      swarm: components["schemas"]["AssetSelection"][];
    };
    /**
     * DownloadBody
     * @description What a requester presents at the gated download boundary.
     */
    DownloadBody: {
      /** Allowed Licenses */
      allowed_licenses?: string[] | null;
      /** Grants */
      grants?: string[];
      /**
       * Require Verified
       * @default false
       */
      require_verified: boolean;
    };
    /**
     * DownloadGrant
     * @description Permission to materialize an artifact, with the policy that granted it.
     *
     *     The policy version travels with the grant so a consumer can record which rules let it in.
     */
    DownloadGrant: {
      /** Digest */
      digest: string;
      /** Policy Engine */
      policy_engine: string;
      /** Policy Version */
      policy_version: string;
    };
    /**
     * EnvironmentFingerprint
     * @description Observational environment stamp -- recorded, but *outside* the determinism set.
     */
    EnvironmentFingerprint: {
      /** Code Version */
      code_version?: string;
      /** Platform */
      platform?: string;
      /** Python */
      python?: string;
    };
    /**
     * EnvironmentStamp
     * @description The machine fingerprint — recorded for audit, kept OUT of the result hash.
     *
     *     Excluded from :attr:`Result.result_hash` so a Result reproduces byte-for-byte across machines
     *     and interpreters (mirrors Sim's environment fingerprint, ``recording/__init__.py``).
     */
    EnvironmentStamp: {
      /** Platform */
      platform: string;
      /** Python */
      python: string;
    };
    /**
     * ErrorCode
     * @description Every error this API can answer with, named rather than inferred from a status.
     *
     *     A status is not an identity: three different things answer 503 and four answer 404, which is
     *     exactly why the front end was reduced to reading messages. These are the names it branches on
     *     instead, and the six the issue called out — publish unconfigured, namespace refused, admission
     *     rejected, resolution failed, content not found, capability unavailable — are all here.
     *
     *     **Append-only.** A code is public API the moment a client switches on it; removing or
     *     repurposing one breaks that client silently, in the arm it takes least often.
     * @enum {string}
     */
    ErrorCode:
      | "publish_unconfigured"
      | "namespace_refused"
      | "admission_rejected"
      | "resolution_failed"
      | "content_not_found"
      | "capability_unavailable"
      | "download_denied"
      | "validation_failed"
      | "invalid_request"
      | "not_authenticated"
      | "not_authorized"
      | "rate_limited"
      | "submission_rejected"
      | "conflict"
      | "method_not_allowed"
      | "internal_error";
    /**
     * EvaluatedCandidate
     * @description A candidate that has been fanned through the design loop and scored, with the
     *     provenance needed to reproduce it (studio.md §6).
     */
    EvaluatedCandidate: {
      candidate: components["schemas"]["DesignCandidate"];
      provenance: components["schemas"]["ArtifactProvenance"];
      score: components["schemas"]["CandidateScore"];
      /** Seed */
      seed: number;
      /** World Ref */
      world_ref: string;
    };
    /**
     * EvaluationWindow
     * @description How a metric binding is evaluated over time. Without one, a binding is evaluated
     *     cumulatively over the whole episode. A ``rolling`` window expresses rate/sustained
     *     objectives ("10 t per lunar day") and requires ``duration_s``; ``cumulative`` and
     *     ``per_phase`` forbid it (enforced in the loader). Time-windowing semantics are the
     *     metric's job (Bench); this declares the intent.
     */
    EvaluationWindow: {
      /** Duration S */
      duration_s?: number | null;
      kind: components["schemas"]["WindowKind"];
    };
    /**
     * FieldProblem
     * @description One field-level failure inside a :class:`Problem` — structured, so nobody parses prose.
     */
    FieldProblem: {
      /** Field */
      field: string;
      /** Message */
      message: string;
      /** Type */
      type: string;
    };
    /**
     * GeoRegion
     * @description A body/region an objective is stated against, carrying an **explicit planetary
     *     CRS** (conventions.md §5) — no implicit Earth/WGS84 assumption. ``crs`` is the Core
     *     ``PlanetaryCRS`` type; the deterministic-forms path rejects a missing/invalid CRS
     *     at the boundary (see ``intent.forms``).
     */
    GeoRegion: {
      crs: components["schemas"]["PlanetaryCRS"];
      /** Name */
      name: string;
    };
    /**
     * HardConstraint
     * @description A power/thermal/comms/safety hard constraint → a *required* success criterion
     *     with a pass/fail ``threshold`` (studio.md §3).
     */
    HardConstraint: {
      /** Criterion Id */
      criterion_id: string;
      /** @default lower_better */
      direction: components["schemas"]["MetricDirection"];
      /** Metric */
      metric: string;
      /** Threshold */
      threshold: number;
      /** Unit */
      unit: string;
    };
    /**
     * Health
     * @description Liveness for one surface. The same three fields from every surface, always.
     */
    Health: {
      /** Component */
      component: string;
      /**
       * Status
       * @default ok
       */
      status: string;
      /** Version */
      version: string;
    };
    /**
     * HubSubmissionRequest
     * @description A community submission referenced **only by Hub digest** (RM-P1-BENCH-10; bench.md §6).
     *
     *     ``hub_ref`` is a Hub reference — a ``name:version`` tag or a ``sha256:`` image-manifest digest —
     *     that Bench resolves from Hub, **verifies fail-closed** (content address, then cosign signature +
     *     SLSA provenance + SBOM — bench#29), whose Core plugin manifest is validated against the scenario
     *     interface, and which is then run under submit-policy-we-run **inside a sandbox** (bench#30). No
     *     policy bytes are uploaded: the artifact is authenticated by content hash and by signature.
     *
     *     ``method``/``author`` are display metadata only. There is deliberately **no ``identity``
     *     field**: the submitter's identity comes from the verified OIDC bearer token, and rate limits,
     *     quotas, job tickets, and audit records are all keyed on that (bench#29). The pre-bench#29 model
     *     carried a client-supplied ``identity`` that keyed the rate limiter — so a submitter could reset
     *     their own quota by editing a JSON field.
     */
    HubSubmissionRequest: {
      /** Author */
      author?: string | null;
      /** Hub Ref */
      hub_ref: string;
      /** Method */
      method?: string | null;
      /** Scenario Id */
      scenario_id: string;
    };
    /**
     * ImageRef
     * @description A digest-pinned OCI image reference (``repository@sha256:<hex>``).
     *
     *     ``repository`` is the image name (registry/namespace/name, without a tag or digest);
     *     ``digest`` is the ``sha256:<hex>`` content digest that pins the exact image; ``tag``
     *     is optional and *informational only* -- reproducibility rides on the digest, never on
     *     the tag.
     */
    ImageRef: {
      /** Digest */
      digest: string;
      /** Repository */
      repository: string;
      /** Tag */
      tag?: string | null;
    };
    /**
     * IntentDraft
     * @description The full richness captured by the no-LLM forms — a superset of what a Core
     *     ``ObjectiveSpec`` can hold. The optimization-relevant part (criteria + metric
     *     bindings) projects into an ``ObjectiveSpec``; the design-space inputs (asset
     *     inventory-or-budget, region) are Studio workspace state consumed by the trade-study
     *     engine (STUDIO-02).
     */
    IntentDraft: {
      /** Author */
      author: string;
      /** Budget */
      budget?: number | null;
      /** Constraints */
      constraints?: components["schemas"]["HardConstraint"][];
      /** Description */
      description?: string | null;
      /** Id */
      id: string;
      /** Inventory */
      inventory?: components["schemas"]["AssetSelection"][];
      /** Labels */
      labels?: {
        [key: string]: string;
      };
      /** Name */
      name: string;
      /** Products */
      products?: components["schemas"]["TargetProduct"][];
      region: components["schemas"]["GeoRegion"];
      /** Scenario Ref */
      scenario_ref?: string | null;
    };
    /**
     * JobRecord
     * @description The durable state of one candidate/seed evaluation.
     */
    JobRecord: {
      /** Cache Key */
      cache_key: string;
      /**
       * Cancel Requested
       * @default false
       */
      cancel_requested: boolean;
      /** Candidate Id */
      candidate_id: string;
      /** Error */
      error?: string | null;
      /** Job Id */
      job_id: string;
      /** Result Digest */
      result_digest?: string | null;
      /** Seed */
      seed: number;
      /** @default pending */
      status: components["schemas"]["JobStatus"];
    };
    /**
     * JobSpec
     * @description A containerized unit of work run identically by every backend.
     *
     *     ``image`` is the digest-pinned workload; ``command`` is the argv run inside it (or,
     *     for the local backend, on the workstation directly). ``inputs`` maps a run-relative
     *     name to a content address staged from the store; ``outputs`` lists the run-relative
     *     filenames captured back into the store. ``seed`` is exported as ``ASTRO_MINE_SEED``.
     */
    JobSpec: {
      /** Budget */
      budget?: number | null;
      checkpoint?: components["schemas"]["CheckpointPolicy"] | null;
      /** Command */
      command?: string[];
      /** Core Interface Version */
      core_interface_version?: string | null;
      /**
       * Distributed
       * @default false
       */
      distributed: boolean;
      /** Env */
      env?: {
        [key: string]: string;
      };
      image: components["schemas"]["ImageRef"];
      /** Inputs */
      inputs?: {
        [key: string]: string;
      };
      /** Outputs */
      outputs?: string[];
      /** Priority */
      priority?: number | null;
      resource_request?: components["schemas"]["ResourceRequest"] | null;
      /** Resources */
      resources?: {
        [key: string]: string;
      };
      /** Seed */
      seed?: number | null;
      /** Tenant */
      tenant?: string | null;
    };
    /**
     * JobStatus
     * @enum {string}
     */
    JobStatus: "pending" | "running" | "succeeded" | "failed" | "canceled";
    /**
     * LeaderboardEntry
     * @description One ranked row of a scenario leaderboard, ordered by the scenario's primary metric.
     */
    LeaderboardEntry: {
      /** Author */
      author: string | null;
      /**
       * Integrity
       * @enum {string}
       */
      integrity: "verified" | "flagged";
      /** Method */
      method: string | null;
      /** Primary Metric */
      primary_metric: string;
      /** Primary Unit */
      primary_unit: string;
      /** Primary Value */
      primary_value: number | null;
      /** Provenance Hash */
      provenance_hash?: string | null;
      /** Rank */
      rank: number;
      /** Source */
      source?: string | null;
      /** Submission Id */
      submission_id: string;
    };
    /**
     * MenuEntry
     * @description One selectable robot-menu row: an asset's identity + the Core capability tags it declares.
     *
     *     Projected from the Hub-indexed Core plugin manifest, so a Hub-published asset yields a row with
     *     no Studio edit. ``kind`` is the **vehicle** kind the menu groups by (rover/orbiter/…), carried
     *     on the manifest as ``attributes["asset_kind"]`` — never the plugin kind (always ``asset``).
     *     ``capability_tags`` are the Core-vocabulary strings; ``digest`` is the content address a preview
     *     pulls by.
     */
    MenuEntry: {
      /** Capability Tags */
      capability_tags: string[];
      /** Digest */
      digest: string;
      /** Kind */
      kind: string;
      /** Name */
      name: string;
      /** Namespace */
      namespace: string;
      /** Reference */
      reference: string;
      /** Version */
      version: string;
    };
    /**
     * MetricAggregation
     * @description How a metric's per-seed / per-episode values combine into one score
     *     (bench.md §3; scenario §13). Deterministic and content-addressed so a design-time
     *     score and an operational reading of the same objective are comparable (LUNAR-TR-006).
     * @enum {string}
     */
    MetricAggregation: "mean" | "median" | "min" | "max" | "sum" | "p05" | "p95";
    /**
     * MetricBinding
     * @description The objective->metric binding — the load-bearing contract.
     *
     *     Binds one success criterion to a Bench metric with an explicit, quantitative
     *     target and tolerance (acceptance: "binds each success criterion to a Bench metric
     *     with target + tolerance"). ``metric`` is the Bench metric key (resolved by Bench,
     *     not Core — Core owns the binding shape, not the metric registry).
     */
    MetricBinding: {
      /** @default mean */
      aggregation: components["schemas"]["MetricAggregation"];
      direction: components["schemas"]["MetricDirection"];
      evaluation_window?: components["schemas"]["EvaluationWindow"] | null;
      /** Metric */
      metric: string;
      /** Target */
      target: number;
      /** Threshold */
      threshold?: number | null;
      /** Tolerance */
      tolerance: number;
      /** Unit */
      unit: string;
    };
    /**
     * MetricDirection
     * @description Whether a higher or lower metric value is better (scenario §13 scoring).
     * @enum {string}
     */
    MetricDirection: "higher_better" | "lower_better";
    /**
     * MetricEstimate
     * @description One metric's score, and how well it is known.
     *
     *     ``uncertainty`` is ``None`` when the evaluation recorded no dispersion for this metric — a
     *     different statement from ``0.0``, and the UI must not conflate them.
     */
    MetricEstimate: {
      /** Uncertainty */
      uncertainty?: number | null;
      /** Value */
      value: number;
    };
    /**
     * MetricScore
     * @description One metric's aggregate on the held-out seeds — the transparent, per-metric record.
     */
    MetricScore: {
      /** Aggregation */
      aggregation: string;
      /** Direction */
      direction: string;
      /** Dispersion */
      dispersion: number | null;
      /** Metric */
      metric: string;
      /** N */
      n: number;
      /** Unit */
      unit: string;
      /** Value */
      value: number | null;
    };
    /**
     * MetricVocabulary
     * @description The declared metric vocabulary an objective's bindings are checked against.
     *
     *     ``metrics`` maps a Bench metric key to its expected SI unit; an empty string means
     *     the unit is unconstrained by the vocabulary. Built from a Bench ``metric`` plugin
     *     manifest (``from_manifest``) in production, or directly in tests/local use.
     */
    MetricVocabulary: {
      /** Metrics */
      metrics: {
        [key: string]: string;
      };
    };
    /**
     * ObjectiveDocument
     * @description Top-level objective document. ``objective_version`` pins the schema minor.
     */
    ObjectiveDocument: {
      objective: components["schemas"]["ObjectiveSpec"];
      /**
       * Objective Version
       * @constant
       */
      objective_version: "0.1";
    };
    /**
     * ObjectiveSpec
     * @description An objective: an identity plus its measurable success criteria.
     *
     *     Authored by Studio (optionally via human-reviewed LLM intent capture) and
     *     consumed by Bench/Ledger/Ops/View (core.md §3). ``scenario_ref`` is an optional
     *     content reference to the ScenarioSpec the objective is stated against.
     */
    ObjectiveSpec: {
      /** Description */
      description?: string | null;
      /** Id */
      id: string;
      /** Labels */
      labels?: {
        [key: string]: string;
      };
      /** Name */
      name: string;
      provenance?: components["schemas"]["Provenance"] | null;
      /** Scenario Ref */
      scenario_ref?: string | null;
      /** Success Criteria */
      success_criteria: components["schemas"]["SuccessCriterion"][];
    };
    /**
     * PlanetaryCRS
     * @description An explicit planetary coordinate reference system.
     *
     *     The minimum needed to reproject spatial data without guessing: the ``body``, its
     *     body-fixed ``body_fixed_frame``, and the PROJ planetary reference radius
     *     ``reference_radius_m`` (the PROJ ``+R``; the Moon is modelled as a sphere,
     *     R ≈ 1_737_400 m — ellipsoid ``+a``/``+b`` is deferred). ``projection`` carries an
     *     explicit PROJ/WKT/EPSG string for a *projected* CRS (e.g. lunar polar stereographic
     *     for the Shackleton DEM); ``None`` means body-fixed geographic (lat/lon on the
     *     datum). No field defaults to an Earth/WGS84 value — a CRS is explicit or it is
     *     rejected (RM-P0-WORLDS-01; conventions.md §5).
     */
    PlanetaryCRS: {
      /** Body */
      body: string;
      /** Body Fixed Frame */
      body_fixed_frame: string;
      /** Datum */
      datum?: string | null;
      /** Projection */
      projection?: string | null;
      /** Reference Radius M */
      reference_radius_m: number;
    };
    /**
     * Problem
     * @description The one error document every surface answers with (RFC 9457; api.md §4).
     *
     *     ``code`` identifies the failure and is the only member a client should switch on. ``detail`` is
     *     the message a person reads — **one string, always**, which is what lets a 422 render as words
     *     with no client-side flattening of an array.
     */
    Problem: {
      code: components["schemas"]["ErrorCode"];
      /** Detail */
      detail: string;
      /** Errors */
      errors?: components["schemas"]["FieldProblem"][];
      /** Status */
      status: number;
      /** Title */
      title: string;
    };
    /**
     * Provenance
     * @description Reproducibility provenance (conventions.md §5). Objectives are content-addressed
     *     so a design-time score and an operational reading reproduce (LUNAR-TR-006).
     */
    Provenance: {
      /** Code Version */
      code_version?: string | null;
      /** Env Lockfile */
      env_lockfile?: string | null;
      /** Input Hashes */
      input_hashes?: string[];
      /** Seed */
      seed?: number | null;
      /** Toolchain Version */
      toolchain_version?: string | null;
    };
    /**
     * ProvenanceBundle
     * @description Full lineage for a leaderboard entry, content-addressed and re-executable (bench.md §5).
     *
     *     :attr:`bundle_hash` is a deterministic ``sha256:`` over the reproducible fields only — the
     *     :class:`~astro_mine.bench.harness.EnvironmentStamp` is recorded for audit but excluded, so the
     *     same inputs reproduce the identical hash on any machine.
     */
    ProvenanceBundle: {
      /** Code Version */
      code_version: string;
      /** Content Hashes */
      content_hashes: {
        [key: string]: string;
      };
      /** Core Interface Version */
      core_interface_version: {
        [key: string]: string;
      };
      /** Core Schema Digest */
      core_schema_digest: string;
      environment: components["schemas"]["EnvironmentStamp"];
      /** Environment Lockfile */
      environment_lockfile: string;
      /** Per Seed */
      per_seed: components["schemas"]["SeedRecord"][];
      /** Scenario Id */
      scenario_id: string;
      /** Scenario Spec Hash */
      scenario_spec_hash: string;
      /** Scorecard Hash */
      scorecard_hash: string;
      /** Seeds */
      seeds: number[];
      /** Source */
      source: string;
      /** Source Digest */
      source_digest?: string | null;
    };
    /**
     * PublishBody
     * @description Index a Core plugin manifest for an already-stored artifact.
     */
    PublishBody: {
      /** Digest */
      digest: string;
      /** Manifest */
      manifest: {
        [key: string]: unknown;
      };
      /**
       * Namespace
       * @default open
       */
      namespace: string;
      /** Publisher */
      publisher: string;
    };
    /**
     * PublishCampaignRequest
     * @description Publish a campaign. Provide a fully-formed ``campaign``, **or** the authoring-journey form —
     *     a ``chosen`` evaluated candidate + its ``objective`` (+ optional ``phases``) — which the route
     *     authors into a ``Campaign`` server-side (proper lineage via :func:`author_campaign`) before
     *     freezing and publishing. Either shape, one route, zero new endpoints.
     */
    PublishCampaignRequest: {
      campaign?: components["schemas"]["Campaign"] | null;
      chosen?: components["schemas"]["EvaluatedCandidate"] | null;
      /** Name */
      name: string;
      objective?: components["schemas"]["ObjectiveDocument"] | null;
      /** Phases */
      phases?: components["schemas"]["CampaignPhase"][];
      /** Version */
      version: string;
      /** World Ref */
      world_ref?: string | null;
    };
    /**
     * PublishedArtifactRef
     * @description Where a published artifact lives, and what it is.
     *
     *     ``digest`` is the OCI image-manifest digest — the artifact's identity in Hub, and the handle a
     *     consumer (Ops, a colleague) pulls it back by. ``content_digest`` is the hash of the *payload*
     *     bytes, i.e. the frozen bundle's own content address. They differ because the former also covers
     *     the manifest and the layer descriptors.
     */
    PublishedArtifactRef: {
      /** Content Digest */
      content_digest: string;
      /** Digest */
      digest: string;
      /** Kind */
      kind: string;
      /** Reference */
      reference: string;
    };
    /**
     * ResolveBody
     * @description A resolution constraint set.
     */
    ResolveBody: {
      /** Capability Tags */
      capability_tags?: string[];
      /** Interfaces */
      interfaces?: {
        [key: string]: string;
      } | null;
      /** Name */
      name: string;
      /**
       * Version Spec
       * @default
       */
      version_spec: string;
    };
    /**
     * ResolveResult
     * @description The one immutable artifact a name and version spec resolve to.
     */
    ResolveResult: {
      /** Digest */
      digest: string;
      /** Reference */
      reference: string;
      /** Version */
      version: string;
    };
    /**
     * ResourceRequest
     * @description A pod's compute request: CPU / memory / whole GPUs or a MIG slice.
     *
     *     Compiles to a Kubernetes ``resources`` block via :meth:`to_k8s_resources`. A **MIG
     *     slice** (``mig_profile``) and **whole GPUs** (``gpu``) are mutually exclusive -- a job
     *     that fits on a 10 GB slice must not also strand a whole card (``cloud.md`` §7, §8). GPU
     *     resources are extended resources, so requests are pinned equal to limits.
     */
    ResourceRequest: {
      /** Cpu */
      cpu?: string | null;
      /**
       * Gpu
       * @default 0
       */
      gpu: number;
      /** Memory */
      memory?: string | null;
      /** Mig Profile */
      mig_profile?: string | null;
    };
    /**
     * RunContext
     * @description The reproducibility envelope attached to a run.
     *
     *     ``source_content_hashes``, ``code_version``, ``env_lockfile`` and ``seed`` are the
     *     ``conventions.md`` §5 minimum; the remaining fields are reserved for downstream
     *     Cloud work and default to empty/``None`` so populating them needs no schema bump.
     */
    RunContext: {
      /** Code Version */
      code_version?: string;
      /** Core Interface Version */
      core_interface_version?: string | null;
      /** Env Lockfile */
      env_lockfile?: string | null;
      environment?: components["schemas"]["EnvironmentFingerprint"];
      /** Image Digest */
      image_digest?: string | null;
      /** Outputs */
      outputs?: {
        [key: string]: string;
      };
      /** Run Id */
      run_id?: string | null;
      /**
       * Schema Version
       * @default 0.1
       * @constant
       */
      schema_version: "0.1";
      /** Seed */
      seed?: number | null;
      /** Source Content Hashes */
      source_content_hashes?: {
        [key: string]: string;
      };
    };
    /**
     * RunResult
     * @description The outcome of a :func:`~astro_mine.cloud.submission.submit` call.
     */
    RunResult: {
      /** Exit Code */
      exit_code: number;
      /** Outputs */
      outputs?: {
        [key: string]: string;
      };
      run_context: components["schemas"]["RunContext"];
      /** Run Context Address */
      run_context_address: string;
      /**
       * Status
       * @enum {string}
       */
      status: "succeeded" | "failed";
    };
    /**
     * SearchHit
     * @description One catalog entry as the API projects it — the shape ``_hit`` builds.
     *
     *     This is a *projection* of :class:`~astro_mine.hub.index.CatalogEntry`, not a copy of it: the
     *     route already chose these twelve fields, and declaring them makes the choice legible to a
     *     generated client instead of leaving it as an untyped object the client types as ``unknown``.
     *     The catalog record itself is not here — it is large, and only the detail route returns it.
     */
    SearchHit: {
      /** Artifact Kind */
      artifact_kind?: string | null;
      /**
       * Deprecated
       * @default false
       */
      deprecated: boolean;
      /** Digest */
      digest: string;
      /** Kind */
      kind?: string | null;
      /** License */
      license?: string | null;
      /** Name */
      name: string;
      /** Namespace */
      namespace?: string | null;
      /** Publisher */
      publisher?: string | null;
      /** Reference */
      reference: string;
      /** Score */
      score: number;
      /** Version */
      version: string;
      /**
       * Yanked
       * @default false
       */
      yanked: boolean;
    };
    /**
     * SeedRecord
     * @description One held-out seed's scored values — the unit the re-execution audit compares.
     */
    SeedRecord: {
      /** Metrics */
      metrics: {
        [key: string]: number | null;
      };
      /** Seed */
      seed: number;
    };
    /** StudyRequest */
    StudyRequest: {
      /** Candidates */
      candidates: components["schemas"]["DesignCandidate"][];
      /**
       * Max Steps
       * @default 8
       */
      max_steps: number;
      objective: components["schemas"]["ObjectiveDocument"];
      /** Seeds */
      seeds?: number[];
    };
    /** StudyResponse */
    StudyResponse: {
      /** Jobs */
      jobs: components["schemas"]["JobRecord"][];
      study?: components["schemas"]["TradeStudy"] | null;
    };
    /**
     * Submission
     * @description A content-addressed leaderboard record: the held-out scorecard + its integrity verdict.
     *
     *     ``submission_id`` is the ``sha256:`` digest of ``(scenario_id, policy_ref, scorecard_hash)``,
     *     so re-submitting an identical policy is idempotent and a result is reproducible from its
     *     provenance (conventions.md §5). ``integrity`` is the sampled-re-execution verdict (bench.md §9).
     */
    Submission: {
      /** Author */
      author: string | null;
      /**
       * Integrity
       * @enum {string}
       */
      integrity: "verified" | "flagged";
      /** Method */
      method: string | null;
      /** Policy Ref */
      policy_ref: string;
      /** Provenance Hash */
      provenance_hash?: string | null;
      /** Runner */
      runner: string;
      /** Scenario Id */
      scenario_id: string;
      /** Scorecard Hash */
      scorecard_hash: string;
      /** Scores */
      scores: components["schemas"]["MetricScore"][];
      /** Source */
      source?: string | null;
      /** Submission Id */
      submission_id: string;
      /** Trace Hash */
      trace_hash?: string | null;
    };
    /**
     * SubmissionRequest
     * @description A leaderboard submission: which scenario, and the policy to run (submit-policy-we-run).
     *
     *     ``policy_ref`` is a ``"module:attribute"`` reference the server runs on the scenario's held-out
     *     seeds. It is **untrusted code**: since bench#30 the server does *not* import it — the reference
     *     is shape-checked at the edge and resolved (imported) only inside the sandboxed eval worker,
     *     out-of-process, with no network egress and hard CPU/memory/time caps (bench.md §9). The caller
     *     must present a valid OIDC bearer token (bench#29).
     */
    SubmissionRequest: {
      /** Author */
      author?: string | null;
      /** Method */
      method?: string | null;
      /** Policy Ref */
      policy_ref: string;
      /** Scenario Id */
      scenario_id: string;
    };
    /**
     * SubmissionStatus
     * @description The lifecycle of a hosted submission (bench.md §7).
     *
     *     ``QUEUED`` accepted and awaiting a worker; ``RUNNING`` resolving + executing under
     *     submit-policy-we-run; ``SCORED`` scored on the held-out seeds; ``RANKED`` verified and placed
     *     on the board; ``FLAGGED`` an integrity failure (provenance re-execution mismatch); ``REJECTED``
     *     never ran (bad digest, manifest/interface mismatch, or a rate-limit refusal).
     * @enum {string}
     */
    SubmissionStatus: "queued" | "running" | "scored" | "ranked" | "flagged" | "rejected";
    /**
     * SuccessCriterion
     * @description One measurable criterion of an objective, bound to a metric.
     *
     *     ``required`` distinguishes a must-meet criterion from a soft/stretch goal;
     *     ``weight`` supports scalarization in Studio's multi-objective trade-study engine
     *     (scenario §8.3, LUNAR-FR-010) — optimization lives above Core, this only carries
     *     the weight. ``deadline_s`` is an optional achieve-by deadline in SI seconds of
     *     episode/sim time (``sim_time_s`` elsewhere); mission-epoch-relative deadlines are
     *     the Mission/Phase model's job (RFC-0001, reserved P1).
     */
    SuccessCriterion: {
      binding: components["schemas"]["MetricBinding"];
      /** Deadline S */
      deadline_s?: number | null;
      /** Description */
      description?: string | null;
      /** Id */
      id: string;
      /**
       * Required
       * @default true
       */
      required: boolean;
      /** Weight */
      weight?: number | null;
    };
    /**
     * SweepExpansion
     * @description A sweep's deterministic expansion into concrete jobs.
     *
     *     Unlike the three ``compile`` routes below, this shape belongs to Astro-Mine rather than to an
     *     execution engine, so it is declared rather than left open.
     */
    SweepExpansion: {
      /** Jobs */
      jobs: components["schemas"]["JobSpec"][];
      /** Size */
      size: number;
    };
    /**
     * SweepSpec
     * @description A base JobSpec plus a parameter space that expands to concrete JobSpecs.
     */
    SweepSpec: {
      base: components["schemas"]["JobSpec"];
      /** Grid */
      grid?: {
        [key: string]: (number | string | boolean)[];
      };
      /** Max Parallel */
      max_parallel?: number | null;
      /**
       * Method
       * @default grid
       * @enum {string}
       */
      method: "grid" | "random" | "halton";
      /** Ranges */
      ranges?: {
        [key: string]: [number, number];
      };
      /** Samples */
      samples?: number | null;
      /**
       * Seed
       * @default 0
       */
      seed: number;
    };
    /**
     * TargetProduct
     * @description A "produce X of product at rate R" objective → a soft, weighted success
     *     criterion bound to a Bench metric with target + tolerance. ``rate_window_s`` set
     *     means a sustained-rate objective ("10 t per lunar day") → a rolling window.
     */
    TargetProduct: {
      /** Criterion Id */
      criterion_id: string;
      /** @default higher_better */
      direction: components["schemas"]["MetricDirection"];
      /** Metric */
      metric: string;
      /** Rate Window S */
      rate_window_s?: number | null;
      /** Target */
      target: number;
      /** Tolerance */
      tolerance: number;
      /** Unit */
      unit: string;
      /** Weight */
      weight?: number | null;
    };
    /**
     * TradeStudy
     * @description A reproducible design-space exploration: the evaluated candidates and the
     *     Pareto-ranked front they yield, plus the provenance to reproduce the front exactly
     *     (studio.md §3 ``TradeStudy``).
     */
    TradeStudy: {
      /** Backend */
      backend: string;
      /** Evaluated */
      evaluated: components["schemas"]["EvaluatedCandidate"][];
      /** Evaluator */
      evaluator: string;
      /** Id */
      id: string;
      /** Objective Hash */
      objective_hash: string;
      /** Pareto Front */
      pareto_front: string[];
      provenance: components["schemas"]["ArtifactProvenance"];
      /** Seeds */
      seeds: number[];
    };
    /**
     * ViewLeaderboard
     * @description A scenario's leaderboard as View consumes it: the primary metric + full-metric rows.
     */
    ViewLeaderboard: {
      /** Primary Metric */
      primary_metric: string | null;
      /** Rows */
      rows: components["schemas"]["ViewLeaderboardRow"][];
      /** Scenario Id */
      scenario_id: string;
    };
    /**
     * ViewLeaderboardRow
     * @description One ranked row carrying its **full** per-metric scorecard — the shape View renders.
     *
     *     Unlike :class:`~astro_mine.bench.leaderboard.LeaderboardEntry` (primary metric only), ``scores``
     *     holds every scored metric with its ``value``, ``direction``, and ``dispersion`` (the cross-seed
     *     uncertainty View shows as a bound). ``trace_hash`` is the stored MCAP replay's digest (``None``
     *     when no replay is attached), so View knows whether an episode replay is available.
     *
     *     ``runner`` is the identity of the runner that produced the scorecard (``"fixture/0.1.0"`` for
     *     the reference fixture, else a Sim runner's id). View **must** render it in the ranking row: a
     *     fixture-scored entry has to *look* fixture-scored, not merely carry a footnote (G1.1's lesson
     *     applied to pixels — gap report §8.2.6). Surfacing it here is what lets a leaderboard tell a
     *     simulated result from a fixture one by provenance rather than by value (G1.8).
     */
    ViewLeaderboardRow: {
      /** Author */
      author: string | null;
      /**
       * Integrity
       * @enum {string}
       */
      integrity: "verified" | "flagged";
      /** Method */
      method: string | null;
      /** Provenance Hash */
      provenance_hash: string | null;
      /** Rank */
      rank: number;
      /** Runner */
      runner: string;
      /** Scores */
      scores: components["schemas"]["MetricScore"][];
      /** Source */
      source: string | null;
      /** Submission Id */
      submission_id: string;
      /** Trace Hash */
      trace_hash: string | null;
    };
    /**
     * ViewReplay
     * @description A decoded replay manifest for a Sim MCAP episode — the metadata View needs to render it.
     *
     *     ``mcap_digest``/``size_bytes`` address the replay payload (the MCAP bytes View plays);
     *     ``frame_count`` is the number of distinct sim ticks, ``observation_count`` the per-agent
     *     observations flattened across them; ``agents`` the distinct agents; ``sim_time_start_s`` /
     *     ``sim_time_end_s`` the episode's sim-time span. ``seed`` + ``content_hash`` come from the
     *     recording's provenance envelope, tying the replay back to its scored run.
     */
    ViewReplay: {
      /** Agents */
      agents: string[];
      /** Content Hash */
      content_hash: string;
      /** Frame Count */
      frame_count: number;
      /** Mcap Digest */
      mcap_digest: string;
      /** Observation Count */
      observation_count: number;
      /** Scenario Id */
      scenario_id: string;
      /** Seed */
      seed: number | null;
      /** Sim Time End S */
      sim_time_end_s: number | null;
      /** Sim Time Start S */
      sim_time_start_s: number | null;
      /** Size Bytes */
      size_bytes: number;
      /** Submission Id */
      submission_id: string | null;
    };
    /**
     * WindowKind
     * @description How a metric binding is evaluated over time (the ``evaluation_window`` kind).
     *
     *     - ``cumulative`` — over the whole episode/campaign (the default if no window is set);
     *     - ``rolling`` — over a rolling window of ``duration_s`` (rate / sustained objectives,
     *       e.g. "10 t per lunar day");
     *     - ``per_phase`` — once per mission Phase (meaningful only for multi-phase Missions;
     *       RFC-0001, reserved P1).
     *
     *     A ``rolling`` window requires ``duration_s``; ``cumulative``/``per_phase`` forbid it
     *     (enforced in the loader).
     * @enum {string}
     */
    WindowKind: "cumulative" | "rolling" | "per_phase";
    /**
     * WorkflowSpec
     * @description A DAG of JobSpecs -- validated acyclic, with a deterministic topological order.
     */
    WorkflowSpec: {
      /** Name */
      name: string;
      /** Steps */
      steps: components["schemas"]["WorkflowStep"][];
    };
    /**
     * WorkflowStep
     * @description One node in a :class:`WorkflowSpec`: a named JobSpec and its upstream dependencies.
     */
    WorkflowStep: {
      /** Depends On */
      depends_on?: string[];
      job: components["schemas"]["JobSpec"];
      /** Name */
      name: string;
    };
    /**
     * WorldEntry
     * @description One selectable world-menu row: a published world bundle's identity and the body it models.
     *
     *     The counterpart of :class:`MenuEntry` for ``PluginKind.WORLD_PROVIDER`` artifacts. Terrain used
     *     to be reachable only by hand-editing a ``?world=`` query parameter, which no part of the UI
     *     offered or documented, so ``UC-F5`` had no front door at all.
     *
     *     ``body`` is carried on the manifest as ``attributes["body"]`` where the producer stamps it; it
     *     lets a surface narrow the menu to worlds applicable to a study's own ``GeoRegion``.
     */
    WorldEntry: {
      /** Body */
      body?: string | null;
      /** Digest */
      digest: string;
      /** Name */
      name: string;
      /** Namespace */
      namespace: string;
      /** Reference */
      reference: string;
      /** Version */
      version: string;
    };
    /**
     * WorldResponse
     * @description A world Studio pulled from Hub by digest and is now serving to the embedded View.
     */
    WorldResponse: {
      /** Digest */
      digest: string;
      /** Manifest Url */
      manifest_url: string;
      /** Reference */
      reference: string;
      site?: components["schemas"]["WorldSite"] | null;
      /** World Id */
      world_id: string;
    };
    /**
     * WorldSite
     * @description Where on a world a design-time swarm is laid out: the bundle's own tileset anchor.
     *
     *     Read straight out of the verified bundle's ``world.json`` (``crs`` + ``tiles_anchor``), never
     *     chosen by Studio — a design has no run, so it has no simulated poses, and inventing coordinates
     *     silently is exactly what `studio.md` §2 principle 7 forbids. The anchor is the one position in a
     *     world bundle that means "here is where this terrain is", so a layout centred on it is the one
     *     convention that needs no new authored input (studio#50).
     *
     *     ``None`` on the response when the bundle predates the published anchor: the swarm then cannot be
     *     placed, and the surface says so rather than guessing.
     */
    WorldSite: {
      /** Body */
      body: string;
      /** Frame */
      frame: string;
      /** Height M */
      height_m: number;
      /** Latitude Deg */
      latitude_deg: number;
      /** Longitude Deg */
      longitude_deg: number;
      /** Reference Radius M */
      reference_radius_m: number;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  bench_audit_trail: {
    parameters: {
      query?: {
        action?: string | null;
        decision?: components["schemas"]["AuditDecision"] | null;
        limit?: number;
        resource?: string | null;
        subject?: string | null;
        submission_id?: string | null;
      };
      header?: {
        authorization?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AuditEvent"][];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_healthz: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_get_job: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        job_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BenchJobRecord"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_leaderboard: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        scenario_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LeaderboardEntry"][];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_leaderboard_scorecards: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        scenario_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ViewLeaderboard"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_prometheus_metrics: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Prometheus exposition format. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "text/plain": string;
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_list_scenarios: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": string[];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_author_scenario: {
    parameters: {
      query?: never;
      header?: {
        authorization?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string;
          };
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_submit: {
    parameters: {
      query?: never;
      header?: {
        authorization?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SubmissionRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Submission"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_get_submission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        submission_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Submission"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_retract_submission: {
    parameters: {
      query?: never;
      header?: {
        authorization?: string | null;
      };
      path: {
        submission_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Submission"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_get_provenance: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        submission_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProvenanceBundle"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_get_replay: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        submission_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The MCAP episode log. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/octet-stream": string;
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_get_replay_manifest: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        submission_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ViewReplay"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  bench_submit_hub: {
    parameters: {
      query?: never;
      header?: {
        authorization?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["HubSubmissionRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BenchJobRecord"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_backends: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string[];
          };
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_healthz: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_submit_job: {
    parameters: {
      query?: {
        backend?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["JobSpec"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RunResult"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_compile_job: {
    parameters: {
      query?: {
        engine?: string | null;
        namespace?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["JobSpec"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: unknown;
          };
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_compile_sweep: {
    parameters: {
      query?: {
        namespace?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SweepSpec"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: unknown;
          };
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_expand_sweep: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SweepSpec"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SweepExpansion"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  cloud_compile_workflow: {
    parameters: {
      query?: {
        namespace?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["WorkflowSpec"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: unknown;
          };
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  healthz: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DeploymentHealth"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_get_artifact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        name: string;
        version: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArtifactDetail"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_download: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        name: string;
        version: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["DownloadBody"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DownloadGrant"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_health: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          /** @description Always `true`. This endpoint is deprecated. */
          Deprecation?: string;
          /** @description The successor: `</hub/healthz>; rel="successor-version"`. */
          Link?: string;
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_healthz: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_publish: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PublishBody"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchHit"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_resolve: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ResolveBody"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResolveResult"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  hub_search: {
    parameters: {
      query?: {
        artifact_kind?: string | null;
        kind?: string | null;
        license?: string | null;
        limit?: number;
        namespace?: string | null;
        semantic?: string | null;
        text?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchHit"][];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_pull_campaign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        reference: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Campaign"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_publish_campaign: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PublishCampaignRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PublishedArtifactRef"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_list_catalog: {
    parameters: {
      query?: {
        requires?: string[];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MenuEntry"][];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_preview_asset: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        reference: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AssetPreviewResponse"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_list_worlds: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WorldEntry"][];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_healthz: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_capture_intent: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CaptureRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CapturedObjective"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_run_study: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["StudyRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StudyResponse"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_comparison: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TradeStudy"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComparisonView"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  studio_resolve_world: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        reference: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WorldResponse"];
        };
      };
      /** @description The request did not validate; `errors` carries the field-level detail. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
      /** @description A problem document. Branch on `code`. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
}
