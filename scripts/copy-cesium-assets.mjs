#!/usr/bin/env node
/**
 * `astro-mine-view-cesium-assets` — stage CesiumJS's runtime assets into a host's static directory.
 *
 *     pnpm exec astro-mine-view-cesium-assets [destination]     # default: public/cesium
 *
 * Cesium loads its Web Workers, glTF/draco decoders, imagery, and widget stylesheets at *runtime*
 * from `window.CESIUM_BASE_URL` rather than through the bundler, so those files must be served as
 * static assets. `@astro-mine/view` externalizes `cesium` entirely — it is a peer dependency, and a
 * host must end up with exactly one copy (view.md §2.4, §7) — so staging its assets is the host's
 * job. This ships as a `bin` so Studio (and later Ops) do not each copy-paste the script
 * (RM-P1-VIEW-05 / astro-mine-view#7). Our own demo harness runs it through this same entry point,
 * so the published path is the tested path.
 *
 * A plain Node script rather than a Vite plugin on purpose: the community Cesium plugins peer-cap
 * below Vite 8, and this repo tracks Hub's Vite 8 (rolldown) toolchain. Nothing here needs a plugin.
 *
 * Everything resolves against the **consumer's** working directory — the destination, and `cesium`
 * itself. Re-running is cheap: a version stamp in the destination short-circuits an unchanged copy.
 */

import { createRequire } from "node:module";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

/** The four directories Cesium fetches at runtime. Everything else in `Build/` is bundler input. */
const RUNTIME_DIRS = ["Assets", "ThirdParty", "Widgets", "Workers"];

/**
 * Cesium's own notices, copied from the package root beside the runtime assets (ui#66).
 *
 * **This is a licence term, not a courtesy.** The staged bundle redistributes CesiumJS and the 23
 * components its `ThirdParty.json` lists — 14 MIT, 4 Apache-2.0, 3 ISC, 2 BSD-3-Clause. MIT and
 * BSD-3-Clause both *require* the copyright notice and permission text to travel with a
 * redistribution, and Apache-2.0 §4 requires giving recipients the licence and retaining
 * attribution. Until this, the export carried none of the three.
 *
 * `LICENSE.md` is the one that discharges it: Cesium aggregates every bundled component's text
 * there (55 KB of it), and all 23 are covered — several under their author's name rather than the
 * package's, which is why a package-name search of it under-reports. `ThirdParty.json` is the
 * machine-readable manifest of what those 23 are.
 *
 * Copied *here*, in the script that stages the bytes, because this is the only place that knows
 * which version's notices belong with which assets. The version stamp then does the rest: a Cesium
 * bump misses the short-circuit and re-copies the new version's notices along with everything else,
 * so the notices cannot go stale while the assets move.
 */
const NOTICE_FILES = ["LICENSE.md", "ThirdParty.json"];

/** Where the aggregated notice lands. A predictable path a deployment can serve or point at. */
const NOTICE_NAME = "THIRD-PARTY-NOTICES.md";

const DEFAULT_DESTINATION = join("public", "cesium");
const STAMP_NAME = ".cesium-version";

/** Resolve `cesium` as the *consumer* would — from its own `package.json`, never from ours. */
function resolveCesiumRoot(cwd) {
  const require = createRequire(join(cwd, "package.json"));
  try {
    return dirname(require.resolve("cesium/package.json"));
  } catch {
    throw new Error(
      `could not resolve "cesium" from ${cwd}. It is a peer dependency of @astro-mine/view — ` +
        "install it (`pnpm add cesium`) and re-run.",
    );
  }
}

/**
 * A single aggregated notice: what is redistributed here, under what licence, and where the text is.
 *
 * Deliberately an index rather than a second copy of the texts — `LICENSE.md` beside it already
 * carries those, and two copies of a licence text is one of them going stale. What this adds is the
 * thing neither upstream file states plainly: that these components are *in this deployable*.
 */
async function buildNotice(cesiumRoot, version) {
  const manifest = JSON.parse(await readFile(join(cesiumRoot, "ThirdParty.json"), "utf8"));
  const rows = manifest
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const licence = Array.isArray(entry.license) ? entry.license.join(", ") : entry.license;
      return `| ${entry.name} | ${entry.version ?? "—"} | ${licence} | ${entry.url ?? "—"} |`;
    });
  const counts = {};
  for (const entry of manifest) {
    for (const licence of Array.isArray(entry.license) ? entry.license : [entry.license]) {
      counts[licence] = (counts[licence] ?? 0) + 1;
    }
  }
  const summary = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([licence, n]) => `${licence} ×${n}`)
    .join(", ");

  return [
    "# Third-party notices",
    "",
    `This deployment bundles **CesiumJS ${version}** (Apache-2.0) and the ${manifest.length} ` +
      `components below that Cesium redistributes: ${summary}.`,
    "",
    "Full licence texts for CesiumJS **and every component listed here** are in `LICENSE.md`",
    "beside this file; the machine-readable manifest is `ThirdParty.json`. Both are copied verbatim",
    "from the Cesium package at the version above, by `scripts/copy-cesium-assets.mjs`, so they",
    "cannot describe a different version than the assets they ship with.",
    "",
    "| Component | Version | Licence | Source |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

async function stageCesiumAssets(destination, cwd) {
  const outDir = isAbsolute(destination) ? destination : resolve(cwd, destination);
  const stamp = join(outDir, STAMP_NAME);
  const shown = relative(cwd, outDir) || outDir;

  const cesiumRoot = resolveCesiumRoot(cwd);
  const { version } = JSON.parse(await readFile(join(cesiumRoot, "package.json"), "utf8"));

  const stamped = existsSync(stamp) ? (await readFile(stamp, "utf8")).trim() : null;
  if (stamped === version) {
    console.log(`cesium ${version} assets already staged in ${shown}`);
    return;
  }

  // Staging replaces the destination wholesale, so refuse to replace a directory we did not stage.
  // `astro-mine-view-cesium-assets public` is one path segment away from the documented
  // `public/cesium`, and would otherwise delete the host's index.html on its way past.
  if (existsSync(outDir) && stamped === null && (await readdir(outDir)).length > 0) {
    throw new Error(
      `refusing to replace ${shown}: it is not empty and carries no ${STAMP_NAME}, so it was not ` +
        "staged by this tool. Point it at a dedicated directory, e.g. public/cesium.",
    );
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const name of RUNTIME_DIRS) {
    const from = join(cesiumRoot, "Build", "Cesium", name);
    if (!existsSync(from)) {
      throw new Error(`cesium ${version} has no Build/Cesium/${name}; the package layout changed`);
    }
    await cp(from, join(outDir, name), { recursive: true });
  }

  for (const name of NOTICE_FILES) {
    const from = join(cesiumRoot, name);
    if (!existsSync(from)) {
      throw new Error(
        `cesium ${version} ships no ${name}. The bundle redistributes 23 third-party components ` +
          "and MIT and BSD-3-Clause require their notices to travel with it, so staging the assets " +
          "without it would put an unnotified redistribution into the deployable (ui#66).",
      );
    }
    await cp(from, join(outDir, name));
  }
  await writeFile(join(outDir, NOTICE_NAME), await buildNotice(cesiumRoot, version), "utf8");

  await writeFile(stamp, `${version}\n`, "utf8");
  console.log(
    `staged cesium ${version} runtime assets + notices (${NOTICE_FILES.join(", ")}, ` +
      `${NOTICE_NAME}) → ${shown}`,
  );
}

try {
  await stageCesiumAssets(process.argv[2] ?? DEFAULT_DESTINATION, process.cwd());
} catch (error) {
  console.error(`astro-mine-view-cesium-assets: ${error.message}`);
  process.exitCode = 1;
}
