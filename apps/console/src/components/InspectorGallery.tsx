"use client";

// Every state the artifact inspector registry can be in, on one page (ui#7).
//
// The subjects below are **hand-written, not fetched**. That is not a shortcut — this package cannot
// fetch. `@astro-mine/inspectors` may not import `@astro-mine/api-client` (ui.md §3), so a panel
// renders what the page hands it, and the page that will do the handing for real is `ui#10`. Until
// then these are the shapes an `ArtifactDetail` maps into.
//
// The globe is the one thing here that is real: it is the application's own `Globe`, mounted the way
// every globe in this app is mounted, passed into the panel through `InspectorSlots`. That is the
// whole point of the slot — the panel arranges a globe it is handed and never summons one, because
// `@astro-mine/view` publishes a single entry that re-exports Cesium and a static import from the
// registry package would put four megabytes into every page that lists an artifact.

import {
  InspectorSlot,
  createInspectorRegistry,
  defaultInspectorRegistry,
  policyInspector,
  type InspectorContribution,
  type InspectorSubject,
} from "@astro-mine/inspectors";
import { StandInBanner } from "@astro-mine/ui";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { Globe } from "@/components/Globe";

const WORLD: InspectorSubject = {
  reference: "shackleton-rim:0.5.0",
  name: "shackleton-rim",
  version: "0.5.0",
  digest: "sha256:3f786850e387550fdab836ed7e6dc881de23001b8a0b1e1e1c1e0a5a9d2b2c3d",
  kind: "world_provider",
  artifactKind: "world",
  attributes: { body: "MOON" },
};

const POLICY: InspectorSubject = {
  reference: "excavation-ppo:1.2.0",
  name: "excavation-ppo",
  version: "1.2.0",
  digest: "sha256:9f2feb1a5e0d5c7e8a3b6d4c2f1e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f",
  kind: "policy",
  artifactKind: "policy",
  attributes: {},
  publisher: "astro-mine",
  namespace: "curated",
  license: "Apache-2.0",
  capabilityTags: ["excavation", "autonomy_l2"],
  coreInterfaces: [
    { interface: "policy", version: "0.1.0" },
    { interface: "env", version: "0.1.0" },
  ],
  inputs: ["Observation"],
  outputs: ["Action"],
  attestations: ["cosign_signature", "slsa_provenance", "sbom"],
};

const BARE_POLICY: InspectorSubject = {
  ...POLICY,
  reference: "unsigned-baseline:0.1.0",
  name: "unsigned-baseline",
  version: "0.1.0",
  publisher: "someone",
  namespace: "open",
  license: null,
  capabilityTags: [],
  coreInterfaces: [],
  inputs: [],
  outputs: [],
  attestations: [],
};

const ASSET: InspectorSubject = {
  reference: "hauler-mk1:0.3.0",
  name: "hauler-mk1",
  version: "0.3.0",
  digest: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  kind: "asset",
  artifactKind: "asset",
  attributes: { asset_kind: "rover" },
  capabilityTags: ["hauling", "regolith_transport"],
};

/** A kind the platform has, and this build has no panel for. */
const UNKNOWN: InspectorSubject = {
  ...ASSET,
  reference: "polar-prior:0.2.0",
  name: "polar-prior",
  version: "0.2.0",
  kind: "prior_recipe",
  artifactKind: "plugin",
  attributes: {},
};

/** A record indexed with no Core kind at all — a different absence, and different words. */
const KINDLESS: InspectorSubject = { ...UNKNOWN, kind: null, artifactKind: null };

/**
 * Two contributions claiming `metric` at equal specificity — a modelling bug, on purpose.
 *
 * The panels are the shipped ones; only the claims are invented. What is being demonstrated is the
 * registry's behaviour, not a fourth inspector.
 */
const TIED: readonly InspectorContribution[] = [
  { ...policyInspector, id: "alpha.metric", kind: "metric" },
  { ...policyInspector, id: "beta.metric", kind: "metric" },
];

const tiedRegistry = createInspectorRegistry(TIED);

const METRIC: InspectorSubject = {
  ...POLICY,
  reference: "coverage-rate:1.0.0",
  name: "coverage-rate",
  version: "1.0.0",
  kind: "metric",
  artifactKind: null,
};

function Case({ title, what, children }: { title: string; what: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" sx={{ py: 3 }}>
      <Typography variant="overline" component="h2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "80ch" }}>
        {what}
      </Typography>
      <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>{children}</Box>
    </Box>
  );
}

export function InspectorGallery() {
  return (
    <Stack divider={<Divider />}>
      <StandInBanner title="A development scaffold, not a page">
        Every subject below is written by hand. No request is made, and none can be: the inspector
        registry cannot import the API client. The real artifact page is ui#10, and this route is
        deleted when it lands.
      </StandInBanner>

      <Case
        title="world — with a globe in the slot"
        what={
          <>
            The panel is handed the application&rsquo;s own <code>Globe</code> and arranges it. This
            is the only real thing on the page; if a sphere renders, the slot contract works end to
            end and Cesium is still mounted in exactly one place.
          </>
        }
      >
        <InspectorSlot
          registry={defaultInspectorRegistry}
          subject={WORLD}
          slots={{
            globe: <Globe showStatus showCoordinates style={{ width: "100%", height: "100%" }} />,
          }}
        />
      </Case>

      <Case
        title="world — with an empty slot"
        what="The same subject with no globe supplied. Degrade visibly, never blank: the identity survives the missing geometry, and no remediation is offered because the panel cannot know why the page has none."
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={WORLD} />
      </Case>

      <Case
        title="policy — a fully declared artifact"
        what="Provenance above the facts it explains. Read the attestation wording closely: present in this registry, never verified — nothing in this browser has checked a signature."
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={POLICY} />
      </Case>

      <Case
        title="policy — declaring nothing"
        what="An artifact with no interfaces, no tags and no attestations. Every absence is stated in words; none of them is an empty row."
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={BARE_POLICY} />
      </Case>

      <Case
        title="asset — vehicle kind from the attribute map"
        what={
          <>
            <code>rover</code> comes from <code>attributes[&quot;asset_kind&quot;]</code>, never
            from the plugin kind, which is <code>asset</code> for a rover, an orbiter and an
            excavator alike. The absent geometry is stated as legitimate rather than broken.
          </>
        }
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={ASSET} />
      </Case>

      <Case
        title="no match — a kind with no panel"
        what={
          <>
            <code>prior_recipe</code> is a real <code>PluginKind</code> that nothing here renders.
            The fallback names it, keeps the identity, and points at the vocabulary refresh in case
            the platform has simply moved ahead of this build.
          </>
        }
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={UNKNOWN} />
      </Case>

      <Case
        title="no match — no Core kind at all"
        what="A different absence and deliberately different words, with no remediation: there is no user-side fix for a record indexed without a kind, and inventing one would be worse than admitting there is none."
      >
        <InspectorSlot registry={defaultInspectorRegistry} subject={KINDLESS} />
      </Case>

      <Case
        title="ambiguity — two contributions claiming the same kind equally"
        what="A modelling bug in the composed registry, rendered rather than swallowed. The reader still gets a panel — the deterministic winner, chosen by a stable ordering and never by registration order — with the collision named beside it so somebody can fix it."
      >
        <InspectorSlot registry={tiedRegistry} subject={METRIC} />
      </Case>
    </Stack>
  );
}
