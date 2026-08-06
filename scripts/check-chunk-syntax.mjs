#!/usr/bin/env node
// Every emitted chunk must be parseable JavaScript (astro-mine-ui#55).
//
//   node scripts/check-chunk-syntax.mjs apps/console/out
//
// **The gate that was missing.** The build lane already asserts a great deal about the emitted bytes
// — that Cesium is staged, that its chunk is preloaded by no prerendered route, that every route
// emits its own `<h1>` — and none of it asks whether what was emitted **parses**. It did not, for two
// waves: Turbopack's minifier wrote an octal escape into a template literal and the 4 MB Cesium chunk
// became a syntax error, so every 3D surface in the shipped bundle was dead. Nothing went red,
// because no lane had ever mounted a globe from the export.
//
// A chunk that does not parse is not a subtle defect — the browser refuses the whole module and the
// feature simply never appears — so this is a build failure, not a warning.
//
// **Why this is not just `node --check`.** That parses as a CommonJS script, and a chunk which
// legitimately uses `import.meta` or top-level `import` fails it for a reason that is not a defect —
// Cesium's own perfectly valid `Build/Cesium/index.js` does exactly that. A gate with a known false
// positive is a gate somebody mutes within a week. So a file that fails the script parse is parsed
// **again as a module**, and only a file that fails *both* is reported. That is the honest question:
// "is this text valid JavaScript under either goal symbol", which is what a browser will ask.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

/** Parse `file` under one goal symbol. Returns the syntax error, or `null` when it parsed. */
function parseError(file) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: ["ignore", "pipe", "pipe"] });
    return null;
  } catch (error) {
    const text = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    const line = text.split("\n").find((l) => /^\s*(SyntaxError|Error):/.test(l));
    return line?.trim() ?? "failed to parse";
  }
}

/**
 * Whether `file` is valid JavaScript under **either** goal symbol.
 *
 * Node picks the goal from the extension, so the module attempt is a copy with an `.mjs` name. The
 * copy is deliberate: rewriting the original would make a check mutate what it checks.
 */
function parsesSomehow(file, scratch) {
  const asScript = parseError(file);
  if (asScript === null) return { ok: true };

  const asModulePath = join(scratch, `${basename(file, ".js")}.mjs`);
  writeFileSync(asModulePath, readFileSync(file));
  const asModule = parseError(asModulePath);
  rmSync(asModulePath, { force: true });
  if (asModule === null) return { ok: true };

  // Both failed. Report the script-mode error: for the failure this gate exists to catch they are
  // the same message, and for anything else the script parse is the more permissive of the two.
  return { ok: false, error: asScript };
}

/** Every `.js` file directly under the chunks directory of an export. */
export function chunkFiles(exportDir) {
  const dir = join(exportDir, "_next", "static", "chunks");
  const found = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".js")) found.push(path);
    }
  };
  walk(dir);
  return found.sort();
}

/**
 * Check every chunk. Exported so the self-test can drive it over a fixture tree.
 *
 * @returns {{ checked: number, broken: {file: string, error: string}[] }}
 */
export function checkChunks(exportDir) {
  const scratch = mkdtempSync(join(tmpdir(), "chunk-syntax-"));
  try {
    const files = chunkFiles(exportDir);
    const broken = [];
    for (const file of files) {
      const verdict = parsesSomehow(file, scratch);
      if (!verdict.ok) broken.push({ file, error: verdict.error });
    }
    return { checked: files.length, broken };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const root = process.argv[2] ?? "apps/console/out";
  const { checked, broken } = checkChunks(root);

  if (broken.length === 0) {
    console.log(`✓ all ${checked} emitted chunks parse`);
    process.exit(0);
  }

  console.error(
    `\n✗ ${broken.length} of ${checked} emitted chunks are not parseable JavaScript.\n\n` +
      broken.map(({ file, error }) => `  ${file}\n    ${error}`).join("\n\n") +
      `\n\n  A chunk that does not parse is a feature that never loads: the browser refuses the\n` +
      `  module, \`next/dynamic\` never resolves, and the loading state is permanent. Nothing else\n` +
      `  in this build will report it.\n\n` +
      `  If the message mentions an octal escape, the minifier has done it again — see\n` +
      `  scripts/repair-octal-escapes.mjs and astro-mine-ui#55.\n`,
  );
  process.exit(1);
}
