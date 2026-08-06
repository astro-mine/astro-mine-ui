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
//            `view`. The `view` edge is permitted and currently unused, deliberately — see the
//            note on ALLOWED_PACKAGE_IMPORTS below. Two packages that need the same thing means
//            the thing belongs in `ui` or `view` — or, if it is platform behaviour, in the
//            platform and then in the API.
//
// Type-only imports count. A type dependency is still a direction in the graph, and a rule that let
// `import type` through would be a rule with a hole in it big enough to walk the whole design
// through.
//
// Both halves of a dependency are checked: what a package *declares* in its manifest, and what its
// sources actually *import*. Neither alone is sufficient — a manifest can lie by omission, and a
// source import can be satisfied by a hoisted transitive install.
//
// Rule 4 — a RESTRICTED package may be reached only by the package that owns it. Today there is one:
//          `@mui/x-charts` belongs to `@astro-mine/ui`, which owns every chart the application
//          renders and exposes no raw chart primitive (ui.md §7.1). A page that imports the chart
//          library directly is a chart with no uncertainty discipline, and that is the one failure
//          mode the whole chart layer exists to prevent. This is not a layering rule about our own
//          packages, which is why it needs its own table — but it is enforced here because it is the
//          same question ("who is allowed to depend on what") asked of a third party.
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
  // The one sibling edge in the design, and the two halves of it are not alike (ui.md §3 rule 3).
  //
  // `ui` is taken: panels render artifacts, so they need the design system.
  //
  // `view` is PERMITTED AND UNUSED, and that is the design rather than an oversight — a panel MUST
  // NOT reach for the globe. `@astro-mine/view` publishes a single entry that re-exports its Cesium
  // module, so a static import from a panel would put four megabytes into the first paint of every
  // page that renders an artifact row, and the build lane's "Cesium is served locally and loaded
  // only on demand" step asserts the same property from the other side: that no prerendered route
  // preloads the Cesium chunk. A panel is HANDED its heavy visuals instead — the composition root
  // owns the one `next/dynamic` / `ssr: false` / `CESIUM_BASE_URL` mount and passes the result
  // down through `InspectorSlots` (ui.md §6.1, normative). `inspectors` declines this edge in its
  // manifest, and `packages/inspectors/tests/surface.test.ts` asserts the absence.
  //
  // It stays in the table for View's pure `frames` subtree — CRS, time, units, no Cesium — which is
  // a legitimate consumer. Reopening an allowlist is a worse moment to think about layering than
  // this one.
  "@astro-mine/inspectors": ["@astro-mine/ui", "@astro-mine/view"],
};

/** The application. It may import any package; nothing may import it. */
const APP = "@astro-mine/console";

const LAYERED = new Set([...Object.keys(ALLOWED_PACKAGE_IMPORTS), APP]);

/**
 * Third-party packages that belong to specific workspace members (rule 4).
 *
 * Each entry names who may reach for it and **why**, because the reason differs per package and a
 * shared message would be wrong for all but the first. `ui#6` is what forced that: the table held
 * one entry and the rejection text was chart prose, which would have told someone importing Cesium
 * about uncertainty bounds.
 */
const RESTRICTED_PACKAGES = {
  "@mui/x-charts": {
    owners: ["@astro-mine/ui"],
    why:
      "@astro-mine/ui owns every chart the application renders and exposes no raw chart primitive " +
      "(ui.md §7.1). That rule used to be a *property*: the previous chart library could not " +
      "express a second y-axis or a zero-length bar for an unmeasured bound. MUI X can express " +
      "both, so what stops a page drawing a chart with no uncertainty discipline is no longer the " +
      "library's API — it is this table plus the design system's own tests. If the chart you need " +
      "is not there, add it there, with its tests, and import it from there.",
  },
  cesium: {
    // The application is named too, and that is not a loophole: it is the composition root, and
    // `apps/console/src/components/Globe.tsx` is the one place the dynamic, SSR-disabled import and
    // the `CESIUM_BASE_URL` assignment live. It also declares `cesium` so the asset-staging script
    // can resolve it the way the deployment will.
    owners: ["@astro-mine/view", APP],
    why:
      "@astro-mine/view owns the globe. Cesium touches `window` at *import* time and pulls " +
      "megabytes of workers and web assembly behind it, so an import from anywhere else is either " +
      "a prerender failure during `next build` or a bundle blowout on a route that never draws a " +
      "globe — and neither reads as an import problem when it happens. View owns the client-only " +
      "mounting, the asset staging and the single Viewer lifecycle; a second importer inherits " +
      "none of it. Render a globe through @astro-mine/view, mounted the way Globe.tsx mounts it.",
  },
};

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
 * A bare module specifier, captured down to its owning package.
 *
 * Handles the scoped and unscoped forms and drops any subpath, so `@astro-mine/ui/x` and
 * `@mui/x-charts/BarChart` resolve to the packages they come from. Relative specifiers (`./x`) and
 * builtins (`node:fs`) cannot match, because a package name may not start with `.` and may not
 * contain a colon.
 */
const SPECIFIER = "((?:@[a-z0-9][a-z0-9-._~]*\\/)?[a-z0-9][a-z0-9-._~]*)(?:\\/[^\"']*)?";

/**
 * Every package a source file reaches for.
 *
 * Deliberately broad and syntactic. It catches `import`, `export ... from`, side-effect imports,
 * `import type` / `export type` (see the header — type edges are edges), and `import(...)`
 * expressions, which matter here because Cesium and the replay layer are mounted through dynamic
 * import and would otherwise be an unchecked back door.
 *
 * It reads *every* package rather than only ours, because rule 4 asks the same question about a
 * third party: `@mui/x-charts` is one workspace member's and no one else's.
 */
export function importedPackages(source) {
  const found = new Set();
  const patterns = [
    // import x from "…" · export { x } from "…" · import type { X } from "…"
    new RegExp(`(?:^|[\\s;}])(?:import|export)\\b[\\s\\S]*?\\bfrom\\s*["']${SPECIFIER}["']`, "g"),
    // import "…"  (side effect)
    new RegExp(`(?:^|[\\s;}])import\\s*["']${SPECIFIER}["']`, "g"),
    // import("…") · await import("…")
    new RegExp(`\\bimport\\s*\\(\\s*["']${SPECIFIER}["']\\s*\\)`, "g"),
    // require("…") — not our module system, but cheap to catch and unambiguous if it appears
    new RegExp(`\\brequire\\s*\\(\\s*["']${SPECIFIER}["']\\s*\\)`, "g"),
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) found.add(m[1]);
  }
  return found;
}

/** The `@astro-mine/*` subset, which is what the layering rules 1–3 are about. */
export function importedAstroMinePackages(source) {
  return new Set([...importedPackages(source)].filter((name) => name.startsWith("@astro-mine/")));
}

/**
 * Is `importer` allowed to reach for the restricted package `imported`?
 *
 * @returns {null | string} null when it is allowed or the package is unrestricted, otherwise the
 *          reason it is not.
 */
function restrictionViolation(importer, imported) {
  const restriction = RESTRICTED_PACKAGES[imported];
  if (restriction === undefined || restriction.owners.includes(importer)) return null;

  const owners = restriction.owners.join(" and ");
  return `${imported} belongs to ${owners}, and nothing else here may reach for it. ${restriction.why}`;
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

    const declared = Object.keys({
      ...(pkg.dependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    });
    const sources = collectSources(dir).map((file) => ({
      file,
      imported: importedPackages(readFileSync(file, "utf8")),
    }));

    // --- rules 1-3: the layered graph --------------------------------------
    // Only for members of the graph. A package outside it is not this script's business.
    if (LAYERED.has(name)) {
      for (const dep of declared) {
        const reason = edgeViolation(name, dep);
        if (reason) {
          violations.push(
            `[manifest] ${relative(root, join(dir, "package.json"))} declares a dependency on ` +
              `${dep} — ${reason}`,
          );
        }
      }
      for (const { file, imported } of sources) {
        for (const specifier of imported) {
          const reason = edgeViolation(name, specifier);
          if (reason) {
            violations.push(`[import]   ${relative(root, file)} imports ${specifier} — ${reason}`);
          }
        }
      }
    }

    // --- rule 4: restricted third-party packages ---------------------------
    // Applies to EVERY workspace member, including ones outside the layered graph — the point is
    // that only one member may reach for the package, so the check must see all of them.
    for (const dep of declared) {
      const reason = restrictionViolation(name, dep);
      if (reason) {
        violations.push(
          `[manifest] ${relative(root, join(dir, "package.json"))} declares a dependency on ` +
            `${dep} — ${reason}`,
        );
      }
    }
    for (const { file, imported } of sources) {
      for (const specifier of imported) {
        const reason = restrictionViolation(name, specifier);
        if (reason) {
          violations.push(`[import]   ${relative(root, file)} imports ${specifier} — ${reason}`);
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
