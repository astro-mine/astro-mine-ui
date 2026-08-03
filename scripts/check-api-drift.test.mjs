#!/usr/bin/env node
// Proof that the contract gate is a gate (ui#8).
//
// Every other gate in this repository carries one — `check-layering.test.mjs`,
// `check-no-handwritten-api-types.test.mjs`, `check-vocabularies.test.mjs` — and the **contract**
// lane, which is the one that protects the front end from an API change nobody noticed, did not.
// `ui#8`'s acceptance criteria name it directly: "the contract lane fails when the API changes,
// proven the same way."
//
// It is proven the honest way: by actually mutating the vendored document, running the real script,
// and asserting it exits non-zero — then putting the tree back. A fixture tree would prove less,
// because the interesting half of this gate is `git status` over the *real* generated directory.
//
//   node --test scripts/check-api-drift.test.mjs      (or `pnpm check:api-drift:test`)

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCUMENT = resolve(REPO, "packages/api-client/openapi/openapi.json");
const GENERATED = resolve(REPO, "packages/api-client/src/generated/schema.gen.ts");

/** Run the local half of the gate. Returns `{ code, output }` rather than throwing. */
function runGate() {
  try {
    const output = execFileSync(process.execPath, ["scripts/check-api-drift.mjs", "--local"], {
      cwd: REPO,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { code: 0, output };
  } catch (error) {
    return { code: error.status ?? 1, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

/** Restore everything the gate or a test may have touched. */
function restore() {
  execFileSync(
    "git",
    ["checkout", "--", "packages/api-client/openapi", "packages/api-client/src/generated"],
    { cwd: REPO, stdio: "pipe" },
  );
}

test("passes on the committed tree", () => {
  const { code } = runGate();
  assert.equal(code, 0, "the gate should be green on an unmodified checkout");
});

test("fails when the document changes and the client is not regenerated", () => {
  // The real scenario, and the reason this lane exists: astro-mine-api adds a field, somebody
  // vendors the new document, and the generated client is left as it was. The client then types a
  // response the API no longer sends.
  const original = readFileSync(DOCUMENT, "utf8");
  try {
    const document = JSON.parse(original);
    document.components.schemas.ArtifactDetail.properties.invented_by_this_test = {
      title: "Invented",
      type: "string",
    };
    writeFileSync(DOCUMENT, `${JSON.stringify(document, null, 2)}\n`);

    const { code, output } = runGate();

    assert.equal(code, 1, "a changed document with a stale client must fail the gate");
    assert.match(output, /does not match the document it is generated from/);
  } finally {
    restore();
  }
});

test("regenerates over an UNCOMMITTED hand edit rather than failing on it", () => {
  // Not the behaviour I expected when writing this, and worth pinning precisely because of that.
  //
  // The gate regenerates *first* and then asks `git`, so an edit that is only in the working tree
  // is overwritten before anything compares it — and the run goes green. That is not a hole: the
  // question the gate exists to answer is "does the **committed** client match the document", which
  // is what CI checks out and what a reviewer reads. An uncommitted edit is not yet anybody's
  // problem, and silently repairing it is the friendliest thing to do with it.
  //
  // What it does mean is that `pnpm check:api-drift:local` does **not** protect your working tree
  // from a hand edit — it protects the branch. Anyone tempted to "fix" the ordering so it fails
  // here should know it would then fail every time the emitter is legitimately mid-change.
  const original = readFileSync(GENERATED, "utf8");
  try {
    writeFileSync(GENERATED, `${original}\nexport type HandEdited = { invented: true };\n`);

    const { code } = runGate();

    assert.equal(code, 0, "an uncommitted hand edit is regenerated away, not reported");
    assert.equal(
      readFileSync(GENERATED, "utf8").includes("HandEdited"),
      false,
      "the regeneration should have removed it",
    );
  } finally {
    restore();
  }
});

test("fails when a generated file is deleted, which `git diff` alone cannot see", () => {
  // The case the script's own comment calls out: `git diff` is blind to an untracked file, so a
  // generated file that was deleted and then rewritten by the regeneration would leave `git diff`
  // empty. The gate uses `git status --untracked-files=all` for exactly this, and nothing has ever
  // demonstrated that it works.
  const original = readFileSync(GENERATED, "utf8");
  try {
    execFileSync(
      "git",
      ["rm", "--cached", "--quiet", "packages/api-client/src/generated/schema.gen.ts"],
      {
        cwd: REPO,
        stdio: "pipe",
      },
    );

    const { code, output } = runGate();

    assert.equal(code, 1, "an untracked generated file must fail the gate");
    assert.match(output, /does not match the document it is generated from/);
  } finally {
    execFileSync("git", ["reset", "--quiet", "--", "packages/api-client/src/generated"], {
      cwd: REPO,
      stdio: "pipe",
    });
    writeFileSync(GENERATED, original);
    restore();
  }
});

test("leaves the tree clean afterwards", () => {
  // Every test above mutates real files. If one of them leaked, the next developer's `git status`
  // would carry an edit nobody made — so the suite asserts its own tidiness rather than assuming it.
  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all", "--", "packages/api-client"],
    { cwd: REPO, encoding: "utf8" },
  ).trim();

  assert.equal(status, "", `the drift tests left the tree dirty:\n${status}`);
});
