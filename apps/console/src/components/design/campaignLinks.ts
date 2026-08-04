// Linking a published campaign into the registry (ui#18).
//
// A campaign comes back as a `reference` — `namespace/name:version` — and the registry's artifact
// page is keyed on `name` and `version` separately, because that is how `GET
// /hub/artifacts/{name}/{version}` is addressed. One small function rather than the same split
// written at three call sites, and one place for the awkward case: a reference with no version.

/**
 * `commons/polar-ice:0.1.0` → `/registry/artifact?name=polar-ice&version=0.1.0`.
 *
 * A reference with no `:` has no version to address, so the link goes to the registry search with
 * the name as the term. That is a link that works rather than one that 404s — and it is the only
 * honest answer, since the artifact route cannot be addressed without a version.
 */
export function artifactHrefFor(reference: string): string {
  const separator = reference.lastIndexOf(":");
  if (separator === -1) {
    return `/registry?q=${encodeURIComponent(reference)}`;
  }

  const qualified = reference.slice(0, separator);
  const version = reference.slice(separator + 1);
  // The namespace is part of how a reference reads and is *not* part of the artifact route's
  // `name` parameter — `GET /hub/artifacts/{name}/{version}` takes the bare name.
  const slash = qualified.lastIndexOf("/");
  const name = slash === -1 ? qualified : qualified.slice(slash + 1);

  const params = new URLSearchParams({ name, version });
  return `/registry/artifact?${params.toString()}`;
}
