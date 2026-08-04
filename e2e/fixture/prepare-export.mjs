#!/usr/bin/env node
// The configured copy of the export, for the journey suite (ui#20).
//
//     node e2e/fixture/prepare-export.mjs
//
// **Two servings of one build, differing by one file.** `next build` emits `apps/console/out` with
// no `config.json` — deliberately, because the repository ships no endpoint (`ui.md` §7 rule 3), and
// that *is* the unconfigured state the degraded suite drives. The journeys need the same bytes with
// an endpoint beside them.
//
// Rebuilding with a config would give the journeys a different artifact from the one the degraded
// lane cleared, which is exactly the property the browser lane exists to hold: what ships is what
// was tested. So this copies, and the copy differs by one file that was never compiled into
// anything.
//
// Cheap enough not to optimise — the export is a few megabytes plus Cesium's assets, and this runs
// once per suite.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXPORT_DIR = join(REPO, "apps/console/out");
const SEEDED_DIR = join(REPO, "apps/console/.e2e/seeded");

/** Where the journeys' API answers. Must match `scripts/journeys-up.mjs`. */
const API_BASE_URL = process.env.ASTRO_MINE_API_BASE_URL ?? "http://127.0.0.1:8000";

if (!existsSync(EXPORT_DIR)) {
  console.error(
    `\n✗ no static export at apps/console/out.\n\n` +
      `  The browser lanes drive what ships, so they need a build first:\n      pnpm build\n`,
  );
  process.exit(1);
}

// Removed rather than merged: a stale file from an older export would be served forever, and the
// symptom — one route behaving like a previous build — is miserable to chase.
rmSync(SEEDED_DIR, { recursive: true, force: true });
mkdirSync(dirname(SEEDED_DIR), { recursive: true });
cpSync(EXPORT_DIR, SEEDED_DIR, { recursive: true });

// Root-relative by construction: the application fetches `/config.json`, and `ui#5` records what
// happens when that leading slash is missed — nineteen routes out of twenty report "no API is
// configured" while the home page looks fine.
writeFileSync(join(SEEDED_DIR, "config.json"), `${JSON.stringify({ apiBaseUrl: API_BASE_URL })}\n`);

console.log(`prepared ${SEEDED_DIR} against ${API_BASE_URL}`);
