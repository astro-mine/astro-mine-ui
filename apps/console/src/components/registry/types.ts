// The registry shapes these pages read, named once (ui#10).
//
// **Aliases of the generated types, never copies of them.** `conventions.md` §3.1 and this
// workspace's own gate (`scripts/check-no-handwritten-api-types.mjs`) both say the same thing: the
// API publishes these shapes and the front end consumes them. What this file adds is a *name* — so
// a component prop reads `hit: SearchHit` rather than
// `hit: components["schemas"]["SearchHit"]` twelve times — and it adds nothing else. Change the
// document and these change with it, or fail to compile.

import type { components } from "@astro-mine/api-client";

/** One catalog entry, as `GET /hub/search` projects it. */
export type SearchHit = components["schemas"]["SearchHit"];

/** One artifact in full, as `GET /hub/artifacts/{name}/{version}` serves it. */
export type ArtifactDetail = components["schemas"]["ArtifactDetail"];
