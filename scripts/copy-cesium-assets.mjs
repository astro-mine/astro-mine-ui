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

  await writeFile(stamp, `${version}\n`, "utf8");
  console.log(`staged cesium ${version} runtime assets → ${shown}`);
}

try {
  await stageCesiumAssets(process.argv[2] ?? DEFAULT_DESTINATION, process.cwd());
} catch (error) {
  console.error(`astro-mine-view-cesium-assets: ${error.message}`);
  process.exitCode = 1;
}
