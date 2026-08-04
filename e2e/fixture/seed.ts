// What the seeded deployment contains (ui#20).
//
// `scripts/journeys-up.mjs` writes `e2e/.seed.json` — the manifest `astro-mine-api`'s own
// `scripts/seed_demo.py` printed. The journeys read it rather than hard-coding references, digests
// and submission ids, for one reason: **a content address is not a constant.** Change what the
// seeder publishes and every digest moves; a journey with one written into it would then assert a
// value against a world that no longer contains it, and the failure would read as a broken page.
//
// So the rule here is that a journey may name a *concept* the seed promises — "the leaderboard has
// more than one row", "there is a policy nobody has submitted yet" — and reads the value from this
// file.
//
// **A note on URLs, because every journey trips on it once.** The static export serves
// directory-style paths, so a route with search params is `/bench/submission/?id=…` — with a
// trailing slash *before* the query. `toHaveURL` patterns therefore spell it `\/?\?`, and one
// written without it fails on a page that loaded perfectly well.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".seed.json");

export interface SeededSubmission {
  readonly submission_id: string;
  readonly method: string;
  readonly integrity: string;
  readonly replay?: string;
}

export interface Seed {
  readonly root: string;
  readonly hub: {
    readonly assets: readonly string[];
    readonly worlds: readonly string[];
    readonly policies: readonly string[];
  };
  readonly studio: { readonly campaign: string | null };
  readonly bench: {
    readonly scenario_id: string;
    readonly submissions: readonly SeededSubmission[];
    /** A policy the seeder deliberately left off the board, so a submit journey has work to do. */
    readonly unsubmitted_policy_ref: string;
  };
  readonly oidc: { readonly issuer: string; readonly audience: string; readonly token: string };
}

let cached: Seed | undefined;

/**
 * The seeded deployment's manifest.
 *
 * Throws — loudly, with the command to run — rather than returning a default. A journey suite that
 * quietly ran against an unseeded API would report twenty empty-state failures and none of them
 * would say "nothing was seeded".
 */
export function seed(): Seed {
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(readFileSync(MANIFEST, "utf8")) as Seed;
  } catch (cause) {
    throw new Error(
      `no seeded deployment: ${join("e2e", ".seed.json")} could not be read.\n\n` +
        `  The journeys drive a real API. Bring one up with:\n` +
        `      pnpm journeys\n\n` +
        `  (${cause instanceof Error ? cause.message : String(cause)})`,
    );
  }
  return cached;
}

/** A reference the seed published, by kind — for a journey that needs *an* asset, not a named one. */
export function anAsset(): string {
  const [first] = seed().hub.assets;
  if (first === undefined) throw new Error("the seed published no assets");
  return first;
}

/** The published policy's name, without its version — what a search or a resolve is keyed on. */
export function policyName(): string {
  const [first] = seed().hub.policies;
  if (first === undefined) throw new Error("the seed published no policies");
  return first.split(":")[0];
}
