// The inspectors the pages need to start with (ui#7).
//
// **Every one of them declares `kind` and nothing else**, and that is a decision rather than an
// omission. A declared `artifactKind` fails closed against a null container kind (ui.md §6), and
// `artifact_kind` is null for any artifact published by another tool or indexed before Hub grew the
// facet — so declaring `artifactKind: "world"` here would trade nothing for a fallback panel on
// exactly the older bundles a registry is most likely to be holding. There is no live collision on
// `world_provider`, `policy` or `asset` to separate; ui.md §6's own worked example has Worlds
// claiming `field_model` **unqualified** and being the fallback for it.
//
// A discriminator earns its place when two contributions collide, and not before. `field_model` is
// where that happens — a Worlds illumination field model and a Surrogate excavation model both carry
// it — and neither has an inspector yet, because neither has a REST surface to fetch from.

import { AssetInspector } from "./AssetInspector.js";
import { PolicyInspector } from "./PolicyInspector.js";
import { WorldInspector } from "./WorldInspector.js";
import { createInspectorRegistry } from "../registry.js";
import type { InspectorContribution } from "../model.js";

/** The world bundle: `PluginKind.WORLD_PROVIDER`, container kind `world`. */
export const worldInspector: InspectorContribution = {
  id: "astro-mine.world",
  title: "World",
  kind: "world_provider",
  Panel: WorldInspector,
};

/** A trained policy: `PluginKind.POLICY`. */
export const policyInspector: InspectorContribution = {
  id: "astro-mine.policy",
  title: "Policy",
  kind: "policy",
  Panel: PolicyInspector,
};

/** A SADF asset bundle: `PluginKind.ASSET` — packaging metadata Sim instantiates, not code. */
export const assetInspector: InspectorContribution = {
  id: "astro-mine.asset",
  title: "Asset",
  kind: "asset",
  Panel: AssetInspector,
};

/** The set the application composes unless it has a reason not to. */
export const DEFAULT_INSPECTORS: readonly InspectorContribution[] = [
  assetInspector,
  policyInspector,
  worldInspector,
];

/** The default registry, built once. */
export const defaultInspectorRegistry = createInspectorRegistry(DEFAULT_INSPECTORS);

export { AssetInspector, PolicyInspector, WorldInspector };
