// @astro-mine/api-client — the generated client for astro-mine-api (ui#2).
//
// **The OpenAPI document is the contract** (ui.md §9). Everything under `generated/` is written by
// `pnpm codegen:api` from `openapi/openapi.json` — a vendored, byte-identical copy of the document
// astro-mine-api commits and gates. Two CI lanes hold that in place: one regenerates and fails on
// any diff, the other compares the vendored document to astro-mine-api at HEAD. Hand-editing the
// generated output is a red build, not a review comment (ui.md §10.6).
//
// What this package is: types, one method per operation id, and a thin request layer over `fetch`.
// What it is not: a cache, a retry policy, a poller, an interceptor stack, or a React binding. The
// first four are deferred until a page needs one, as a documented change rather than an import
// (conventions.md §2.1). The fifth would make this package know about the application; it is a
// leaf in the layering graph and stays one (ui.md §3).
//
// Typical use:
//
//     const state = await loadRuntimeConfig();
//     if (state.status !== "configured") return <DegradedState {...state} />;
//     const api = createApiClient({ baseUrl: state.config.apiBaseUrl });
//     const results = await api.hubSearch({ query: { q: "shackleton" } }, { signal });
//
// A call resolves with the success body and throws on anything else — `ApiProblemError` carrying
// the machine-readable `code`, or `ApiTransportError` when no usable response arrived.
//
// This package is a leaf: it must not import any sibling.

import { createOperations, type ApiOperations } from "./generated/operations.gen.js";
import { createRequest, type ApiClientConfig } from "./request.js";

/**
 * The client: every operation the API serves, bound to one endpoint.
 *
 * A plain object of functions. There is no class to extend and no instance state beyond the base
 * URL and the `fetch` it was given, so a test can build one per case and a page can hold one for
 * the life of the application without either arrangement being wrong.
 */
export function createApiClient(config: ApiClientConfig): ApiOperations {
  return createOperations(createRequest(config));
}

export type { ApiClientConfig, CallOptions, RequestArgs, RequestFn } from "./request.js";

// The error contract (api.md §4). `code` is the only member a page may branch on.
export {
  ApiError,
  ApiProblemError,
  ApiTransportError,
  hasErrorCode,
  isAbortError,
  isApiProblem,
  isProblemDocument,
} from "./errors.js";
export type { ApiProblem, ErrorCode, FieldProblem } from "./errors.js";

// Runtime configuration. A missing endpoint is a state, not an exception.
export { loadRuntimeConfig, RUNTIME_CONFIG_PATH } from "./config.js";
export type { RuntimeConfig, RuntimeConfigState } from "./config.js";

// The operation table, for anything that needs to reason about the surface rather than call it.
export { OPERATIONS } from "./generated/manifest.gen.js";
export type { OperationName, OperationSpec } from "./generated/manifest.gen.js";

/**
 * Every request, response and component type in the document.
 *
 * Re-exported so a page names an API shape by reaching into the generated types rather than
 * declaring its own copy — the mirrored `types.ts` this package exists to delete. A page writes
 * `components["schemas"]["ArtifactDetail"]`, or the generated `HubGetArtifactResult`, and never an
 * interface of its own.
 */
export type { components, operations, paths } from "./generated/schema.gen.js";

// `ApiOperations` and the per-operation argument and result types, named after their operation ids.
export type * from "./generated/operations.gen.js";
