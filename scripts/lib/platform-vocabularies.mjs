// Reading Core's and Hub's closed vocabularies out of Python (ui#7; ui.md §6, conventions.md §3.1).
//
// `PluginKind` and Hub's container kinds are **Python**, and the inspector registry is TypeScript.
// TypeScript cannot import a `StrEnum`, so the two vocabularies are generated — and a generated copy
// with nothing watching its source is a copy that goes quietly stale, which is what `ui#6` found
// when View's vendored Core schema turned out to be three tags behind.
//
// **What is vendored is the members, not the module.** `hub/registry/_oci.py` is four hundred lines
// that change for reasons having nothing to do with `ARTIFACT_KINDS` — descriptors, blob layout,
// the referrers API. A byte-equality guard over that file would go red on every unrelated edit, and
// a guard that cries wolf is a guard someone eventually mutes. So the pin records the *extracted
// members*, and drift means the vocabulary actually moved.
//
// Two forms, because the two vocabularies are not shaped alike upstream, and pretending otherwise
// would be the first place this goes wrong:
//
//   `str-enum`  — `class PluginKind(StrEnum):` with `MEMBER = "value"` lines.
//   `str-tuple` — `ARTIFACT_KINDS: tuple[str, ...] = ("policy", "world", …)`. Hub's container
//                 vocabulary is a tuple, not an enum, whatever the issue text calls it.
//
// Every failure here is **hard**. A symbol that has moved, a class that has been renamed, a block
// that parses to zero members: each raises rather than yielding an empty vocabulary, because an
// empty vocabulary would generate a `never` type that typechecks fine and matches nothing.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The repository root, from `scripts/lib/`. */
export const REPO_ROOT = resolve(HERE, "..", "..");

/** Where the pin lives — inside the package it feeds, beside the generated output it explains. */
export const PIN_PATH = join(
  REPO_ROOT,
  "packages",
  "inspectors",
  "src",
  "vocabulary",
  "platform-pin.json",
);

/** Where the generated TypeScript lands. */
export const GENERATED_PATH = join(
  REPO_ROOT,
  "packages",
  "inspectors",
  "src",
  "generated",
  "vocabularies.ts",
);

/** The credential every cross-repository read in this workspace uses (one name, one rotation). */
export const TOKEN_NAME = "CORE_REPO_TOKEN";

/**
 * The vocabularies this front end mirrors, and where each one lives upstream.
 *
 * Adding an entry here is a deliberate act: it is a new dependency on a Python symbol, and it comes
 * with the obligation to keep the guard's failure message pointing at something a reader can fix.
 */
export const VOCABULARIES = [
  {
    /** The exported TypeScript name. */
    name: "PluginKind",
    symbol: "PluginKind",
    form: "str-enum",
    source: "src/astro_mine/core/registry/enums.py",
    owner: "Core",
    axis: "interface",
    what: "which Core interface a plugin implements",
  },
  {
    name: "ArtifactKind",
    symbol: "ARTIFACT_KINDS",
    form: "str-tuple",
    source: "src/astro_mine/hub/registry/_oci.py",
    owner: "Hub",
    axis: "container",
    what: "what shape of payload an artifact carries",
  },
];

/** A member must look like the wire value it is: `field_model`, `world_provider`, `policy`. */
const MEMBER = /^[a-z][a-z0-9_]*$/;

export class VocabularyError extends Error {
  name = "VocabularyError";
}

/**
 * The body of a `class <symbol>(...):` block — every line up to the next top-level statement.
 *
 * Python has no braces, so the block ends where the indentation returns to column zero. Blank lines
 * and comments do not end it; anything else at column zero does.
 */
function classBody(source, symbol) {
  const header = new RegExp(`^class\\s+${symbol}\\s*\\(`, "m").exec(source);
  if (!header) return null;

  const lines = source.slice(header.index).split("\n").slice(1);
  const body = [];
  for (const line of lines) {
    if (line.trim() === "" || /^\s/.test(line)) {
      body.push(line);
      continue;
    }
    break;
  }
  return body.join("\n");
}

/** `MEMBER = "value"` lines inside an enum body, in declaration order. */
function readStrEnum(source, symbol) {
  const body = classBody(source, symbol);
  if (body === null) {
    throw new VocabularyError(`no \`class ${symbol}(...)\` in the file`);
  }
  const members = [];
  for (const match of body.matchAll(/^\s+[A-Z][A-Z0-9_]*\s*=\s*"([^"]*)"\s*$/gm)) {
    members.push(match[1]);
  }
  return members;
}

/** The quoted strings inside `SYMBOL: ... = ( ... )`, in declaration order. */
function readStrTuple(source, symbol) {
  const header = new RegExp(`^${symbol}\\s*(?::[^=\\n]*)?=\\s*\\(`, "m").exec(source);
  if (!header) {
    throw new VocabularyError(`no \`${symbol} = (...)\` assignment in the file`);
  }
  const open = source.indexOf("(", header.index);
  const close = source.indexOf(")", open);
  if (close === -1) {
    throw new VocabularyError(`\`${symbol}\` opens a tuple that is never closed`);
  }
  const members = [];
  for (const match of source.slice(open + 1, close).matchAll(/"([^"]*)"/g)) {
    members.push(match[1]);
  }
  return members;
}

/**
 * Extract one vocabulary's members from the Python source that declares it.
 *
 * @param {string} source  the module's text
 * @param {{symbol: string, form: string}} vocabulary
 * @returns {string[]} the members, in upstream declaration order
 * @throws {VocabularyError} on a missing symbol, an unparseable block, an empty result, or a member
 *         that does not look like a wire value — each of which is a silent-wrong-answer risk, and
 *         so is raised rather than absorbed.
 */
export function extract(source, vocabulary) {
  const { symbol, form } = vocabulary;
  const members = form === "str-enum" ? readStrEnum(source, symbol) : readStrTuple(source, symbol);

  if (members.length === 0) {
    throw new VocabularyError(
      `\`${symbol}\` was found but parsed to zero members. Either it is now declared some other ` +
        `way, or this extractor no longer understands it — both are reasons to stop rather than ` +
        `to generate an empty vocabulary, which would typecheck and match nothing.`,
    );
  }

  const malformed = members.filter((member) => !MEMBER.test(member));
  if (malformed.length > 0) {
    throw new VocabularyError(
      `\`${symbol}\` yielded members that do not look like wire values: ${malformed.join(", ")}. ` +
        `The extractor has almost certainly picked up something that is not the vocabulary.`,
    );
  }

  const duplicates = members.filter((member, i) => members.indexOf(member) !== i);
  if (duplicates.length > 0) {
    throw new VocabularyError(`\`${symbol}\` yielded duplicate members: ${duplicates.join(", ")}`);
  }

  return members;
}

/** Read the committed pin. */
export function readPin(path = PIN_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}
