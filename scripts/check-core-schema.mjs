/**
 * Fail if View's vendored copies of Core's schemas have drifted from Core (RFC-0009 §1).
 *
 * View is TypeScript and cannot import `astro_mine.core`, so it **vendors** Core's units schema and
 * conformance vectors. Until now the only thing keeping them in step with Core was a comment —
 * "To re-sync after a Core change, copy that file over the vendored one." A hand-resynced copy
 * guarded by a comment is drift with extra steps: nothing failed when Core's schema moved, View
 * just went quietly stale.
 *
 * This checks two things, and **fails** on either:
 *
 *   1. The vendored bytes still hash to what `core-pin.json` says (nobody edited them locally).
 *   2. Those bytes still equal what `astro-mine-platform` ships at its **default branch HEAD**
 *      (Core has not moved underneath us).
 *
 * **(2) reads HEAD, and used to read the pin's own commit** (ui#69). That made it a tamper check
 * wearing a drift check's name: it proved nobody had edited the vendored files, and it could not
 * see the platform move, because it never looked anywhere the platform had moved to.
 * `conventions.md` §3.1 asks for the other thing, and `check-vocabularies.mjs` had already said so
 * for the sibling guard — "pinning the ref would make the guard blind to the vocabulary actually
 * moving, which is the only thing it is for."
 *
 * It needs the network — the platform is a private repo, so it is fetched with CORE_REPO_TOKEN, or
 * read from a local clone with `--from`. A missing credential is a **hard failure**, never a skip:
 * a compatibility check that silently skips is exactly the failure mode RFC-0009 exists to end
 * (Core's own `consumer-smoke` job was green for months while structurally unable to fail).
 *
 * The pin also records Core's `SCHEMA_DIGEST`, which a failure reports so it names the *contract*
 * and not only a file. That one is reported rather than asserted — see `schemaDigestAtHead`.
 *
 * Re-sync:
 *   1. copy `src/astro_mine/core/units/schema/` from astro-mine-platform at its current HEAD over
 *      the vendored copies in `packages/view/src/frames/schema/`
 *   2. update core-pin.json (commit + the new sha256s + core_schema_digest)
 *   3. pnpm codegen:units   (the generated units.ts must be regenerated and committed)
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultBranchHead,
  resolveCheckout,
  showAt,
  stalenessNote,
} from "./lib/local-checkout.mjs";
import { fileAt, headCommit, requireToken } from "./lib/platform-fetch.mjs";

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
 * **Read at the platform's DEFAULT BRANCH HEAD, not at the pin's commit** (ui#69). Reading the pin's
 * own commit made this a *tamper* check — it proved nobody had edited the vendored bytes locally,
 * and it could not see the platform move, because it never looked anywhere the platform had moved
 * to. `conventions.md` §3.1 asks for the other thing: a vendored consumer "**MUST** guard it against
 * drift ... and **fail** CI when the copy no longer matches".
 *
 * `check-vocabularies.mjs` already reasoned this out for the inspector vocabularies, in its own
 * words: "pinning the ref would make the guard blind to the vocabulary actually moving, which is the
 * only thing it is for." That argument applies here unchanged, so this uses the same helper rather
 * than a second opinion about the same question.
 *
 * The cost is the same too, and worth naming: a Core schema change turns this lane red on an
 * unrelated pull request here. That is the alarm working.
 */
const CHECKOUT = (() => {
  try {
    return resolveCheckout({ envName: "ASTRO_MINE_PLATFORM_REPO", repoName: REPO });
  } catch (error) {
    fail(error.message);
    return null; // unreachable: `fail` exits.
  }
})();

/**
 * The platform's default-branch HEAD, from the clone when there is one, else the API.
 *
 * A local clone answers from `origin/HEAD`, which can lag the real default branch — so it reports
 * how old that ref is rather than presenting a stale answer as current. The two readers are
 * normalised to a bare sha here; only the local one can say when it was last fetched.
 */
const HEAD = await (async () => {
  try {
    if (CHECKOUT) {
      const local = defaultBranchHead(CHECKOUT, REPO);
      const note = stalenessNote(CHECKOUT, local, REPO);
      if (note) console.warn(note);
      return local.commit;
    }
    return await headCommit(REPO, requireToken());
  } catch (error) {
    fail(
      `${error.message}\n\n` +
        "This is a hard failure, not a skip — a drift guard that cannot reach its subject has\n" +
        "stopped existing, and it goes quiet on exactly the day nobody is looking.\n\n" +
        "In CI:   pass CORE_REPO_TOKEN.\n" +
        "Locally: compare against your own clone, which needs no credential —\n" +
        "             pnpm check:core-schema:from\n" +
        "             node scripts/check-core-schema.mjs --from ../astro-mine-platform",
    );
    return null; // unreachable: `fail` exits.
  }
})();

const short = (sha) => sha.slice(0, 9);

async function fetchAtHead(path) {
  try {
    if (CHECKOUT) return showAt(CHECKOUT, HEAD, path, REPO);
    return await fileAt(REPO, HEAD, path, requireToken());
  } catch (error) {
    fail(error.message);
    return null; // unreachable: `fail` exits.
  }
}

/**
 * Core's `SCHEMA_DIGEST` at HEAD — the contract identity, read so a failure can name it.
 *
 * It is **reported, not asserted**, and the distinction is deliberate. The digest covers the *full*
 * schema source set, including the `.proto` sources at the platform's repo root that View does not
 * vendor. Failing on it would turn every proto-only change into a red lane here for a contract this
 * package's vendored slice does not contain — a false alarm, and false alarms are how a real one
 * gets ignored. The vendored bytes are the assertion; the digest is what lets the message say
 * *which contract* moved rather than only which file.
 */
async function schemaDigestAtHead() {
  const source = await fetchAtHead("src/astro_mine/core/_schema_digest.py");
  const match = /SCHEMA_DIGEST\s*=\s*"(sha256:[0-9a-f]{64})"/.exec(source.toString("utf8"));
  return match ? match[1] : null;
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

  // 2. The one that matters — Core has not moved underneath us, at HEAD.
  const upstream = await fetchAtHead(`${PIN.source_dir}/${filename}`);
  const upstreamDigest = sha256(upstream);
  if (upstreamDigest !== vendoredDigest) {
    drifted.push(
      `${filename}: the platform at ${REPO}@${short(HEAD)} (default branch HEAD) no longer\n` +
        `  matches the vendored copy\n` +
        `    platform@${short(HEAD)}: ${upstreamDigest}\n` +
        `    vendored:            ${vendoredDigest}\n` +
        `  Re-sync: copy ${PIN.source_dir}/${filename} from ${PIN.repo}, update core-pin.json\n` +
        `  (commit, the file's sha256, and core_schema_digest), and re-run \`pnpm codegen:units\`.`,
    );
  }
}

// The contract identity, so a failure names it. Read once, after the byte comparison, because it is
// context for a failure rather than a condition of one.
const headSchemaDigest = await schemaDigestAtHead();
if (drifted.length && headSchemaDigest !== null && headSchemaDigest !== PIN.core_schema_digest) {
  drifted.push(
    `Core's SCHEMA_DIGEST has also moved, which names what changed:\n` +
      `    pinned: ${PIN.core_schema_digest ?? "(not recorded)"}\n` +
      `    HEAD:   ${headSchemaDigest}\n` +
      `  That is the contract identity a Bench run pins (VERSIONING.md §4.1), so record the new\n` +
      `  value in core-pin.json alongside the re-synced bytes.`,
  );
}

if (drifted.length) {
  fail(drifted.join("\n\n"));
}

const digestNote =
  headSchemaDigest === null
    ? ""
    : headSchemaDigest === PIN.core_schema_digest
      ? `, SCHEMA_DIGEST ${short(headSchemaDigest.slice(7))}`
      : `, SCHEMA_DIGEST moved to ${short(headSchemaDigest.slice(7))} (proto-only; vendored slice unchanged)`;

console.log(
  `✓ vendored Core schemas match ${REPO}@${short(HEAD)} (default branch HEAD) ` +
    `(${Object.keys(PIN.files).join(", ")}${digestNote})`,
);
if (CHECKOUT) {
  // No staleness caveat is needed here and it would be wrong to print one: the pin names a commit,
  // so this read the same immutable bytes the networked path would. The only thing a clone can be
  // too old for is *having* that commit, and `requireCommit` already refused that case.
  console.log(`  (read from ${CHECKOUT} at its origin/HEAD — identical bytes, no network)`);
}
