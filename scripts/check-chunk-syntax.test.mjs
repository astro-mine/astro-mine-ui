#!/usr/bin/env node
// Proof that the chunk-syntax gate is a gate (astro-mine-ui#55).
//
// Two things have to be true of it, and they pull in opposite directions: it must **reject** the
// chunk that shipped broken for two waves, and it must **not** reject a chunk that is merely an ES
// module. Cesium's own valid `Build/Cesium/index.js` fails a plain `node --check` because of
// `import.meta`, so a gate without the second property would be a gate somebody mutes.
//
//   node --test scripts/check-chunk-syntax.test.mjs   (or `pnpm check:chunks:test`)

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkChunks } from "./check-chunk-syntax.mjs";

/** A fixture export: `{ "name.js": source }` under `_next/static/chunks`. */
function exportWith(chunks) {
  const root = mkdtempSync(join(tmpdir(), "chunk-gate-"));
  const dir = join(root, "_next", "static", "chunks");
  mkdirSync(dir, { recursive: true });
  for (const [name, source] of Object.entries(chunks)) writeFileSync(join(dir, name), source);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("accepts an export whose chunks all parse", (t) => {
  const f = exportWith({
    "a.js": "console.log(`fine ${1 + 1}`);\n",
    "b.js": "var x = 'also fine';\n",
  });
  t.after(f.cleanup);

  const { checked, broken } = checkChunks(f.root);
  assert.equal(checked, 2);
  assert.deepEqual(broken, []);
});

test("rejects the octal escape in a template literal — the defect it exists for", (t) => {
  // Exactly what Turbopack emitted into the Cesium chunk.
  const f = exportWith({ "ok.js": "var a = 1;\n", "cesium.js": "var w = `\\00payload`;\n" });
  t.after(f.cleanup);

  const { checked, broken } = checkChunks(f.root);
  assert.equal(checked, 2);
  assert.equal(broken.length, 1);
  assert.match(broken[0].file, /cesium\.js$/);
  assert.match(broken[0].error, /Octal escape/i);
});

test("does not reject a chunk that is only an ES module", (t) => {
  // The false positive that would get this muted: valid code that a CommonJS parse refuses.
  // Cesium's own shipped bundle is exactly this shape.
  const f = exportWith({
    "esm.js": "import.meta.url;\nexport const x = 1;\n",
    "topLevelAwait.js": "export const y = await Promise.resolve(1);\n",
  });
  t.after(f.cleanup);

  const { checked, broken } = checkChunks(f.root);
  assert.equal(checked, 2);
  assert.deepEqual(broken, [], "an ES module is not a broken chunk");
});

test("reports every broken chunk, not just the first", (t) => {
  const f = exportWith({
    "one.js": "var a = `\\00`;\n",
    "two.js": "var b = `\\01`;\n",
    "three.js": "var c = 'fine';\n",
  });
  t.after(f.cleanup);

  const { checked, broken } = checkChunks(f.root);
  assert.equal(checked, 3);
  assert.equal(broken.length, 2);
});

test("a genuinely malformed chunk is rejected under both goal symbols", (t) => {
  const f = exportWith({ "junk.js": "function ( { unterminated\n" });
  t.after(f.cleanup);

  const { broken } = checkChunks(f.root);
  assert.equal(broken.length, 1);
});

test("the repaired form of the real defect passes", async (t) => {
  const { repairOctalEscapes } = await import("./repair-octal-escapes.mjs");
  const f = exportWith({ "cesium.js": repairOctalEscapes("var w = `\\00payload`;\n").text });
  t.after(f.cleanup);

  assert.deepEqual(checkChunks(f.root).broken, [], "repair then check is the shipped pipeline");
});
