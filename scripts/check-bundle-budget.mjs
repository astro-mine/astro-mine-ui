#!/usr/bin/env node
// The bundle budget (ui#8; ui.md §8, rebuild plan §6).
//
//   pnpm check:bundle          measure the built export and enforce the budgets
//   pnpm check:bundle --report just print the table
//
// **What is measured, and why that.** For each prerendered route, the sum of every
// `/_next/static/**.js` the route's HTML actually references. That is the JavaScript a browser
// fetches and parses before the page is interactive — not the size of `out/`, which counts chunks
// no route loads, and not a gzip figure, which depends on a compressor version and would make the
// number move without a line of code changing.
//
// **It is deliberately blind to code-split chunks, and that is the point.** Cesium is 4 MB and
// arrives through `next/dynamic` with `ssr: false`, so it is referenced by no prerendered HTML and
// costs nothing here. The day somebody imports `@astro-mine/view` statically, it stops being
// code-split, lands in a route's reference set, and this gate is what says so. The existing
// "Cesium chunk is not preloaded" assertion catches the same mistake from the other side; this one
// catches every *other* four-megabyte import nobody has thought of yet.
//
// Exported as `measureRoutes`/`overBudget` so the failure modes can be proven against fixture trees
// (`check-bundle-budget.test.mjs`). A gate nothing can prove *fails* is not a gate.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(REPO, "apps/console/out");

/**
 * The budget every route gets unless it is named below, in KiB.
 *
 * **Measured, not chosen.** When this landed, every route sat between 1287 and 1316 KiB — almost
 * entirely the shared framework, React and Material UI, with each page's own code a rounding error
 * on top. 1500 leaves Wave 29 room to build real pages without a budget argument per pull request,
 * and still fails hard on the thing worth failing on: a megabytes-large dependency arriving in a
 * route's critical path.
 *
 * Raising this is a decision that belongs in the commit that needs it, with the reason beside it.
 *
 * **Watched rejecting, on this export rather than on a fixture** (`ui#20`): dropped to 900 KiB for
 * one commit, the lane went red and named every route with its measurement and its overage —
 * `/bench/submission is 1325.0 KiB of referenced JavaScript, over its 900 KiB budget by 425.0 KiB
 * (20 scripts)`. Restored in the commit after. Wave 29 moved the routes from ~1300 to ~1325 KiB, so
 * 1500 still has room in it and still fails on the thing worth failing on.
 */
const DEFAULT_BUDGET_KIB = 1500;

/**
 * Per-route budgets, for routes that have earned a different one.
 *
 * Empty today, and an entry here should always look slightly uncomfortable: a route that needs more
 * than the default is a route carrying something the others do not, and the reason is worth a
 * sentence. `/dev/globe` and `/dev/inspector` are **not** here — they mount Cesium, and it does not
 * count, because it is loaded on demand rather than referenced by their HTML. That is the whole
 * design working.
 */
const ROUTE_BUDGETS = {};

const KIB = 1024;

/** Every `/_next/static/**.js` an HTML file references, deduplicated. */
function referencedScripts(html) {
  return new Set(html.match(/\/_next\/static\/[^"']+?\.js/g) ?? []);
}

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

/**
 * Measure every prerendered route in an export directory.
 *
 * @param {string} outDir
 * @returns {{route: string, bytes: number, scripts: number, missing: string[]}[]} sorted, largest first
 */
export function measureRoutes(outDir) {
  const rows = [];
  for (const file of htmlFiles(outDir)) {
    // The route is the path with `.html` dropped, and `index` dropped with it — so
    // `bench/jobs/index.html` is `/bench/jobs` and a bare `404.html` is `/404`, not the directory
    // it happens to sit in. Getting this wrong is not cosmetic: the route name is what a failure
    // message sends somebody to look at.
    const rel = relative(outDir, file)
      .split("\\")
      .join("/")
      .replace(/\.html$/, "");
    const route = `/${rel.replace(/(^|\/)index$/, "")}`.replace(/(.)\/$/, "$1");

    const scripts = referencedScripts(readFileSync(file, "utf8"));
    const missing = [];
    let bytes = 0;
    for (const src of scripts) {
      const path = join(outDir, src.slice(1));
      // A referenced script that does not exist is a broken export, not a zero-byte one. Counting
      // it as zero would let a catastrophically broken build pass the budget with room to spare.
      if (existsSync(path)) bytes += statSync(path).size;
      else missing.push(src);
    }
    rows.push({ route, bytes, scripts: scripts.size, missing });
  }
  return rows.sort((a, b) => b.bytes - a.bytes);
}

/**
 * Which rows exceed their budget, and which reference a script that is not there.
 *
 * @param {ReturnType<typeof measureRoutes>} rows
 * @param {{defaultKib?: number, budgets?: Record<string, number>}} [limits]
 */
export function overBudget(rows, limits = {}) {
  const defaultKib = limits.defaultKib ?? DEFAULT_BUDGET_KIB;
  const budgets = limits.budgets ?? ROUTE_BUDGETS;

  const failures = [];
  for (const row of rows) {
    if (row.missing.length > 0) {
      failures.push(
        `${row.route} references ${row.missing.length} script(s) that are not in the export: ` +
          `${row.missing.join(", ")}`,
      );
      continue;
    }
    const budget = budgets[row.route] ?? defaultKib;
    const kib = row.bytes / KIB;
    if (kib > budget) {
      failures.push(
        `${row.route} is ${kib.toFixed(1)} KiB of referenced JavaScript, over its ${budget} KiB ` +
          `budget by ${(kib - budget).toFixed(1)} KiB (${row.scripts} scripts).`,
      );
    }
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(OUT)) {
    console.error(
      `\n✗ no static export at ${relative(REPO, OUT)}.\n\n` +
        `  This gate measures what shipped, so it needs a build first:\n` +
        `      pnpm build\n`,
    );
    process.exit(1);
  }

  const rows = measureRoutes(OUT);
  const width = Math.max(...rows.map((r) => r.route.length));
  for (const row of rows) {
    const budget = ROUTE_BUDGETS[row.route] ?? DEFAULT_BUDGET_KIB;
    console.log(
      `${row.route.padEnd(width)}  ${(row.bytes / KIB).toFixed(1).padStart(8)} KiB` +
        `  / ${budget} KiB  (${row.scripts} scripts)`,
    );
  }

  const failures = overBudget(rows);
  if (failures.length > 0) {
    console.error(
      `\n✗ bundle budget exceeded\n\n  ${failures.join("\n\n  ")}\n\n` +
        `  A route that grows by megabytes has almost always imported something statically that\n` +
        `  should arrive on demand — Cesium is the one this workspace already knows about. Check\n` +
        `  what entered the route's graph before raising the budget in\n` +
        `  scripts/check-bundle-budget.mjs.\n`,
    );
    process.exit(1);
  }

  console.log(`\n✓ ${rows.length} routes within budget.`);
}
