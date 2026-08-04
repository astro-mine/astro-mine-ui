// The benchmark shapes these pages read, named once (ui#12, ui#13, ui#14).
//
// Aliases of the generated types, never copies — `conventions.md` §3.1, and the workspace gate that
// enforces it. What this adds is a name a prop can be annotated with; it adds nothing else, and
// changing the document changes these or fails to compile.

import type { components } from "@astro-mine/api-client";

/** A whole leaderboard: the scenario, the primary metric, and the ranked rows. */
export type ViewLeaderboard = components["schemas"]["ViewLeaderboard"];

/** One ranked row, carrying its full per-metric scorecard. */
export type ViewLeaderboardRow = components["schemas"]["ViewLeaderboardRow"];

/** One metric's aggregate on the held-out seeds. */
export type MetricScore = components["schemas"]["MetricScore"];

/** One submission's record: the held-out scorecard plus its integrity verdict. */
export type Submission = components["schemas"]["Submission"];

/** The lineage a leaderboard entry is byte-for-byte reproducible from. */
export type ProvenanceBundle = components["schemas"]["ProvenanceBundle"];

/** What is known about a stored episode replay. */
export type ViewReplay = components["schemas"]["ViewReplay"];

/** One entry in the steward's audit trail. */
export type AuditEvent = components["schemas"]["AuditEvent"];

/** An evaluation job's status record. */
export type BenchJobRecord = components["schemas"]["BenchJobRecord"];
