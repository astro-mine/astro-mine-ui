// What identifies an artifact, and how a page addresses one (ui#10; hub.md §2 principle 1).
//
// **The digest is the identity; a reference is a query.** `name:version` resolves to one immutable
// digest today and may resolve to a different one tomorrow, because a tag is a mutable pointer.
// That is honesty rule 4, and it is the reason this module exists rather than each page formatting
// a reference however it happens to have one to hand.
//
// The routes are keyed on `name` and `version` rather than on the digest, and that is not a
// contradiction. `GET /hub/artifacts/{name}/{version}` is the route the API serves — there is no
// by-digest read — so the *address* is a query and the *page* leads with what the query resolved
// to. A reader who wants to pin something copies the digest off the page, which is why it is
// rendered in full there rather than abbreviated.

import type { SearchHit } from "./types";

/** The route for one artifact, addressed the way the API addresses it. */
export function artifactHref(hit: Pick<SearchHit, "name" | "version">): string {
  const params = new URLSearchParams({ name: hit.name, version: hit.version });
  return `/registry/artifact?${params.toString()}`;
}

/**
 * `namespace/name:version`, or `name:version` when the catalog gave no namespace.
 *
 * The API already sends a `reference` and this does **not** replace it — `reference` is what the
 * server calls the artifact and is what gets displayed. This exists for the places a page has only
 * the parts, chiefly a form the reader is filling in.
 */
export function referenceOf(hit: Pick<SearchHit, "name" | "version" | "namespace">): string {
  const qualified = hit.namespace == null ? hit.name : `${hit.namespace}/${hit.name}`;
  return `${qualified}:${hit.version}`;
}

/**
 * The state a catalog entry is in, as a phrase, or `null` when it is in none.
 *
 * `yanked` and `deprecated` are separate flags and can both be set. They are not interchangeable:
 * a deprecated artifact still resolves and still runs, and a yanked one is being withdrawn — so a
 * reader deciding whether to depend on it needs to be told which, in the row, rather than seeing
 * one warning colour for both.
 */
export function stateOf(hit: Pick<SearchHit, "yanked" | "deprecated">): string | null {
  if (hit.yanked === true && hit.deprecated === true) return "yanked · deprecated";
  if (hit.yanked === true) return "yanked";
  if (hit.deprecated === true) return "deprecated";
  return null;
}
