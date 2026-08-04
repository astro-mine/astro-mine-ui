// Registry fixtures (ui#10).
//
// **Typed against the generated schema, so they cannot drift.** The reply a handler is given is
// checked against the document's own response type (`@astro-mine/api-client/testing`), which means
// a fixture that stops matching the API fails to compile rather than passing here and failing in a
// browser. These are annotated explicitly for the same reason a page annotates its props: so the
// error lands on the fixture rather than three frames away at the call site.

import type { ArtifactDetail, SearchHit } from "@/components/registry/types";

/** A 71-character `sha256:…`, so the abbreviation in a row is genuinely an abbreviation. */
export const digestFor = (seed: string): string => `sha256:${seed.repeat(64).slice(0, 64)}`;

/** Fill in `reference` from the parts, unless the caller pinned one explicitly. */
function withReference<T extends { name: string; version: string; namespace?: string | null }>(
  built: T,
  over: { reference?: string },
): T & { reference: string } {
  return { ...built, reference: over.reference ?? referenceFor(built) };
}

/**
 * `namespace/name:version` — derived, so a fixture that changes the name changes what the row
 * shows. Overriding `name` alone and leaving `reference` fixed produced a row displaying the old
 * reference, and a test asserting on the new name that could never pass.
 */
const referenceFor = (h: { namespace?: string | null; name: string; version: string }) =>
  `${h.namespace == null ? "" : `${h.namespace}/`}${h.name}:${h.version}`;

export const hit = (over: Partial<SearchHit> = {}): SearchHit =>
  withReference(
    {
      name: "shackleton-rim",
      namespace: "commons",
      version: "0.5.0",
      digest: digestFor("a"),
      kind: "world_provider",
      artifact_kind: "world",
      publisher: "astro-mine",
      license: "Apache-2.0",
      yanked: false,
      deprecated: false,
      score: 0.98,
      ...over,
    },
    over,
  );

export const detail = (over: Partial<ArtifactDetail> = {}): ArtifactDetail =>
  withReference(
    {
      name: "shackleton-rim",
      namespace: "commons",
      version: "0.5.0",
      digest: digestFor("a"),
      kind: "world_provider",
      artifact_kind: "world",
      publisher: "astro-mine",
      license: "Apache-2.0",
      yanked: false,
      deprecated: false,
      score: 1,
      attestations: ["cosign_signature", "slsa_provenance", "sbom"],
      attributes: { body: "MOON" },
      record: {},
      ...over,
    },
    over,
  );
