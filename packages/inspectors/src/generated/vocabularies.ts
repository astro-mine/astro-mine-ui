/**
 * GENERATED — DO NOT EDIT BY HAND.
 *
 * The two closed vocabularies the artifact inspector registry resolves on, mirrored from
 * astro-mine/astro-mine-platform at dc2069c5b895ff81cc13a5cca992668fc2f7dcf2.
 *
 * They are Python upstream — a `StrEnum` and a tuple — and TypeScript cannot import either, so
 * they are generated. Regenerate with `pnpm codegen:vocabularies`; refresh the pin from the
 * platform with `pnpm codegen:vocabularies --refresh`. `pnpm check:vocabularies` fails the build
 * when either vocabulary moves upstream, and fails hard rather than skipping when the upstream (or
 * the credential that reads it) is absent.
 *
 * **These are two axes, not one** (ui.md §6, hub.md §2 principle 2). `PluginKind` names the Core
 * *interface* a plugin implements; the container vocabulary names the *shape of payload* an
 * artifact carries, and Hub derives it from the stored OCI `artifactType` so it cannot drift from
 * the bytes. They overlap on four names and diverge everywhere else, and no total map between them
 * exists — a served surrogate is `field_model` or `regime_engine` by physics domain. Collapsing
 * them into one key is the bug the registry's specificity rule exists to prevent.
 */

/**
 * Core's closed interface vocabulary: which Core interface a plugin implements.
 *
 * Generated from `PluginKind` in `src/astro_mine/core/registry/enums.py`, in upstream
 * declaration order. The vocabulary is append-only, so that order is stable and any diff
 * here is a real change.
 */
export const PLUGIN_KINDS = [
  "regime_engine",
  "sensor_model",
  "coupling_scheme",
  "world_provider",
  "body_pack",
  "field_model",
  "resource_field_backend",
  "observation_model",
  "prior_recipe",
  "info_gain_objective",
  "comms_model",
  "asset",
  "policy",
  "metric",
  "design",
  "campaign",
] as const;

/** One member of Core's interface vocabulary. */
export type PluginKind = (typeof PLUGIN_KINDS)[number];

/** Whether an untyped value — a field off the wire — is a known PluginKind. */
export function isPluginKind(value: unknown): value is PluginKind {
  return typeof value === "string" && (PLUGIN_KINDS as readonly string[]).includes(value);
}

/**
 * Hub's closed container vocabulary: what shape of payload an artifact carries.
 *
 * Generated from `ARTIFACT_KINDS` in `src/astro_mine/hub/registry/_oci.py`, in upstream
 * declaration order. The vocabulary is append-only, so that order is stable and any diff
 * here is a real change.
 */
export const ARTIFACT_KINDS = [
  "policy",
  "world",
  "asset",
  "surrogate",
  "plugin",
  "schema",
  "design",
  "campaign",
] as const;

/** One member of Hub's container vocabulary. */
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** Whether an untyped value — a field off the wire — is a known ArtifactKind. */
export function isArtifactKind(value: unknown): value is ArtifactKind {
  return typeof value === "string" && (ARTIFACT_KINDS as readonly string[]).includes(value);
}
