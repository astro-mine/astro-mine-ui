// What the registry resolves on, and what a panel is handed (ui#7; ui.md §6, hub.md §2 principle 2).

import type { ComponentType, ReactNode } from "react";

import type { ArtifactKind, PluginKind } from "./generated/vocabularies.js";

/**
 * One artifact, as a panel sees it.
 *
 * **This is a view model, not a mirror of the API.** The names are the front end's — `artifactKind`,
 * not `artifact_kind`; `capabilityTags`, not `capability_tags` — because a page maps a response into
 * this, and a type that copied the server's field names would be the hand-written mirror the
 * `check-no-handwritten-api-types` gate exists to prevent (ui.md §10.6). It also carries only what a
 * panel renders, which is a much smaller thing than what the route returns.
 *
 * Three fields are the resolution keys and the rest are content. The keys are typed as
 * `string | null` rather than as the generated unions on purpose: they arrive off the wire, where a
 * platform newer than this build can put a member this build has never heard of. Narrowing happens
 * at the boundary — {@link isPluginKind} — and a value that does not narrow gets the honest
 * fallback, which is exactly the intended behaviour.
 */
export interface InspectorSubject {
  /** `name:version` — the catalog key. */
  readonly reference: string;
  readonly name: string;
  readonly version: string;
  /** The content address. The identity a reader pins (ui.md §7 rule 4). */
  readonly digest: string;

  /**
   * Core's **interface** vocabulary — `manifest.kind`. The primary resolution key.
   *
   * `null` when the catalog record carries none, which the API's own schema allows.
   */
  readonly kind: string | null;
  /**
   * Hub's **container** vocabulary — what shape of payload the artifact carries.
   *
   * A separate axis from {@link kind}, never a projection of it (hub.md §2 principle 2). Hub derives
   * it from the stored OCI `artifactType`, so it cannot drift from the bytes — and it is `null` for
   * an artifact published by some other tool, or indexed before the facet existed. That null is why
   * a declared discriminator must fail closed rather than match loosely.
   */
  readonly artifactKind: string | null;
  /**
   * `manifest.attributes` — the open map Core deliberately does not schematize.
   *
   * The last-resort resolution key. It was empty in practice when `ui#7` shipped the rule — the
   * artifact route returned only Core's `CatalogRecord` projection, and
   * `PluginManifest.to_catalog_record()` drops `attributes` — so the key was specified and tested
   * with nothing able to reach it. `astro-mine-api#10` closed that: `ArtifactDetail.attributes`
   * now carries the map, served verbatim.
   *
   * **Unbounded and unschematized**, which is what makes it the *last* resort: read a key only if
   * you know the producer stamps it, never assume one is present, and never invent a value for it.
   */
  readonly attributes: Readonly<Record<string, unknown>>;

  readonly publisher?: string | null;
  readonly namespace?: string | null;
  readonly license?: string | null;
  readonly capabilityTags?: readonly string[];
  readonly coreInterfaces?: readonly CoreInterfaceVersion[];
  readonly inputs?: readonly string[];
  readonly outputs?: readonly string[];
  /**
   * The attestation types **present in the registry**.
   *
   * Not a verification verdict, and a panel must not word it as one (ui.md §7 rule 6).
   */
  readonly attestations?: readonly string[];
  readonly deprecated?: boolean;
  readonly yanked?: boolean;
}

/** One `(interface, version)` pair off a manifest — what the plugin is built against. */
export interface CoreInterfaceVersion {
  readonly interface: string;
  readonly version: string;
}

/** Just the fields resolution reads. Everything in this package's core takes this, not the whole. */
export type InspectorKeys = Pick<InspectorSubject, "kind" | "artifactKind" | "attributes">;

/**
 * The heavy visuals a panel composes but does not own.
 *
 * **A panel cannot fetch and a panel cannot mount Cesium**, and both are structural rather than
 * stylistic. `@astro-mine/inspectors` may not import `@astro-mine/api-client` at all (ui.md §3), and
 * `@astro-mine/view` publishes a single entry that pulls Cesium into any graph that touches it — so
 * a static import here would put four megabytes into the first paint of every page that renders an
 * artifact row, and the application already owns the one `next/dynamic`, `ssr: false`,
 * `CESIUM_BASE_URL` mount (`apps/console/src/components/Globe.tsx`). A second owner of that mount
 * inherits none of its care.
 *
 * So the composition root passes the mounted thing down and the panel arranges it. A slot left
 * unfilled is rendered as an absence in words, never as a hole.
 */
export interface InspectorSlots {
  /** A mounted globe, for a world artifact. */
  readonly globe?: ReactNode;
  /** A mounted geometry preview, for an asset artifact. */
  readonly geometry?: ReactNode;
}

/** What every panel receives. */
export interface InspectorPanelProps {
  readonly subject: InspectorSubject;
  readonly slots?: InspectorSlots;
}

/**
 * A predicate over `manifest.attributes` — the escape hatch, and deliberately last-resort.
 *
 * A predicate over a free-form dict is the weakest of the three keys, and a contribution that needs
 * one is evidence the artifact's facets are under-modelled (ui.md §6). It is **not** wrapped in a
 * `try`: a predicate is first-party code, and a throw is a bug that should be loud rather than a
 * silent non-match that leaves a reader wondering why their panel vanished.
 */
export type AttributePredicate = (attributes: Readonly<Record<string, unknown>>) => boolean;

/**
 * One inspector's claim: *these artifacts are mine, and this is what renders them*.
 *
 * `kind` is required and typed as a generated {@link PluginKind}, so a contribution for a kind the
 * platform does not have is a compile error rather than a panel that never appears. The two
 * discriminators are optional and each one narrows the claim — see `resolveInspector` for what
 * "narrows" means precisely, because the rule is normative.
 */
export interface InspectorContribution {
  /**
   * Stable, unique, and **the tie-break key**.
   *
   * Ties are resolved by ordering on this rather than by registration order, so two deployments that
   * assemble the same registry in a different order still resolve identically. That makes the id
   * part of the contract: renaming one can change which panel a reader sees.
   */
  readonly id: string;
  /** The panel's heading — what a reader is looking at. */
  readonly title: string;
  /** Core's interface vocabulary. The primary key; always declared. */
  readonly kind: PluginKind;
  /** Hub's container vocabulary. A declared value **fails closed** against a null container kind. */
  readonly artifactKind?: ArtifactKind;
  /** The last-resort key. */
  readonly matchesAttributes?: AttributePredicate;
  readonly Panel: ComponentType<InspectorPanelProps>;
}

/** The frozen set a slot resolves against. Built by `createInspectorRegistry`, never by hand. */
export interface InspectorRegistry {
  readonly contributions: readonly InspectorContribution[];
}

/**
 * What resolution produced.
 *
 * `ambiguous` is deliberately not an error and deliberately not silent: the reader still gets a
 * panel — the deterministic winner — and the ambiguity is rendered beside it, because a modelling
 * bug that nobody can see is a modelling bug that nobody fixes.
 */
export type InspectorResolution =
  | { readonly status: "resolved"; readonly contribution: InspectorContribution }
  | {
      readonly status: "ambiguous";
      readonly contribution: InspectorContribution;
      /** The equally-specific matches this one won against, in the same stable order. */
      readonly alternatives: readonly InspectorContribution[];
    }
  | { readonly status: "unmatched"; readonly kind: string | null };
