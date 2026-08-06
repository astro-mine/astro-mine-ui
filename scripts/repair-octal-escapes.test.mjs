#!/usr/bin/env node
// Proof that repairing the escapes changes the spelling and not the string (astro-mine-ui#55).
//
// This transform rewrites emitted, minified vendor code. That is only defensible if it provably
// cannot change behaviour, so "it parses now" is deliberately **not** the assertion here: every case
// below evaluates the source before and after and compares the resulting characters. A repair that
// produced valid JavaScript with different bytes in it would corrupt a wasm binary silently, and the
// symptom would be a globe that fails to decode terrain three layers away from the cause.
//
//   node --test scripts/repair-octal-escapes.test.mjs   (or `pnpm check:repair-escapes:test`)

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { repairOctalEscapes } from "./repair-octal-escapes.mjs";

/** Evaluate a JS expression in a fresh process, returning the char codes of the string it yields. */
function codesOf(expression) {
  const scratch = mkdtempSync(join(tmpdir(), "escape-eval-"));
  const file = join(scratch, "probe.cjs");
  try {
    writeFileSync(
      file,
      `const s = ${expression};process.stdout.write(JSON.stringify([...s].map(c=>c.charCodeAt(0))));`,
    );
    return JSON.parse(execFileSync(process.execPath, [file], { encoding: "utf8" }));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Does this source parse at all? Templates with octal escapes do not. */
function parses(source) {
  const scratch = mkdtempSync(join(tmpdir(), "escape-parse-"));
  const file = join(scratch, "probe.cjs");
  try {
    writeFileSync(file, source);
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

test("the exact failure: an octal escape inside a template literal", () => {
  // What SWC emits, and what the browser refuses. Written as text because a file containing it
  // could not be parsed — which is the whole point.
  const broken = "`a\\00b`";
  assert.equal(parses(`const x = ${broken};`), false, "precondition: this must not parse");

  const { text, repairs } = repairOctalEscapes(broken);
  assert.equal(repairs, 1);
  assert.equal(text, "`a\\x00b`");
  assert.equal(parses(`const x = ${text};`), true);

  // ...and it is the same three characters. `"a\00b"` is the legal, sloppy-mode spelling.
  assert.deepEqual(codesOf(text), codesOf('"a\\00b"'));
  assert.deepEqual(codesOf(text), [97, 0, 98]);
});

test("longest-match octal, exactly as the grammar reads it", () => {
  // `\012` is ONE character (10), not `\0` then "12". Getting this wrong would silently rewrite a
  // byte and corrupt the wasm.
  for (const [octal, code] of [
    ["\\012", 10],
    ["\\101", 65],
    ["\\7", 7],
    ["\\77", 63],
    ["\\377", 255],
  ]) {
    const { text } = repairOctalEscapes(`\`${octal}\``);
    assert.deepEqual(codesOf(text), [code], `${octal} should be char ${code}, got ${text}`);
    assert.deepEqual(codesOf(text), codesOf(`"${octal}"`), `${octal} must survive the rewrite`);
  }
});

test("four to seven take at most two digits", () => {
  // `\412` is `\41` (33) followed by the character "2" — three digits only when the first is 0-3.
  const { text } = repairOctalEscapes("`\\412`");
  assert.deepEqual(codesOf(text), codesOf('"\\412"'));
  assert.deepEqual(codesOf(text), [33, 50]);
});

test("a lone \\0 is legal in a template and is left alone", () => {
  // Legal, so rewriting it would be churn rather than repair — and churn in a 4 MB file is a diff
  // nobody can review.
  const { text, repairs } = repairOctalEscapes("`a\\0b`");
  assert.equal(repairs, 0);
  assert.equal(text, "`a\\0b`");
  assert.deepEqual(codesOf(text), [97, 0, 98]);
});

test("\\0 followed by a decimal digit is a legacy escape and is repaired", () => {
  // `\08` is NUL then "8" — illegal in a template, and 8 is not an octal digit so it is not consumed.
  const { text, repairs } = repairOctalEscapes("`\\08`");
  assert.equal(repairs, 1);
  assert.equal(parses(`const x = ${text};`), true);
  assert.deepEqual(codesOf(text), codesOf('"\\08"'));
  assert.deepEqual(codesOf(text), [0, 56]);
});

test("\\8 and \\9 are the digits themselves", () => {
  const { text } = repairOctalEscapes("`\\8\\9`");
  assert.equal(parses(`const x = ${text};`), true);
  assert.deepEqual(codesOf(text), codesOf('"\\8\\9"'));
  assert.deepEqual(codesOf(text), [56, 57]);
});

test("an escaped backslash is not an escape — the case a regex would corrupt", () => {
  // `\\00` is a backslash and two zeroes. A naive /\\[0-7]/ replace would eat the second backslash
  // and turn three characters into two.
  const { text, repairs } = repairOctalEscapes("`\\\\00`");
  assert.equal(repairs, 0, "nothing here is an octal escape");
  assert.deepEqual(codesOf(text), codesOf('"\\\\00"'));
  assert.deepEqual(codesOf(text), [92, 48, 48]);
});

test("other escapes are carried through untouched, keeping the walk in step", () => {
  const source = "`\\n\\t\\x41\\u0042\\`\\${notASubstitution}`";
  const { text, repairs } = repairOctalEscapes(source);
  assert.equal(repairs, 0);
  assert.equal(text, source);
});

test("a realistic chunk: binary payload, repaired byte-for-byte", () => {
  // Every byte 0-255 as one escaped string — the shape of the inlined wasm, in miniature. The
  // assertion is byte equality against the legal spelling, because a wasm binary that decodes to
  // one wrong byte is a module that fails to instantiate.
  const bytes = Array.from({ length: 256 }, (_, i) => i);
  const spelled = bytes.map((b) => `\\${b.toString(8)}`).join("");
  const { text } = repairOctalEscapes(`\`${spelled}\``);

  assert.equal(parses(`const x = ${text};`), true);
  assert.deepEqual(codesOf(text), bytes);
});

test("a file with nothing to repair is returned unchanged", () => {
  const source = "export const a = `hello ${name}`;\nconst b = /[0-9]+/;\n";
  const { text, repairs } = repairOctalEscapes(source);
  assert.equal(repairs, 0);
  assert.equal(text, source);
});
