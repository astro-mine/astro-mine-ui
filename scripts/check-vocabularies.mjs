#!/usr/bin/env node
// Fail when a vocabulary the inspector registry mirrors has moved upstream (ui#7).
//
//   node scripts/check-vocabularies.mjs            both halves; CI runs this
//   node scripts/check-vocabularies.mjs --local     the offline half only, for a laptop
//
// Two assertions, and each catches something the other cannot:
//
//   1. OFFLINE — the committed `src/generated/vocabularies.ts` is exactly what the pin generates.
//      This is the hand-edit check. Someone adding a member to the TypeScript because they needed
//      it *today* would otherwise get a green build and a front end whose vocabulary the platform
//      has never heard of.
//
//   2. NETWORKED — the pinned members are still what the platform declares at its DEFAULT BRANCH
//      HEAD. This is the one the issue asks for: "the drift guards fail the build when a
//      vocabulary moves upstream."
//
// **HEAD, not the pinned commit.** `check-core-schema.mjs` reads its vendored files at the SHA its
// own pin names, which makes it a tamper check rather than a drift check — it cannot see the
// platform moving, because it never looks anywhere the platform has moved to. Reading HEAD is what
// `check-api-drift.mjs` does for the OpenAPI document and it is what makes a drift guard a drift
// guard. The cost is real and worth naming: a `PluginKind` added upstream turns this lane red on an
// unrelated pull request here. That is the alarm working. The fix is one command.
//
// **Absent upstream is a hard failure, never a skip** — a missing credential, a 404 on a file that
// moved, a class that has been renamed. A compatibility check that goes quiet when its subject
// disappears has stopped existing, and it goes quiet on exactly the day nobody is looking.
//
// Exported as `compareVocabularies` so the failure modes can be proven against fixtures
// (`check-vocabularies.test.mjs`). A gate nothing can prove *fails* is not a gate.

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  GENERATED_PATH,
  PIN_PATH,
  VOCABULARIES,
  extract,
  readPin,
} from "./lib/platform-vocabularies.mjs";
import { fileAt, headCommit, requireToken } from "./lib/platform-fetch.mjs";

const PLATFORM_REPO = "astro-mine/astro-mine-platform";

let failed = false;

function fail(message) {
  console.error(`\n✗ vocabulary drift check failed\n\n${message}\n`);
  failed = true;
}

/**
 * Compare pinned members against upstream ones, vocabulary by vocabulary.
 *
 * Pure, so the test can drive it without a network: returns a list of human-readable differences,
 * empty when the two agree.
 *
 * @param {Record<string, {members: string[]}>} pinned
 * @param {Record<string, string[]>} upstream
 * @returns {string[]}
 */
export function compareVocabularies(pinned, upstream) {
  const differences = [];
  for (const vocabulary of VOCABULARIES) {
    const before = pinned[vocabulary.name]?.members ?? [];
    const after = upstream[vocabulary.name] ?? [];

    const added = after.filter((member) => !before.includes(member));
    const removed = before.filter((member) => !after.includes(member));
    const reordered =
      added.length === 0 && removed.length === 0 && before.join(",") !== after.join(",");

    if (added.length === 0 && removed.length === 0 && !reordered) continue;

    const parts = [];
    if (added.length > 0) parts.push(`added upstream: ${added.join(", ")}`);
    // A removal is worth its own sentence: both vocabularies are documented as append-only, so a
    // member disappearing is either a breaking upstream change or a broken extractor, and the two
    // want very different responses.
    if (removed.length > 0) {
      parts.push(
        `REMOVED upstream: ${removed.join(", ")} — both vocabularies are append-only by ` +
          `documented contract, so this is either a breaking platform change or a parser that has ` +
          `stopped understanding the source. Read the upstream file before regenerating.`,
      );
    }
    if (reordered) parts.push("the same members, in a different declaration order");

    differences.push(
      `${vocabulary.name} (${vocabulary.symbol} in ${vocabulary.source})\n    ` +
        parts.join("\n    "),
    );
  }
  return differences;
}

// ---------------------------------------------------------------------------------------------
// Half 1 — the committed output is what the pin generates.
// ---------------------------------------------------------------------------------------------

function checkGeneratedOutput() {
  if (!existsSync(GENERATED_PATH)) {
    fail(`${GENERATED_PATH} does not exist. Run \`pnpm codegen:vocabularies\`.`);
    return false;
  }

  const before = readFileSync(GENERATED_PATH, "utf8");
  execFileSync(process.execPath, ["scripts/codegen-vocabularies.mjs"], { stdio: "pipe" });
  const after = readFileSync(GENERATED_PATH, "utf8");

  if (before === after) {
    console.log("✓ the generated vocabularies are what the pin generates");
    return true;
  }

  // Put the tree back, so a failing check does not also leave a dirty working copy.
  execFileSync("git", ["checkout", "--", GENERATED_PATH], { stdio: "pipe" });
  fail(
    `${GENERATED_PATH} is not what \`pnpm codegen:vocabularies\` produces from the pin.\n\n` +
      `  Somebody edited the generated file by hand. It is generated output: the vocabularies come\n` +
      `  from the platform, and a member added here is a member the platform has never heard of.\n` +
      `  If the vocabulary really did change, refresh the pin instead:\n` +
      `      pnpm codegen:vocabularies --refresh`,
  );
  return false;
}

// ---------------------------------------------------------------------------------------------
// Half 2 — the pin is what the platform declares at HEAD.
// ---------------------------------------------------------------------------------------------

async function checkAgainstPlatform() {
  const pin = readPin();
  let token;
  let head;
  const upstream = {};

  try {
    token = requireToken();
    head = await headCommit(PLATFORM_REPO, token);
    for (const vocabulary of VOCABULARIES) {
      const source = await fileAt(PLATFORM_REPO, head, vocabulary.source, token);
      upstream[vocabulary.name] = extract(source, vocabulary);
    }
  } catch (error) {
    fail(error.message);
    return false;
  }

  const differences = compareVocabularies(pin.vocabularies, upstream);
  if (differences.length === 0) {
    console.log(
      `✓ the pinned vocabularies match ${PLATFORM_REPO} at ${head.slice(0, 9)} ` +
        `(${VOCABULARIES.map((v) => v.name).join(", ")})`,
    );
    return true;
  }

  fail(
    `a vocabulary the inspector registry resolves on has moved.\n\n` +
      `  pinned at ${pin.commit.slice(0, 9)}, platform now at ${head.slice(0, 9)}:\n\n` +
      `  ${differences.join("\n\n  ")}\n\n` +
      `  Read the change before regenerating — a new PluginKind is an artifact the registry will\n` +
      `  now see and has no inspector for, which is a fallback panel a user meets, not a no-op.\n` +
      `  Then:\n` +
      `      pnpm codegen:vocabularies --refresh\n` +
      `  and commit ${PIN_PATH.split("/").slice(-4).join("/")} with the regenerated TypeScript.`,
  );
  return false;
}

// ---------------------------------------------------------------------------------------------

// Only when run as a command. The test imports `compareVocabularies` from here, and an import that
// also ran both halves would need a network and would exit the test process.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const localOnly = process.argv.includes("--local");

  const generatedOk = checkGeneratedOutput();
  const upstreamOk = localOnly ? true : await checkAgainstPlatform();

  if (localOnly) {
    console.log(
      `\n  (--local: skipped the comparison against ${PLATFORM_REPO}. CI runs both halves.)`,
    );
  }

  if (generatedOk && upstreamOk && !failed) {
    console.log("\nThe vocabularies are in step with the platform.");
  }

  process.exit(failed ? 1 : 0);
}
