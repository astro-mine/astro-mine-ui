#!/usr/bin/env node
// Proof that reading a sibling repository from a clone is not a weaker check (ui#51).
//
// This module exists so three contract gates can run with no credential. That is only worth having
// if the local path cannot say "in step" where the networked one would say "drift" — so every way it
// could lie is asserted here, against **real git repositories** built in a temp directory rather
// than against mocks. A mock of `git show` would prove that this file agrees with itself.
//
// The four lies worth preventing, and the tests that prevent them:
//
//   1. reading the working tree, so a dirty clone passes on bytes that are committed nowhere;
//   2. falling back to the local HEAD, so a clone on a feature branch answers a question about the
//      default branch;
//   3. running in CI, where a clone proves nothing the repository does not already believe;
//   4. a typo'd path reading as "the upstream file is missing", i.e. as drift.
//
//   node --test scripts/lib/local-checkout.test.mjs      (or `pnpm check:local-checkout:test`)

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  LocalCheckoutError,
  defaultBranchHead,
  requireCommit,
  resolveCheckout,
  showAt,
  stalenessNote,
} from "./local-checkout.mjs";

const git = (cwd, ...args) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" },
  });

/**
 * An "upstream" repository and a clone of it, as they really are on disk.
 *
 * The clone is a real `git clone`, so `origin/HEAD` exists exactly as it does in this workspace.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "local-checkout-"));
  const upstream = join(root, "upstream");
  mkdirSync(upstream);
  git(upstream, "init", "--quiet", "--initial-branch=main");
  git(upstream, "config", "user.email", "t@example.org");
  git(upstream, "config", "user.name", "T");
  mkdirSync(join(upstream, "nested"));
  writeFileSync(join(upstream, "nested", "file.txt"), "committed\n");
  git(upstream, "add", ".");
  git(upstream, "commit", "--quiet", "-m", "one");
  const first = git(upstream, "rev-parse", "HEAD").trim();

  const clone = join(root, "clone");
  git(root, "clone", "--quiet", upstream, clone);
  git(clone, "config", "user.email", "t@example.org");
  git(clone, "config", "user.name", "T");

  return {
    root,
    upstream,
    clone,
    first,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("reads the committed bytes, never the working tree", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  // The lie this prevents: a local edit that makes the gate green on bytes CI has never seen.
  writeFileSync(join(f.clone, "nested", "file.txt"), "LOCAL EDIT\n");

  const head = defaultBranchHead(f.clone, "upstream");
  const bytes = showAt(f.clone, head.commit, "nested/file.txt", "upstream");
  assert.equal(bytes.toString(), "committed\n");
});

test("compares against the default branch, not whatever is checked out", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  // A clone sitting on a feature branch with its own commit. `origin/HEAD` still points at main,
  // and that is the question CI asks.
  git(f.clone, "checkout", "--quiet", "-b", "feature");
  writeFileSync(join(f.clone, "nested", "file.txt"), "feature work\n");
  git(f.clone, "add", ".");
  git(f.clone, "commit", "--quiet", "-m", "feature");

  const head = defaultBranchHead(f.clone, "upstream");
  assert.equal(head.commit, f.first);
  assert.equal(
    showAt(f.clone, head.commit, "nested/file.txt", "upstream").toString(),
    "committed\n",
  );
});

test("refuses to guess when the clone has no origin/HEAD or origin/main", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  git(f.clone, "remote", "remove", "origin");
  assert.throws(
    () => defaultBranchHead(f.clone, "upstream"),
    (error) =>
      error instanceof LocalCheckoutError && /no origin\/HEAD or origin\/main/.test(error.message),
  );
});

test("sees the upstream move, which is the whole point", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  writeFileSync(join(f.upstream, "nested", "file.txt"), "moved on\n");
  git(f.upstream, "add", ".");
  git(f.upstream, "commit", "--quiet", "-m", "two");

  // Before fetching, the clone answers the old commit — which is exactly why callers print the
  // staleness note rather than claiming agreement with the remote.
  assert.equal(defaultBranchHead(f.clone, "upstream").commit, f.first);

  git(f.clone, "fetch", "--quiet", "origin");
  const head = defaultBranchHead(f.clone, "upstream");
  assert.notEqual(head.commit, f.first);
  assert.equal(
    showAt(f.clone, head.commit, "nested/file.txt", "upstream").toString(),
    "moved on\n",
  );
});

test("a missing path is a hard failure that names the file", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  const head = defaultBranchHead(f.clone, "upstream");
  assert.throws(
    () => showAt(f.clone, head.commit, "nested/gone.txt", "upstream"),
    (error) =>
      error instanceof LocalCheckoutError &&
      /nested\/gone\.txt is not in upstream/.test(error.message),
  );
});

test("a commit the clone has not fetched is refused, not approximated", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  writeFileSync(join(f.upstream, "nested", "file.txt"), "pinned later\n");
  git(f.upstream, "add", ".");
  git(f.upstream, "commit", "--quiet", "-m", "later");
  const later = git(f.upstream, "rev-parse", "HEAD").trim();

  assert.throws(
    () => requireCommit(f.clone, later, "upstream"),
    (error) => error instanceof LocalCheckoutError && /does not have commit/.test(error.message),
  );

  git(f.clone, "fetch", "--quiet", "origin");
  assert.doesNotThrow(() => requireCommit(f.clone, later, "upstream"));
});

test("is refused in CI, where a clone proves nothing", () => {
  assert.throws(
    () =>
      resolveCheckout({
        argv: ["node", "check", "--from", "/anywhere"],
        env: { CI: "true" },
        envName: "ASTRO_MINE_PLATFORM_REPO",
        repoName: "astro-mine/astro-mine-platform",
      }),
    (error) => error instanceof LocalCheckoutError && /refused in CI/.test(error.message),
  );
});

test("returns null when neither the flag nor the variable is set", () => {
  assert.equal(
    resolveCheckout({
      argv: ["node", "check"],
      env: {},
      envName: "ASTRO_MINE_API_REPO",
      repoName: "astro-mine/astro-mine-api",
    }),
    null,
  );
});

test("rejects a path that is absent or is not a repository, rather than reading it as drift", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  const base = { argv: ["node", "check"], envName: "X", repoName: "upstream" };
  assert.throws(
    () => resolveCheckout({ ...base, env: { X: join(f.root, "typo") } }),
    (error) => error instanceof LocalCheckoutError && /no upstream checkout at/.test(error.message),
  );

  const notARepo = join(f.root, "plain");
  mkdirSync(notARepo);
  assert.throws(
    () => resolveCheckout({ ...base, env: { X: notARepo } }),
    (error) => error instanceof LocalCheckoutError && /is not a git repository/.test(error.message),
  );
});

test("--from with no path is an error, not a silent networked run", () => {
  assert.throws(
    () =>
      resolveCheckout({
        argv: ["node", "check", "--from"],
        env: {},
        envName: "X",
        repoName: "upstream",
      }),
    (error) => error instanceof LocalCheckoutError && /--from needs a path/.test(error.message),
  );
});

test("the staleness note names the ref, the commit and what was NOT compared", (t) => {
  const f = fixture();
  t.after(f.cleanup);

  const head = defaultBranchHead(f.clone, "upstream");
  const note = stalenessNote(f.clone, head, "astro-mine/astro-mine-platform");
  assert.match(note, /origin\/HEAD/);
  assert.match(note, new RegExp(head.commit.slice(0, 9)));
  assert.match(note, /as fresh as its last `git fetch`/);
  assert.match(note, /not\n\s+against astro-mine\/astro-mine-platform as it is right now/);
});
