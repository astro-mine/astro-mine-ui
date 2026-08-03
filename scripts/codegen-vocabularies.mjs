#!/usr/bin/env node
// The vocabulary generator (ui#7; ui.md §6, hub.md §2 principle 2, conventions.md §3.1).
//
//   pnpm codegen:vocabularies                             pin -> TypeScript. Offline, deterministic.
//   pnpm codegen:vocabularies --refresh                   re-read the platform at HEAD, repin, regenerate.
//   pnpm codegen:vocabularies --refresh --from <checkout> the same, from a local platform clone.
//
// The inspector registry resolves on two closed vocabularies that live in Python: Core's
// `PluginKind` — *what interface does this implement* — and Hub's container kinds — *what shape of
// payload is this*. `ui.md` §6 is explicit that these are two axes and not one, and that keying on
// Core's kind alone routes a Surrogate excavation model into Worlds' inspector, because both carry
// `field_model`. Generating both is what lets the registry's keys be **types** rather than strings:
// a contribution for a kind that does not exist stops being a runtime surprise and becomes a
// compile error.
//
// The output is committed, so a clean clone builds offline with no Python in sight (CX-LOCAL), and
// `pnpm check:vocabularies` is what stops the committed copy from drifting away from the platform.
// Hand-editing the output is therefore not a style violation; it is a red build.

import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

import prettier from "prettier";

import {
  GENERATED_PATH,
  PIN_PATH,
  REPO_ROOT,
  VOCABULARIES,
  extract,
  readPin,
} from "./lib/platform-vocabularies.mjs";
import { fileAt, headCommit, requireToken } from "./lib/platform-fetch.mjs";

const PLATFORM_REPO = "astro-mine/astro-mine-platform";

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const fromIndex = args.indexOf("--from");
const fromDirectory = fromIndex === -1 ? null : args[fromIndex + 1];

function die(message) {
  console.error(`\n✗ vocabulary codegen failed\n\n${message}\n`);
  process.exit(1);
}

/** `["a", "b"]` as a Prettier-friendly array literal. */
const literal = (members) => `[${members.map((m) => JSON.stringify(m)).join(", ")}]`;

function emit(pin) {
  const entries = VOCABULARIES.map((vocabulary) => {
    const pinned = pin.vocabularies[vocabulary.name];
    if (!pinned) die(`the pin records no \`${vocabulary.name}\`. Re-run with --refresh.`);
    return { ...vocabulary, members: pinned.members };
  });

  const blocks = entries.map((entry) => {
    const constant = entry.name === "PluginKind" ? "PLUGIN_KINDS" : "ARTIFACT_KINDS";
    const guard = `is${entry.name}`;
    return `
/**
 * ${entry.owner}'s closed ${entry.axis} vocabulary: ${entry.what}.
 *
 * Generated from \`${entry.symbol}\` in \`${entry.source}\`, in upstream
 * declaration order. The vocabulary is append-only, so that order is stable and any diff
 * here is a real change.
 */
export const ${constant} = ${literal(entry.members)} as const;

/** One member of ${entry.owner}'s ${entry.axis} vocabulary. */
export type ${entry.name} = (typeof ${constant})[number];

/** Whether an untyped value — a field off the wire — is a known ${entry.name}. */
export function ${guard}(value: unknown): value is ${entry.name} {
  return typeof value === "string" && (${constant} as readonly string[]).includes(value);
}
`.trim();
  });

  return `/**
 * GENERATED — DO NOT EDIT BY HAND.
 *
 * The two closed vocabularies the artifact inspector registry resolves on, mirrored from
 * ${PLATFORM_REPO} at ${pin.commit}.
 *
 * They are Python upstream — a \`StrEnum\` and a tuple — and TypeScript cannot import either, so
 * they are generated. Regenerate with \`pnpm codegen:vocabularies\`; refresh the pin from the
 * platform with \`pnpm codegen:vocabularies --refresh\`. \`pnpm check:vocabularies\` fails the build
 * when either vocabulary moves upstream, and fails hard rather than skipping when the upstream (or
 * the credential that reads it) is absent.
 *
 * **These are two axes, not one** (ui.md §6, hub.md §2 principle 2). \`PluginKind\` names the Core
 * *interface* a plugin implements; the container vocabulary names the *shape of payload* an
 * artifact carries, and Hub derives it from the stored OCI \`artifactType\` so it cannot drift from
 * the bytes. They overlap on four names and diverge everywhere else, and no total map between them
 * exists — a served surrogate is \`field_model\` or \`regime_engine\` by physics domain. Collapsing
 * them into one key is the bug the registry's specificity rule exists to prevent.
 */

${blocks.join("\n\n")}
`;
}

/** Re-read both vocabularies from the platform and rebuild the pin. */
async function rebuildPin() {
  const vocabularies = {};
  let commit;

  if (fromDirectory) {
    // A local checkout has no commit to record that this script can trust — the working tree may be
    // dirty — so the pin keeps the SHA it had and says where the bytes came from instead. The
    // networked refresh is the one that repins.
    commit = readPin().commit;
    for (const vocabulary of VOCABULARIES) {
      const source = readFileSync(join(fromDirectory, vocabulary.source), "utf8");
      vocabularies[vocabulary.name] = {
        source: vocabulary.source,
        symbol: vocabulary.symbol,
        form: vocabulary.form,
        members: extract(source, vocabulary),
      };
    }
    console.log(`read the vocabularies from ${fromDirectory} (the pinned commit is unchanged)`);
  } else {
    const token = requireToken();
    commit = await headCommit(PLATFORM_REPO, token);
    for (const vocabulary of VOCABULARIES) {
      const source = await fileAt(PLATFORM_REPO, commit, vocabulary.source, token);
      vocabularies[vocabulary.name] = {
        source: vocabulary.source,
        symbol: vocabulary.symbol,
        form: vocabulary.form,
        members: extract(source, vocabulary),
      };
    }
    console.log(`read the vocabularies from ${PLATFORM_REPO}@${commit.slice(0, 9)}`);
  }

  return {
    _comment:
      "GENERATED PIN — the platform commit the inspector registry's vocabularies were read from, " +
      "and the members they had. Written by `pnpm codegen:vocabularies --refresh`; checked by " +
      "`pnpm check:vocabularies` (CI, networked, CORE_REPO_TOKEN), which compares these members " +
      "against the platform's DEFAULT BRANCH HEAD, not against this commit — pinning the ref would " +
      "make the guard blind to the vocabulary actually moving, which is the only thing it is for. " +
      "The members are vendored rather than the modules: _oci.py changes constantly for reasons " +
      "unrelated to ARTIFACT_KINDS, and a guard that goes red on every unrelated edit is a guard " +
      "somebody mutes. `src/generated/vocabularies.ts` is generated FROM this file; never hand-edit " +
      "either. See conventions.md §3.1 (cross-language and vendored consumers).",
    repo: PLATFORM_REPO,
    commit,
    vocabularies,
  };
}

const prettierConfig = JSON.parse(readFileSync(join(REPO_ROOT, ".prettierrc.json"), "utf8"));

try {
  if (refresh) {
    const pin = await rebuildPin();
    writeFileSync(
      PIN_PATH,
      await prettier.format(JSON.stringify(pin, null, 2), { ...prettierConfig, parser: "json" }),
      "utf8",
    );
    console.log(`wrote ${PIN_PATH}`);
  }

  const source = await prettier.format(emit(readPin()), {
    ...prettierConfig,
    parser: "typescript",
  });
  writeFileSync(GENERATED_PATH, source, "utf8");
  console.log(`wrote ${GENERATED_PATH}`);
} catch (error) {
  die(error.message);
}
