// The Cloud shapes these pages read, named once (ui#19).
//
// Aliases of the generated types, never copies — `conventions.md` §3.1 and the workspace gate.
//
// **Note what is missing.** There is no `CompiledJob` or `CompiledSweep` here, because the API
// declares none: `cloud_compile_job`, `cloud_compile_sweep` and `cloud_compile_workflow` answer
// `additionalProperties: true` with no schema. Inventing a local type for them would be exactly the
// hand-written mirror the workspace gate exists to forbid — and it would be a mirror of nothing.

import type { components } from "@astro-mine/api-client";

/** One job: an image, a command, and what it needs. */
export type JobSpec = components["schemas"]["JobSpec"];

/** A base job plus the grid or ranges to vary it over. */
export type SweepSpec = components["schemas"]["SweepSpec"];

/** What a sweep becomes — the one compile-adjacent route that IS typed. */
export type SweepExpansion = components["schemas"]["SweepExpansion"];

/** What a submission produced. */
export type RunResult = components["schemas"]["RunResult"];
