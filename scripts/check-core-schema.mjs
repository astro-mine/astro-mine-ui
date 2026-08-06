/**
 * Fail if View's vendored copies of Core's schemas have drifted from Core (RFC-0009 §1).
 *
 * View is TypeScript and cannot import `astro_mine.core`, so it **vendors** Core's units schema and
 * conformance vectors. Until now the only thing keeping them in step with Core was a comment —
 * "To re-sync after a Core change, copy that file over the vendored one." A hand-resynced copy
 * guarded by a comment is drift with extra steps: nothing failed when Core's schema moved, View
 * just went quietly stale. (It was vendored from rev 27ed80d and is three Core tags behind.)
 *
 * This checks two things, and **fails** on either:
 *
 *   1. The vendored bytes still hash to what `core-pin.json` says (nobody edited them locally).
 *   2. Those bytes still equal what `astro-mine-core` ships at the pinned tag (Core has not moved
 *      underneath us).
 *
 * (2) is the one that matters, and it needs the network — Core is a private repo, so it is fetched
 * with CORE_REPO_TOKEN. A missing token is a **hard failure**, never a skip: a compatibility check
 * that silently skips is exactly the failure mode RFC-0009 exists to end (Core's own `consumer-smoke`
 * job was green for months while structurally unable to fail).
 *
 * Re-sync:
 *   1. copy the files from astro-mine-core@<tag>/src/astro_mine/core/units/schema/ over the ones in
 *      lib/src/frames/schema/
 *   2. update core-pin.json (tag + the new sha256s + core_schema_digest)
 *   3. pnpm codegen:units   (the generated units.ts must be regenerated and committed)
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { requireCommit, resolveCheckout, showAt } from "./lib/local-checkout.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(HERE, "..", "packages", "view", "src", "frames", "schema");
const PIN = JSON.parse(readFileSync(join(SCHEMA_DIR, "core-pin.json"), "utf8"));

const REPO = PIN.repo;

const sha256 = (buf) => `sha256:${createHash("sha256").update(buf).digest("hex")}`;

const fail = (msg) => {
  console.error(`\n✗ Core schema drift check failed\n\n${msg}\n`);
  process.exit(1);
};

/**
 * The checkout to read from, or `null` for the network. Resolved once.
 *
 * **This pin names an exact commit**, which makes the local path unusually strong: there is no
 * "which branch did we mean" question to get wrong, and `git show <commit>:<path>` in a clone that
 * has the commit returns exactly the bytes the contents API would. A clone that has *not* fetched
 * it says so rather than guessing.
 */
const CHECKOUT = (() => {
  try {
    return resolveCheckout({ envName: "ASTRO_MINE_PLATFORM_REPO", repoName: REPO });
  } catch (error) {
    fail(error.message);
    return null; // unreachable: `fail` exits.
  }
})();

if (CHECKOUT) requireCommitOrFail(CHECKOUT);

function requireCommitOrFail(checkout) {
  try {
    requireCommit(checkout, PIN.commit, REPO);
  } catch (error) {
    fail(error.message);
  }
}

async function fetchFromCore(filename) {
  if (CHECKOUT) {
    try {
      return showAt(CHECKOUT, PIN.commit, `${PIN.source_dir}/${filename}`, REPO);
    } catch (error) {
      fail(error.message);
    }
  }

  const token = process.env.CORE_REPO_TOKEN;
  if (!token) {
    fail(
      "CORE_REPO_TOKEN is not set, so the vendored schemas cannot be compared against Core.\n" +
        "This is a hard failure, not a skip — a drift guard that silently skips is not a guard.\n\n" +
        "In CI:   pass the secret.\n" +
        "Locally: compare against your own clone, which needs no credential —\n" +
        "             pnpm check:core-schema:from\n" +
        "             node scripts/check-core-schema.mjs --from ../astro-mine-platform\n" +
        "         (the pin names a commit, so this reads exactly the pinned bytes)\n" +
        "         ...or export CORE_REPO_TOKEN=<a read-scoped PAT>.",
    );
  }
  const path = `${PIN.source_dir}/${filename}`;
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${PIN.commit}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    fail(`GET ${path}@${PIN.commit.slice(0, 9)} -> HTTP ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const drifted = [];

for (const [filename, pinnedDigest] of Object.entries(PIN.files)) {
  const vendored = readFileSync(join(SCHEMA_DIR, filename));
  const vendoredDigest = sha256(vendored);

  // 1. Local integrity — the vendored bytes are the ones the pin claims.
  if (vendoredDigest !== pinnedDigest) {
    drifted.push(
      `${filename}: the vendored file does not match core-pin.json\n` +
        `    pinned:   ${pinnedDigest}\n` +
        `    vendored: ${vendoredDigest}\n` +
        `  Someone edited the vendored copy by hand. Vendored Core schemas are read-only here.`,
    );
    continue;
  }

  // 2. The one that matters — Core has not moved underneath us.
  const upstream = await fetchFromCore(filename);
  const upstreamDigest = sha256(upstream);
  if (upstreamDigest !== vendoredDigest) {
    drifted.push(
      `${filename}: the platform@${PIN.commit.slice(0, 9)} no longer matches the vendored copy\n` +
        `    platform@${PIN.commit.slice(0, 9)}: ${upstreamDigest}\n` +
        `    vendored:      ${vendoredDigest}\n` +
        `  Re-sync: copy ${PIN.source_dir}/${filename} from ${PIN.repo}, update core-pin.json,\n` +
        `  and re-run \`pnpm codegen:units\`.`,
    );
  }
}

if (drifted.length) {
  fail(drifted.join("\n\n"));
}

console.log(
  `✓ vendored Core schemas match astro-mine-platform@${PIN.commit.slice(0, 9)} ` +
    `(${Object.keys(PIN.files).join(", ")})`,
);
if (CHECKOUT) {
  // No staleness caveat is needed here and it would be wrong to print one: the pin names a commit,
  // so this read the same immutable bytes the networked path would. The only thing a clone can be
  // too old for is *having* that commit, and `requireCommit` already refused that case.
  console.log(`  (read from ${CHECKOUT} at the pinned commit — identical bytes, no network)`);
}
