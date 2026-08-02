/**
 * Generate `src/frames/generated/units.ts` from Core's canonical units JSON Schema
 * (`RM-P1-CORE-06`, RFC-0007 Design §1a).
 *
 * View's ingest boundary is JSON, not Protobuf (RFC-0007 Design §4), so View consumes the schema
 * directly and never needs the (still-unpublished) `@astro-mine/core-proto` client. The schema is
 * **vendored** at `src/frames/schema/units.schema.json` — a byte copy of
 * `src/astro_mine/core/units/schema/units.schema.json` from `astro-mine-core`. To re-sync after a
 * Core change, copy that file over the vendored one, update `core-pin.json`, and re-run
 * `pnpm codegen:units`.
 *
 * The copy is no longer kept in step by this comment alone: `core-pin.json` records the Core tag
 * and the exact bytes, and `pnpm check:core-schema` (CI) **fails** when Core moves underneath us
 * (RFC-0009 §1 — cross-language and vendored consumers).
 *
 *   Vendored from astro-mine-core v0.3.0
 *   ($id https://schemas.astro-mine.org/core/units/v0.1/units.schema.json)
 *
 * The generated file is committed; CI has no codegen step, but `pnpm codegen:units` MUST leave the
 * tree clean (the output is Prettier-formatted with the repo config), so a drift between the schema
 * and the checked-in types is caught by `git diff`.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compileFromFile } from "json-schema-to-typescript";

// Ported into the workspace by ui#6: the script moved from the package's own `scripts/` to the
// workspace's, beside the other generators, so `json-schema-to-typescript` sits in the root's
// devDependencies exactly as `openapi-typescript` does for the API client. The two roots below are
// what that move costs — the package it writes into, and the workspace whose Prettier config the
// output must match.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const viewRoot = resolve(repoRoot, "packages", "view");
const schemaPath = resolve(viewRoot, "src/frames/schema/units.schema.json");
const outPath = resolve(viewRoot, "src/frames/generated/units.ts");

const prettierConfig = JSON.parse(await readFile(resolve(repoRoot, ".prettierrc.json"), "utf8"));

const banner = `/**
 * GENERATED — DO NOT EDIT BY HAND.
 *
 * Source: Core's canonical units JSON Schema, vendored at src/frames/schema/units.schema.json
 * (astro-mine-core rev 27ed80d5b042c29db4103abced6adec1cfa0b4e3;
 *  $id https://schemas.astro-mine.org/core/units/v0.1/units.schema.json).
 *
 * Regenerate with \`pnpm codegen:units\`. See scripts/gen-units-types.mjs.
 *
 * These are the six canonical waist vocabulary types (RFC-0007 Design §1a; conventions.md §5):
 * ReferenceFrame, PlanetaryCRS, Epoch, EpochWindow, FrameClass, TimeScale. They are the single
 * source of truth for the frame/CRS/time shapes — View no longer hand-mirrors them.
 */`;

let ts = await compileFromFile(schemaPath, {
  bannerComment: banner,
  additionalProperties: false,
  declareExternallyReferenced: true,
  unreachableDefinitions: true,
  enableConstEnums: false,
  format: true,
  style: prettierConfig,
});

// The schema is a `$defs` catalog with no root object, so json-schema-to-typescript synthesises a
// passthrough root interface (`{ [k: string]: unknown }`) from the schema title. It is not one of
// the vocabulary types; drop it (and its doc comment) so the committed file is exactly the six.
ts =
  ts
    .replace(
      /\/\*\*(?:(?!\*\/)[\s\S])*?\*\/\nexport interface \w+ \{\n\s*\[k: string\]: unknown;\n\}\n?/,
      "",
    )
    .replace(/\n{3,}/g, "\n\n") + "";

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, ts, "utf8");
process.stdout.write(`wrote ${outPath}\n`);
