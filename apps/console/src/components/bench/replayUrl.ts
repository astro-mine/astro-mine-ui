// Where the episode bytes are (ui#13).
//
// **Why a URL and not a client call.** Every other read on these pages goes through the generated
// client, and this one deliberately does not: `openReplay({ url, digest })` in `@astro-mine/view`
// fetches the recording *and verifies its content hash before handing a single byte to the MCAP
// decoder* (`mcapSource.resolveReadable` — it hashes the bytes, compares, and throws rather than
// returning a readable on a mismatch). That ordering is ui#13's acceptance criterion, and the
// client's blob path cannot provide it: `openReplay({ blob })` has no digest to check against and
// returns `digest: null`.
//
// The choice is therefore between re-implementing verification here or letting the library do the
// thing it already does correctly. It is the second.
//
// **The path still comes from the contract.** `OPERATIONS` is the generated operation table, and
// `@astro-mine/api-client` exports it for exactly this — "for anything that needs to reason about
// the surface rather than call it". So the route is not a string in a page: change the path in the
// API, regenerate, and this follows. What is hand-written here is one `${base}${path}` join.

import { OPERATIONS } from "@astro-mine/api-client";

/**
 * The absolute URL of a submission's MCAP recording.
 *
 * `encodeURIComponent` on the id for the same reason `createRequest` does it: a submission id is a
 * `sha256:…` digest, and the colon must survive as one path segment.
 */
export function replayUrl(baseUrl: string, submissionId: string): string {
  const path = OPERATIONS.benchGetReplay.path.replace(
    "{submission_id}",
    encodeURIComponent(submissionId),
  );
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}
