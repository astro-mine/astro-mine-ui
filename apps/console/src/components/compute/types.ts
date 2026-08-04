// The Cloud shapes these pages read, named once (ui#19).
//
// Aliases of the generated types, never copies — `conventions.md` §3.1 and the workspace gate.
//
// **`CompiledManifest` arrived with astro-mine-api#12.** The three compile routes used to answer
// `additionalProperties: true` with no schema, so this file deliberately declared nothing for them
// and the preview rendered a document. They now answer one declared shape — the routes produce
// four different Kubernetes objects but one envelope, differing only in `kind` and the contents of
// `spec`. `spec` stays open on purpose: it is Kubernetes', KubeRay's and Argo's schema, not this
// platform's, and declaring somebody else's contract is the mistake the old note was guarding
// against.

import type { components } from "@astro-mine/api-client";

/** One job: an image, a command, and what it needs. */
export type JobSpec = components["schemas"]["JobSpec"];

/** A base job plus the grid or ranges to vary it over. */
export type SweepSpec = components["schemas"]["SweepSpec"];

/** What a sweep becomes — the one compile-adjacent route that IS typed. */
export type SweepExpansion = components["schemas"]["SweepExpansion"];

/** What a submission produced. */
export type RunResult = components["schemas"]["RunResult"];

/** What a job, sweep or workflow compiles to: a Kubernetes object with an open `spec`. */
export type CompiledManifest = components["schemas"]["CompiledManifest"];
