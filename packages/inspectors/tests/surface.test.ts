// @vitest-environment node
//
// THE EXPORT SURFACE AND THE LAYERING, AS CONTRACTS (ui#7; ui.md §3, §6).
//
// `node`, not the jsdom default: nothing here renders, and under jsdom `import.meta.url` is an
// `http:` URL rather than a `file:` one, so reading the manifest beside this file fails outright.
//
// Two properties that no single file can show:
//
//   - This package does not reach for the API client or the globe. The layering gate enforces that
//     workspace-wide; asserting it here too is cheap and fails in the lane a package author is
//     already watching.
//   - The generated vocabularies leave the package, because a page narrowing an off-the-wire string
//     needs the guard, and a page authoring a contribution needs the union.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as surface from "../src/index.js";

const exported = Object.keys(surface).sort();

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as Record<string, Record<string, string> | undefined>;

const allDependencies = (...fields: string[]) =>
  fields.flatMap((field) => Object.keys(manifest[field] ?? {}));

describe("the export surface", () => {
  it("is exactly what this issue ships", () => {
    expect(exported).toEqual(
      [
        "ARTIFACT_KINDS",
        "AssetInspector",
        "DEFAULT_INSPECTORS",
        "FallbackInspector",
        "InspectorSlot",
        "PLUGIN_KINDS",
        "PolicyInspector",
        "WorldInspector",
        "assetInspector",
        "createInspectorRegistry",
        "defaultInspectorRegistry",
        "isArtifactKind",
        "isPluginKind",
        "matches",
        "policyInspector",
        "resolveInspector",
        "specificity",
        "worldInspector",
      ].sort(),
    );
  });

  it("keeps the panel layout internal", () => {
    // `Panel` and `FactList` are a layout convention, not a capability. Exporting them would invite
    // a page to render "an inspector panel" with no inspector behind it — a panel the registry does
    // not know exists and cannot resolve to.
    expect(exported).not.toContain("Panel");
    expect(exported).not.toContain("FactList");
  });
});

describe("the layering", () => {
  it("declares @astro-mine/ui and nothing else of ours", () => {
    const declared = allDependencies("dependencies", "peerDependencies", "devDependencies");
    expect(declared.filter((name) => name.startsWith("@astro-mine/"))).toEqual(["@astro-mine/ui"]);
  });

  it("does not declare @astro-mine/view, and that is the design", () => {
    // The allowlist PERMITS `inspectors -> view`; this package declines it. `@astro-mine/view`
    // publishes one entry that re-exports its Cesium module, so a static import would put four
    // megabytes into the graph of every page that renders an artifact row — and CI already asserts
    // that no prerendered route preloads the Cesium chunk. The application owns the one
    // `next/dynamic`, `ssr: false` mount and passes the mounted globe down through `InspectorSlots`.
    expect(allDependencies("dependencies", "peerDependencies")).not.toContain("@astro-mine/view");
  });

  it("never reaches the API client — a panel renders what it is handed", () => {
    expect(allDependencies("dependencies", "peerDependencies", "devDependencies")).not.toContain(
      "@astro-mine/api-client",
    );
  });
});

describe("the generated vocabularies", () => {
  it("carries Core's interface kinds and Hub's container kinds as separate lists", () => {
    // Two axes, never one field holding two vocabularies (hub.md §2 principle 2). They overlap on
    // four names, which is exactly why collapsing them is tempting and wrong.
    expect(surface.PLUGIN_KINDS).toContain("field_model");
    expect(surface.ARTIFACT_KINDS).toContain("world");
    expect(surface.ARTIFACT_KINDS as readonly string[]).not.toContain("field_model");

    const shared = surface.PLUGIN_KINDS.filter((kind) =>
      (surface.ARTIFACT_KINDS as readonly string[]).includes(kind),
    );
    expect(shared.sort()).toEqual(["asset", "campaign", "design", "policy"]);
  });

  it("narrows an off-the-wire string, and refuses one it does not know", () => {
    expect(surface.isPluginKind("world_provider")).toBe(true);
    expect(surface.isPluginKind("world")).toBe(false); // a container kind, not an interface kind
    expect(surface.isArtifactKind("world")).toBe(true);
    expect(surface.isPluginKind(undefined)).toBe(false);
    expect(surface.isArtifactKind(null)).toBe(false);
  });
});

describe("the default registry", () => {
  it("ships world, policy and asset — and no wildcard", () => {
    expect(surface.defaultInspectorRegistry.contributions.map((c) => c.kind).sort()).toEqual([
      "asset",
      "policy",
      "world_provider",
    ]);
  });

  it("declares no discriminator on any of them", () => {
    // A declared `artifactKind` fails closed against a null container kind, and `artifact_kind` is
    // null for anything published by another tool or indexed before Hub grew the facet. There is no
    // collision on these three kinds to separate, so declaring one would trade nothing for a
    // fallback panel on exactly the older bundles a registry is most likely to hold.
    for (const contribution of surface.defaultInspectorRegistry.contributions) {
      expect(surface.specificity(contribution)).toBe(0);
    }
  });
});
