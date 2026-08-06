// Reading a sibling repository from a local clone instead of from GitHub (ui#51).
//
// **Why this exists.** Three gates compare something committed here against something committed in
// a sibling repository: the vendored OpenAPI document against `astro-mine-api`, the vendored Core
// schemas and the vocabulary pin against `astro-mine-platform`. All three read GitHub over the
// network with `CORE_REPO_TOKEN`, because those repositories are private — and all three therefore
// **could not run on a developer machine at all**. "Run the gates before you push" was advice nobody
// could take for a third of them.
//
// This workspace already has both repositories cloned beside this one, so the bytes are on disk.
// Reading them from there is not a weaker check, provided three things are true, and this module
// exists to make them true rather than hoped for:
//
//   1. **Read from a commit, never from the working tree.** `git show <ref>:<path>`, so a clone with
//      uncommitted edits — or a half-finished rebase — cannot produce a green that the same bytes
//      in CI would not. The single most likely way a local mode lies is by reading a dirty file.
//   2. **Compare against the same ref CI would.** The networked half reads the *default branch's*
//      head, so this resolves `origin/HEAD` and refuses to fall back to the local `HEAD`: a clone
//      sitting on a feature branch would otherwise silently compare against that branch.
//   3. **Say how stale it might be.** A clone is exactly as fresh as its last `git fetch`, and a
//      gate that reports "in step" against a three-week-old fetch has told the reader something
//      untrue. Every caller prints the commit and its date, and the words say what was compared.
//
// **CI must not take this path**, and it is refused rather than discouraged: the whole value of the
// networked half is that it sees the upstream *move*, which a clone in a CI job never would.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export class LocalCheckoutError extends Error {
  name = "LocalCheckoutError";
}

/** `git` in a checkout, returning stdout. Throws {@link LocalCheckoutError} with git's own words. */
function git(checkout, args, { encoding = "utf8" } = {}) {
  try {
    return execFileSync("git", ["-C", checkout, ...args], {
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const said = String(error.stderr ?? error.message)
      .split("\n")
      .find((line) => line.trim() !== "");
    throw new LocalCheckoutError(`git ${args.join(" ")} failed in ${checkout}: ${said ?? "?"}`);
  }
}

/**
 * Where to read a sibling repository from, or `null` for the networked path.
 *
 * `--from <path>` on the command line, else the environment variable. Returns an absolute path and
 * validates that it is a git repository, because the failure that is worth catching early is a typo
 * in a path — which would otherwise surface as "the upstream file is missing", i.e. as drift.
 *
 * @param {{argv?: string[], env?: Record<string, string|undefined>, envName: string, repoName: string}} options
 */
export function resolveCheckout({ argv = process.argv, env = process.env, envName, repoName }) {
  const flagIndex = argv.indexOf("--from");
  const fromFlag = flagIndex === -1 ? undefined : argv[flagIndex + 1];
  if (flagIndex !== -1 && (fromFlag === undefined || fromFlag.startsWith("--"))) {
    throw new LocalCheckoutError(`--from needs a path to a ${repoName} checkout.`);
  }
  const raw = fromFlag ?? env[envName];
  if (raw === undefined || raw === "") return null;

  // Refused, not merely warned about. In CI the comparison against the real upstream is the entire
  // point: a clone inside a CI job is a copy of what this repository already believes, so a gate
  // reading one would be the `consumer-smoke` failure this project has met before — structurally
  // unable to fail, and green for months.
  if (env.CI) {
    throw new LocalCheckoutError(
      `--from/${envName} is refused in CI.\n\n` +
        `  This mode exists so the gate can run on a machine with no credential. In CI the\n` +
        `  networked comparison is the only one that means anything: it is what sees ${repoName}\n` +
        `  move. Pass CORE_REPO_TOKEN instead.`,
    );
  }

  const checkout = resolve(raw);
  if (!existsSync(checkout)) {
    throw new LocalCheckoutError(
      `no ${repoName} checkout at ${checkout}.\n\n` +
        `  Clone it beside this repository, or point --from/${envName} at your checkout.`,
    );
  }
  // `--git-dir` rather than a `.git` existence test, so a worktree or a submodule resolves too.
  try {
    git(checkout, ["rev-parse", "--git-dir"]);
  } catch {
    throw new LocalCheckoutError(`${checkout} is not a git repository.`);
  }
  return checkout;
}

/**
 * The head of the checkout's **default branch**, as `{ ref, commit, committed }`.
 *
 * `origin/HEAD` is the honest answer and `origin/main` is the fallback for a clone that never had
 * its origin head set (a `--depth 1 --single-branch` clone often has neither). The local `HEAD` is
 * deliberately **not** a fallback: comparing against whatever branch somebody happens to have
 * checked out is a different question from the one CI asks, and it would answer it silently.
 */
export function defaultBranchHead(checkout, repoName) {
  const candidates = ["refs/remotes/origin/HEAD", "refs/remotes/origin/main"];
  for (const candidate of candidates) {
    let commit;
    try {
      commit = git(checkout, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`]).trim();
    } catch {
      continue;
    }
    if (commit === "") continue;
    const committed = git(checkout, ["log", "-1", "--format=%cI", commit]).trim();
    return { ref: candidate.replace("refs/remotes/", ""), commit, committed };
  }
  throw new LocalCheckoutError(
    `${checkout} has no origin/HEAD or origin/main to compare against.\n\n` +
      `  This mode compares against ${repoName}'s default branch, which is what CI reads. A clone\n` +
      `  with neither ref cannot answer that question — the local HEAD is not a substitute, because\n` +
      `  it may be a feature branch. Fix it with:\n` +
      `      git -C ${checkout} fetch origin && git -C ${checkout} remote set-head origin --auto`,
  );
}

/**
 * One file's bytes at a ref. **From the object database, never the working tree.**
 *
 * A missing path is reported as the upstream being absent, which is the same hard failure the
 * networked readers give a 404: a vendored copy of a file nobody can find is a copy nobody is
 * maintaining.
 */
export function showAt(checkout, ref, path, repoName) {
  try {
    return git(checkout, ["show", `${ref}:${path}`], { encoding: "buffer" });
  } catch (error) {
    throw new LocalCheckoutError(
      `${path} is not in ${repoName} at ${String(ref).slice(0, 12)}.\n\n` +
        `  Either the file MOVED upstream — a hard failure by design — or this clone predates it\n` +
        `  and needs \`git -C ${checkout} fetch origin\`.\n\n` +
        `  git said: ${error.message}`,
    );
  }
}

/** Assert a commit is present in the clone, with the remedy when it is not. */
export function requireCommit(checkout, commit, repoName) {
  try {
    git(checkout, ["cat-file", "-e", `${commit}^{commit}`]);
  } catch {
    throw new LocalCheckoutError(
      `${repoName} at ${checkout} does not have commit ${String(commit).slice(0, 9)}.\n\n` +
        `  The pin names an exact commit, so a clone that has not fetched it cannot answer.\n` +
        `      git -C ${checkout} fetch origin`,
    );
  }
}

/**
 * The sentence every local-mode caller prints.
 *
 * It names the ref, the commit, when that commit landed, and — the part that matters — that this
 * compared against a clone rather than against the remote.
 */
export function stalenessNote(checkout, { ref, commit, committed }, repoName) {
  return (
    `  (read from ${checkout} at ${ref} = ${commit.slice(0, 9)}, committed ${committed}.\n` +
    `   This compares against your clone, which is as fresh as its last \`git fetch\` — not\n` +
    `   against ${repoName} as it is right now. CI runs the networked comparison.)`
  );
}
