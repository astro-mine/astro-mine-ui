"use client";

// One artifact, with a URL somebody can send to a colleague (ui#10; UC-G2).
//
// **Redesigned from a master-detail pane into a page.** The retired console showed an artifact in a
// drawer beside the search results, which meant it had no address: a reader who found the right
// thing could not link anybody to it, and a reload lost it. The whole point of a content-addressed
// commons is that a specific artifact is a specific thing you can point at.
//
// **The digest is the headline.** Not a footnote, not an abbreviation with a copy button — the
// first identity on the page, in full, because a tag is a query and the content address is what
// gets pinned into a scenario or a lockfile (honesty rule 4). `name` and `version` are how the
// route is addressed, because `GET /hub/artifacts/{name}/{version}` is the route the API serves;
// the digest is what that query *resolved to*, and it is the answer worth copying.
//
// **The inspector is resolved, not chosen here.** Which panel renders a world versus a policy is
// `@astro-mine/inspectors`' normative resolution (ui.md §6), and this page passes a subject and
// takes what comes back — including the honest "no inspector for kind X" fallback, which is a state
// rather than a blank.

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState } from "@astro-mine/ui";
import {
  InspectorSlot,
  defaultInspectorRegistry,
  type InspectorSubject,
} from "@astro-mine/inspectors";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useIdentity } from "@/shell/searchParams";

import { Attestations } from "./Attestations";
import { DownloadControl } from "./DownloadControl";
import { stateOf } from "./identity";
import type { ArtifactDetail } from "./types";

const IDENTITY = ["name", "version"] as const;

/** One labelled fact. A dash where the catalog recorded nothing — never a blank. */
function Facet({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Grid size={{ xs: 6, sm: 4, md: 3 }}>
      <Typography variant="overline" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>
        {value == null || value === "" ? (
          <Box component="span" color="text.secondary" aria-label="not recorded">
            —
          </Box>
        ) : (
          value
        )}
      </Typography>
    </Grid>
  );
}

/**
 * The detail, as the inspector registry wants to see it.
 *
 * `attributes` is the Core manifest's open map, served verbatim and deliberately unschematized —
 * the capability tags and interface versions an inspector may want live in there, under keys only
 * the producer guarantees. So they are read defensively: a wrong shape yields nothing rather than
 * throwing inside a panel, because a malformed attribute must not take the page with it.
 */
function toSubject(detail: ArtifactDetail): InspectorSubject {
  const attributes = detail.attributes ?? {};
  const strings = (value: unknown): readonly string[] | undefined =>
    Array.isArray(value) && value.every((item) => typeof item === "string")
      ? (value as string[])
      : undefined;

  return {
    reference: detail.reference,
    name: detail.name,
    version: detail.version,
    digest: detail.digest,
    kind: detail.kind ?? null,
    artifactKind: detail.artifact_kind ?? null,
    attributes,
    publisher: detail.publisher,
    namespace: detail.namespace,
    license: detail.license,
    capabilityTags: strings(attributes.capability_tags),
    inputs: strings(attributes.inputs),
    outputs: strings(attributes.outputs),
    attestations: detail.attestations,
    deprecated: detail.deprecated,
    yanked: detail.yanked,
  };
}

export function ArtifactPage() {
  const { name, version } = useIdentity(IDENTITY);

  const query = useApiQuery(
    (client, signal) =>
      // Non-null: the request only runs when `enabled`, and `enabled` is exactly this condition.
      client.hubGetArtifact({ path: { name: name!, version: version! } }, { signal }),
    [name, version],
    { enabled: name !== null && version !== null },
  );

  return (
    <Box sx={{ mt: 3 }}>
      {/* No `h1` here — `app/registry/artifact/page.tsx` renders it above this boundary so it
          survives into the static export. The reference below is an `h2`. */}
      <ApiResult
        query={query}
        loadingLabel="Reading the artifact…"
        idle={
          <EmptyState
            title="No artifact in the address"
            hint={
              <>
                This page is keyed on <Box component="code">?name=…&amp;version=…</Box>, because a
                static export cannot pre-render a route whose parameters are names and digests (
                <Box component="code">ui.md</Box> §5.1). Find one from the{" "}
                <Box component="a" href="/registry">
                  registry search
                </Box>
                .
              </>
            }
          />
        }
      >
        {(detail) => {
          const state = stateOf(detail);
          return (
            <Stack spacing={4}>
              <Box>
                <Typography variant="h5" component="h2" sx={{ overflowWrap: "anywhere" }}>
                  {detail.reference}
                </Typography>
                {state === null ? null : (
                  <Typography
                    variant="body2"
                    color="warning.main"
                    sx={{ mt: 0.5, fontWeight: 600 }}
                  >
                    This artifact is {state}.{" "}
                    {detail.yanked === true
                      ? "It is being withdrawn — do not take a new dependency on it."
                      : "It still resolves and still runs, but a newer artifact supersedes it."}
                  </Typography>
                )}

                {/* The headline identity. Expanded by default: a digest a reader has to click to
                    see is a digest that reads as an implementation detail, and it is the opposite
                    of that. */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="overline" color="text.secondary" component="h3">
                    Content address
                  </Typography>
                  <Digest value={detail.digest} label="Artifact digest" defaultExpanded />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                    <strong>This is the identity.</strong> The reference above is a query:{" "}
                    <Box component="code">{detail.version}</Box> resolves to this digest today and
                    may resolve to another tomorrow. Pin the digest when you need the same bytes a
                    year from now.
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  Catalog facets
                </Typography>
                <Grid container component="dl" spacing={2} sx={{ m: 0 }}>
                  {/* Two kind facets, never one. hub.md §2 principle 2: the Core interface kind and
                      Hub's container kind are separate vocabularies that overlap on four names, and
                      a single column is how a Surrogate model gets read as a Worlds one. */}
                  <Facet label="Core kind" value={detail.kind} />
                  <Facet label="Container kind" value={detail.artifact_kind} />
                  <Facet label="Namespace" value={detail.namespace} />
                  <Facet label="Publisher" value={detail.publisher} />
                  <Facet label="Licence" value={detail.license} />
                  <Facet label="Version" value={detail.version} />
                </Grid>
              </Box>

              <Divider />

              <Attestations attestations={detail.attestations ?? []} />

              <Divider />

              {/* Surfaced from the artifact page rather than given a route of its own (ui#11):
                  the gate is a question about *this* artifact, and a page whose whole content is
                  one button would be a worse place to ask it from than the page that names what
                  is being asked about. */}
              <DownloadControl
                name={detail.name}
                version={detail.version}
                reference={detail.reference}
              />

              <Divider />

              <Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  Inspector
                </Typography>
                <InspectorSlot registry={defaultInspectorRegistry} subject={toSubject(detail)} />
              </Box>
            </Stack>
          );
        }}
      </ApiResult>
    </Box>
  );
}
