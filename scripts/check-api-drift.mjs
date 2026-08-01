#!/usr/bin/env node
// The drift gate (ui#2; ui.md §8 "Contract", §10.6; ui-rebuild-plan §6).
//
// The OpenAPI document is the contract, and a contract nothing checks is a comment. Two halves,
// because they catch different things and only one of them needs a credential:
//
//   1. THE COMMITTED CLIENT == THE VENDORED DOCUMENT.
//      Regenerate and fail on any diff. This is what makes "no hand-edited generated client" a
//      build failure rather than a review comment. Needs nothing: it runs on every pull request,
//      including from a fork, and offline.
//
//   2. THE VENDORED DOCUMENT == astro-mine-api AT HEAD.
//      The API is a separate, private repository, so a runner must be given read access to it —
//      `CORE_REPO_TOKEN`, the org's private-repo read credential, the same name the API's own CI
//      uses for the platform. Without it this half CANNOT run, and it FAILS rather than skips: a
//      gate that goes quiet when its credential expires is a gate that stops existing on exactly
//      the day nobody notices.
//
// The second half compares against astro-mine-api's committed `tests/openapi_snapshot.json`, not
// against a live server. That file is not a copy of the document, it *is* the document: that
// repository's own `tests/test_openapi_contract.py` fails when it and the live app disagree. So
// the chain is: their CI proves snapshot == live document, ours proves vendored == snapshot and
// client == vendored. No server, no Python, no platform wheel in this workflow.
//
//   node scripts/check-api-drift.mjs              both halves
//   node scripts/check-api-drift.mjs --local      the first half only, for a laptop
//
// Exit 0 = in step; exit 1 = drift, with the diff and what to do about it.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDORED = resolve(repoRoot, "packages/api-client/openapi/openapi.json");
const GENERATED = "packages/api-client/src/generated";

/** Where the API keeps the document it gates. */
const API_REPO = "astro-mine/astro-mine-api";
const API_SNAPSHOT = "tests/openapi_snapshot.json";
const TOKEN_NAME = "CORE_REPO_TOKEN";

function fail(message) {
  console.error(`\n[31m✗[0m ${message}\n`);
  process.exitCode = 1;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
}

// ---------------------------------------------------------------------------------------------
// Half 1 — the committed client is what the document generates.
// ---------------------------------------------------------------------------------------------

function checkGeneratedOutput() {
  run("node", ["scripts/codegen-api-client.mjs"], { stdio: "pipe" });

  // `git status`, NOT `git diff`. `git diff` compares tracked files against the index and is blind
  // to an untracked one — so a generated file that was never committed, or one deleted and then
  // rewritten by the regeneration above, would leave `git diff` empty and this gate green while
  // the committed client and the document disagreed entirely. `--porcelain` reports added,
  // modified, deleted and untracked alike, which is the actual question being asked.
  const status = run("git", [
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    GENERATED,
  ]).trim();
  if (status === "") {
    console.log(`✓ the committed client matches ${VENDORED.replace(`${repoRoot}/`, "")}`);
    return true;
  }

  // The diff is empty for an untracked file; print it anyway for the modified case, where it is
  // the most useful thing on the screen.
  const diff = run("git", ["diff", "--", GENERATED]);
  if (diff.trim() !== "") console.error(diff);

  fail(
    `the committed client does not match the document it is generated from.\n\n` +
      `  ${status.split("\n").join("\n  ")}\n\n` +
      `  Either the generated output was hand-edited — regenerate it and commit the result:\n` +
      `      pnpm codegen:api\n` +
      `  ...or the emitter changed and its output was not committed alongside it,\n` +
      `  ...or the vendored document was refreshed without regenerating.`,
  );
  return false;
}

// ---------------------------------------------------------------------------------------------
// Half 2 — the vendored document is astro-mine-api's, at HEAD.
// ---------------------------------------------------------------------------------------------

function fetchApiSnapshot(token) {
  const checkout = mkdtempSync(join(tmpdir(), "astro-mine-api-"));
  try {
    // A blobless, single-branch, depth-1 clone: the whole history is irrelevant, and this is the
    // difference between a lane that takes two seconds and one that takes a minute.
    run("git", [
      "clone",
      "--quiet",
      "--depth",
      "1",
      "--filter=blob:none",
      "--no-tags",
      `https://x-access-token:${token}@github.com/${API_REPO}.git`,
      checkout,
    ]);
    const head = run("git", ["-C", checkout, "rev-parse", "HEAD"]).trim();
    const snapshot = join(checkout, API_SNAPSHOT);
    if (!existsSync(snapshot)) {
      fail(
        `${API_REPO} was cloned, but it has no \`${API_SNAPSHOT}\`.\n\n` +
          `  That file is the contract this client is generated from. If the API moved it, this\n` +
          `  script and \`scripts/codegen-api-client.mjs\` both need to learn where.`,
      );
      return null;
    }
    return { bytes: readFileSync(snapshot), head };
  } catch (error) {
    // The two causes look identical in a log — a red lane here must not be read as "the API
    // changed" when it actually means "the credential stopped working".
    fail(
      `${API_REPO} could not be read with \`${TOKEN_NAME}\`.\n\n` +
        `  This is a CREDENTIAL failure, not API drift. The token is missing, expired, or scoped\n` +
        `  to a different repository. Fix it with:\n` +
        `      gh secret set ${TOKEN_NAME} --repo astro-mine/astro-mine-ui\n` +
        `  using a token with Contents: read on ${API_REPO}.\n\n` +
        `  git said: ${String(error.message).split("\n")[0]}`,
    );
    return null;
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}

function checkVendoredDocument() {
  const token = process.env[TOKEN_NAME];
  if (!token) {
    fail(
      `\`${TOKEN_NAME}\` is not set, so the vendored document cannot be compared to ${API_REPO}.\n\n` +
        `  This half of the gate fails rather than skips, deliberately: a contract check that goes\n` +
        `  quiet when its credential is absent is a contract check that has stopped existing.\n\n` +
        `  In CI:    gh secret set ${TOKEN_NAME} --repo astro-mine/astro-mine-ui\n` +
        `  Locally:  run \`node scripts/check-api-drift.mjs --local\`, which checks only that the\n` +
        `            committed client matches the vendored document.`,
    );
    return false;
  }

  const upstream = fetchApiSnapshot(token);
  if (!upstream) return false;

  const vendored = readFileSync(VENDORED);
  if (vendored.equals(upstream.bytes)) {
    console.log(`✓ the vendored document matches ${API_REPO} at ${upstream.head.slice(0, 7)}`);
    return true;
  }

  fail(
    `the vendored OpenAPI document is not the one ${API_REPO} serves at ${upstream.head.slice(0, 7)}.\n\n` +
      `  The API changed. Read the diff before regenerating — an operation id, a response shape or\n` +
      `  an error code that moved is a change to what every page can call.\n\n` +
      `  Then, from a checkout of ${API_REPO}:\n` +
      `      pnpm codegen:api --from ../astro-mine-api/${API_SNAPSHOT}\n` +
      `  and commit the refreshed document together with the regenerated client.`,
  );
  return false;
}

// ---------------------------------------------------------------------------------------------

const localOnly = process.argv.includes("--local");

const generatedOk = checkGeneratedOutput();
const vendoredOk = localOnly ? true : checkVendoredDocument();

if (localOnly) {
  console.log(`\n  (--local: skipped the comparison against ${API_REPO}. CI runs both halves.)`);
}

if (generatedOk && vendoredOk) console.log("\nThe client is in step with the contract.");
