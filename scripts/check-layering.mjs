#!/usr/bin/env node
// The one rule this workspace exists to hold, enforced mechanically rather than by review
// (ui#1; ARCHITECTURE.md → "The layering is the product"). A layering rule enforced only by review
// is a layering rule that erodes — so it runs in CI on every push and pull request, and as
// `pnpm check:layering`.
//
// Node built-ins only, ZERO dependencies, so it runs offline after the first install (CX-LOCAL).
//
// The rule, stated as the issue states it:
//
//   Rule 1 — the application may import any package.
//   Rule 2 — a package MUST NOT import the application. Nothing sits above the app; it is the sink.
//   Rule 3 — a package MUST NOT import a sibling, except that `inspectors` may import `ui` and
//            `view`. Two packages that need the same thing means the thing belongs in `ui` or
//            `view` — or, if it is platform behaviour, in the platform and then in the API.
//
// Type-only imports count. A type dependency is still a direction in the graph, and a rule that let
// `import type` through would be a rule with a hole in it big enough to walk the whole design
// through.
//
// Both halves of a dependency are checked: what a package *declares* in its manifest, and what its
// sources actually *import*. Neither alone is sufficient — a manifest can lie by omission, and a
// source import can be satisfied by a hoisted transitive install.
//
// Exit 0 = clean; exit 1 = violation, with a precise, fix-oriented message.
//
// The rules are exported as `checkLayering(root)` so they can be run against fixture trees
// (check-layering.test.mjs). A gate nothing can prove *fails* is not a gate, and with four empty
// packages the real tree has no live violation to demonstrate — so the failure modes are proven
// against fixtures instead.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname, join, relative, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The layering, as an explicit adjacency allowlist rather than as numeric ranks.
 *
 * Ranks would be shorter, but they encode a *total order* the design does not have: `api-client`
 * and `ui` are not above or below one another, they are unrelated, and a rank would quietly permit
 * `ui -> api-client` the day someone renumbered. The allowlist says exactly what the design says —
 * which edges exist — and adding one is a deliberate edit to this table with a reason beside it.
 *
 * Anything not named here (react, @mui/*, third-party) is outside the layered graph and not this
 * script's business.
 */
const ALLOWED_PACKAGE_IMPORTS = {
  "@astro-mine/api-client": [],
  "@astro-mine/ui": [],
  "@astro-mine/view": [],
  // The one sibling edge in the design: inspectors render artifacts, so they need the design system
  // and — for a world artifact — the globe.
  "@astro-mine/inspectors": ["@astro-mine/ui", "@astro-mine/view"],
};

/** The application. It may import any package; nothing may import it. */
const APP = "@astro-mine/console";

const LAYERED = new Set([...Object.keys(ALLOWED_PACKAGE_IMPORTS), APP]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Every directory under `parent` that holds a package.json. */
function listPackageDirs(parent) {
  let entries;
  try {
    entries = readdirSync(parent, { withFileTypes: true });
  } catch {
    return []; // the slot does not exist yet — nothing to check
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => join(parent, e.name))
    .filter((dir) => {
      try {
        statSync(join(dir, "package.json"));
        return true;
      } catch {
        return false;
      }
    });
}

/** Recursively collect .ts/.tsx sources, skipping build and test detritus. */
function collectSources(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (["node_modules", "dist", ".next", "out", "coverage"].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) collectSources(full, acc);
    else if ([".ts", ".tsx"].includes(extname(e.name))) acc.push(full);
  }
  return acc;
}

/**
 * Every `@astro-mine/*` specifier a source file reaches for.
 *
 * Deliberately broad and syntactic. It catches `import`, `export ... from`, side-effect imports,
 * `import type` / `export type` (see the header — type edges are edges), and `import(...)`
 * expressions, which matter here because Cesium and the replay layer are mounted through dynamic
 * import and would otherwise be an unchecked back door. Subpath specifiers (`@astro-mine/ui/x`)
 * resolve to their owning package.
 */
export function importedAstroMinePackages(source) {
  const found = new Set();
  const patterns = [
    // import x from "…" · export { x } from "…" · import type { X } from "…"
    /(?:^|[\s;}])(?:import|export)\b[\s\S]*?\bfrom\s*["'](@astro-mine\/[a-z0-9-]+)(?:\/[^"']*)?["']/g,
    // import "…"  (side effect)
    /(?:^|[\s;}])import\s*["'](@astro-mine\/[a-z0-9-]+)(?:\/[^"']*)?["']/g,
    // import("…") · await import("…")
    /\bimport\s*\(\s*["'](@astro-mine\/[a-z0-9-]+)(?:\/[^"']*)?["']\s*\)/g,
    // require("…") — not our module system, but cheap to catch and unambiguous if it appears
    /\brequire\s*\(\s*["'](@astro-mine\/[a-z0-9-]+)(?:\/[^"']*)?["']\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) found.add(m[1]);
  }
  return found;
}

/**
 * Is `importer` allowed to depend on `imported`?
 *
 * @returns {null | string} null when the edge is legal, otherwise the reason it is not.
 */
function edgeViolation(importer, imported) {
  if (importer === imported) return null; // self-reference via a path alias is not a layer crossing
  if (!LAYERED.has(imported)) return null; // not part of the layered graph

  if (imported === APP) {
    return (
      `nothing may depend on ${APP}. The application is the sink: it composes the packages, ` +
      `never the reverse. If the app has something a package needs, the something is in the ` +
      `wrong place — move it down into a package.`
    );
  }

  if (importer === APP) return null; // rule 1 — the app may import any package

  const allowed = ALLOWED_PACKAGE_IMPORTS[importer];
  if (allowed === undefined) return null; // importer is outside the graph
  if (allowed.includes(imported)) return null;

  return (
    `${importer} may not depend on the sibling ${imported}` +
    (allowed.length > 0 ? ` (it may only depend on: ${allowed.join(", ")})` : " (it is a leaf)") +
    `. Two packages that need the same thing means the thing belongs in @astro-mine/ui or ` +
    `@astro-mine/view — or, if it is platform behaviour, in the platform and then in the API. ` +
    `Widening the graph is a deliberate edit to ALLOWED_PACKAGE_IMPORTS in this script, with a ` +
    `reason beside it.`
  );
}

/**
 * Apply the layering rules across a workspace tree.
 *
 * @param {string} root the workspace root, holding `apps/` and `packages/`
 * @returns {{ violations: string[], packageCount: number }} violations are human-readable and
 *          prefixed with the kind of edge that broke the rule; an empty array means the tree is
 *          clean.
 */
export function checkLayering(root) {
  const violations = [];
  const dirs = [...listPackageDirs(join(root, "packages")), ...listPackageDirs(join(root, "apps"))];

  for (const dir of dirs) {
    const pkg = readJson(join(dir, "package.json"));
    const name = pkg.name;
    if (!LAYERED.has(name)) continue;

    // --- the manifest half -------------------------------------------------
    const declared = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };
    for (const dep of Object.keys(declared)) {
      const reason = edgeViolation(name, dep);
      if (reason) {
        violations.push(
          `[manifest] ${relative(root, join(dir, "package.json"))} declares a dependency on ` +
            `${dep} — ${reason}`,
        );
      }
    }

    // --- the source half ---------------------------------------------------
    for (const file of collectSources(dir)) {
      for (const imported of importedAstroMinePackages(readFileSync(file, "utf8"))) {
        const reason = edgeViolation(name, imported);
        if (reason) {
          violations.push(`[import]   ${relative(root, file)} imports ${imported} — ${reason}`);
        }
      }
    }
  }

  return { violations, packageCount: dirs.length };
}

// --- CLI --------------------------------------------------------------------
// Runs only on direct execution, so importing this module for tests has no side effects.

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { violations, packageCount } = checkLayering(repoRoot);

  if (violations.length > 0) {
    console.error("Layering check FAILED:\n");
    for (const v of violations) console.error("  x " + v + "\n");
    console.error("The rule is in ARCHITECTURE.md -> 'The layering is the product'.");
    process.exit(1);
  }

  console.log(
    `Layering check passed: ${packageCount} workspace member(s) respect the dependency direction.`,
  );
}
