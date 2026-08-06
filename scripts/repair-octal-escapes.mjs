#!/usr/bin/env node
// Repair the invalid escapes Turbopack's minifier emits into the Cesium chunk (astro-mine-ui#55).
//
//   node scripts/repair-octal-escapes.mjs apps/console/out
//
// **What is broken, precisely.** Cesium ships `cesium/Build/Cesium/index.js` already minified and
// perfectly valid, with a wasm module inlined as a byte-string — emscripten's single-file trick,
// decoded at runtime with `~c >> 8 & c`. That file contains **zero** octal escapes. Turbopack then
// re-minifies that vendor bundle with SWC, which moves the byte-string into a **template literal**
// and writes NUL as `\00`. An octal escape is legal in the string Cesium shipped and is a **syntax
// error** in a template literal, so evaluating the chunk throws:
//
//     SyntaxError: Octal escape sequences are not allowed in template strings.
//
// `next/dynamic` never resolves the import, the loading fallback is permanent, and **every 3D
// surface in the shipped export is dead** — the artifact globe, the design-study inspection pane and
// the submission replay all load that chunk. It is invisible in `pnpm dev`, because minification
// only runs in a production build. Upstream: https://github.com/swc-project/swc/issues/361 — still
// reproducing on Next 16.2.12 and 16.3.0.
//
// **Why repairing the output is acceptable here, when editing emitted bytes normally is not.** The
// rewrite is `\00` → `\x00`: the *same character*, in every context JavaScript has — a string, a
// template literal, a regular expression. It cannot change behaviour, only spelling. Three things
// then hold it honest rather than hopeful:
//
//   - `scripts/check-chunk-syntax.mjs` fails the build unless **every** emitted chunk parses, so the
//     repair cannot silently stop working;
//   - `repair-octal-escapes.test.mjs` asserts the transform against the escape grammar and proves a
//     repaired source **evaluates to the identical string**, not merely that it parses;
//   - the journey lane mounts a real globe in a real browser, which is what proves the chunk runs.
//
// The alternatives were measured and are worse: `turbopackMinify: false` produces valid chunks and
// takes the chunk directory from 9.8 MB to 32 MB, which also breaches the per-route bundle budget;
// `next build --webpack` fails for unrelated reasons and is a far larger change; Next 16.3.0 does not
// fix it.
//
// **DELETE THIS when SWC stops emitting octal escapes into template literals.** The check script
// stays either way. `pnpm check:chunks` passing with this step removed is the whole exit condition.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OCTAL = /[0-7]/;
const DECIMAL = /[0-9]/;

/**
 * Rewrite every escape that is illegal inside a template literal into an equivalent `\xNN`.
 *
 * The grammar is Annex B's, and it is followed exactly rather than approximated, because a
 * "close enough" reading changes which characters come out:
 *
 *   - `\0` **not** followed by a decimal digit is the NUL escape. It is legal in a template literal
 *     and is left alone — rewriting it would be churn, not repair.
 *   - `\0` followed by `8` or `9` is a legacy octal escape (NUL, then the digit) and is illegal.
 *   - One to three octal digits form one escape, **longest match wins**: `\012` is one character
 *     (10), not `\0` followed by `12`. Three digits only when the first is 0–3; `\4`–`\7` take two.
 *   - `\8` and `\9` are `NonOctalDecimalEscapeSequence` — the digit itself — and are illegal in a
 *     template literal, so they become the bare digit.
 *
 * A backslash escapes whatever follows it, so `\\00` is a backslash and two zeroes and **must not**
 * be touched. Walking the text and consuming escape pairs is what gets that right; a regular
 * expression over the file would corrupt it.
 *
 * @param {string} source
 * @returns {{ text: string, repairs: number }}
 */
export function repairOctalEscapes(source) {
  let out = "";
  let repairs = 0;
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    if (char !== "\\") {
      out += char;
      i += 1;
      continue;
    }

    const next = source[i + 1];

    // An escaped backslash consumes both characters. This is the case a regex gets wrong.
    if (next === "\\") {
      out += "\\\\";
      i += 2;
      continue;
    }

    if (next === "8" || next === "9") {
      out += next;
      repairs += 1;
      i += 2;
      continue;
    }

    if (next !== undefined && OCTAL.test(next)) {
      const maxDigits = next <= "3" ? 3 : 2;
      let digits = next;
      let j = i + 2;
      while (digits.length < maxDigits && j < source.length && OCTAL.test(source[j])) {
        digits += source[j];
        j += 1;
      }

      // `\0` alone is the NUL escape and is legal in a template literal. It is only a legacy octal
      // escape when a decimal digit follows it — including 8 and 9, which are not octal digits and
      // so were not consumed above.
      const isLoneNul = digits === "0" && !(j < source.length && DECIMAL.test(source[j]));
      if (isLoneNul) {
        out += "\\0";
        i += 2;
        continue;
      }

      const code = Number.parseInt(digits, 8);
      out += `\\x${code.toString(16).padStart(2, "0")}`;
      repairs += 1;
      i = j;
      continue;
    }

    // Any other escape — `\n`, `\x41`, `A`, `\``, a line continuation — is copied with the
    // character it escapes, so the walk stays in step with the source.
    out += char;
    if (next !== undefined) out += next;
    i += next === undefined ? 1 : 2;
  }

  return { text: out, repairs };
}

/** Every `.js` file under `dir`, recursively. */
function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(path);
    else if (entry.name.endsWith(".js")) yield path;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const root = process.argv[2];
  if (root === undefined) {
    console.error("usage: node scripts/repair-octal-escapes.mjs <export-dir>");
    process.exit(2);
  }

  let touched = 0;
  let total = 0;
  for (const file of jsFiles(root)) {
    if (!statSync(file).isFile()) continue;
    const source = readFileSync(file, "utf8");
    const { text, repairs } = repairOctalEscapes(source);
    if (repairs === 0) continue;
    writeFileSync(file, text);
    touched += 1;
    total += repairs;
    console.log(`  repaired ${repairs} escape(s) in ${file.replace(`${root}/`, "")}`);
  }

  console.log(
    touched === 0
      ? "No invalid escapes in the export. If this stays true, delete this step (astro-mine-ui#55)."
      : `Repaired ${total} escape(s) across ${touched} file(s) — SWC emitted octal escapes into ` +
          `template literals (swc-project/swc#361).`,
  );
}
