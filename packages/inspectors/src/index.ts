// @astro-mine/inspectors — the artifact-kind to panel registry (ui#7; ui.md §6).
//
// **The one survivor of the retired `Surface` contract.** The registry that composed whole
// applications out of plugin surfaces is gone (ui.md §11) — it bought third-party extensibility the
// platform never used and cost a bespoke routing layer that fought the framework. This piece stays
// because it answers a question the registry pages ask on every row and cannot answer themselves:
// *given an artifact, what should render it?* A `world` gets a globe, a `policy` gets its declared
// contract, an `asset` gets a geometry preview, and the page listing them knows about none of them.
//
// Three things leave this package and each is a contract:
//
//   1. **The resolution rule**, which is NORMATIVE. A UI that resolves differently on two machines
//      is a reproducibility defect, not a cosmetic one — so `registry.ts` is pure, and every clause
//      of ui.md §6 is a named test rather than a comment.
//   2. **The two vocabularies**, generated from the platform's Python and guarded against it. A
//      contribution for a kind the platform does not have is a compile error here.
//   3. **`InspectorSlot`**, the extension point ui.md §2 lists in the honesty kit and
//      `@astro-mine/ui` deliberately does not export, because a slot with no resolution behind it
//      is a div.
//
// **What is deliberately NOT here: a fetch.** This package may not import `@astro-mine/api-client`
// — no package may import a sibling except for `ui` and `view` (ui.md §3) — so a panel renders what
// it is handed. The heavy visuals a panel composes but does not own (a Cesium globe, a geometry
// preview) arrive through `InspectorSlots` from the application, which owns the single client-only
// Cesium mount. That is not a workaround; it is what keeps a four-megabyte chunk out of the first
// paint of every page that renders an artifact row.

export { InspectorSlot, type InspectorSlotProps } from "./InspectorSlot.js";

export { createInspectorRegistry, matches, resolveInspector, specificity } from "./registry.js";

export type {
  AttributePredicate,
  CoreInterfaceVersion,
  InspectorContribution,
  InspectorKeys,
  InspectorPanelProps,
  InspectorRegistry,
  InspectorResolution,
  InspectorSlots,
  InspectorSubject,
} from "./model.js";

export {
  ARTIFACT_KINDS,
  PLUGIN_KINDS,
  isArtifactKind,
  isPluginKind,
  type ArtifactKind,
  type PluginKind,
} from "./generated/vocabularies.js";

export {
  AssetInspector,
  DEFAULT_INSPECTORS,
  PolicyInspector,
  WorldInspector,
  assetInspector,
  defaultInspectorRegistry,
  policyInspector,
  worldInspector,
} from "./inspectors/index.js";

export { FallbackInspector, type FallbackInspectorProps } from "./inspectors/FallbackInspector.js";
