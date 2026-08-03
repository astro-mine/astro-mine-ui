#!/usr/bin/env node
// Proof that the bundle budget is a gate (ui#8).
//
// The real export is comfortably inside its budget — which is the point of a budget and also why it
// can demonstrate nothing on its own. The failure modes are proven here against fixture export
// trees, the way `check-layering.test.mjs` proves the layering rule.
//
//   node --test scripts/check-bundle-budget.test.mjs      (or `pnpm check:bundle:test`)

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { measureRoutes, overBudget } from "./check-bundle-budget.mjs";

/**
 * Build a fake static export.
 *
 * @param {Record<string, {scripts: Record<string, number>, referenced?: string[]}>} spec
 *        keyed by route; `scripts` maps chunk name to size in bytes, `referenced` defaults to all
 *        of them — the difference is what code-splitting looks like from here.
 */
function exportTree(spec) {
  const root = mkdtempSync(join(tmpdir(), "astro-mine-budget-"));
  const chunks = join(root, "_next", "static", "chunks");
  mkdirSync(chunks, { recursive: true });

  for (const [route, { scripts, referenced }] of Object.entries(spec)) {
    for (const [name, size] of Object.entries(scripts)) {
      writeFileSync(join(chunks, name), "x".repeat(size));
    }
    const refs = referenced ?? Object.keys(scripts);
    const dir = route === "/" ? root : join(root, route.replace(/^\//, ""));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      `<html><body><h1>${route}</h1>` +
        refs.map((n) => `<script src="/_next/static/chunks/${n}"></script>`).join("") +
        `</body></html>`,
    );
  }
  return root;
}

function withTree(spec, fn) {
  const root = exportTree(spec);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const KIB = 1024;

test("measures the scripts a route actually references", () => {
  withTree({ "/": { scripts: { "a.js": 10 * KIB, "b.js": 5 * KIB } } }, (root) => {
    const [row] = measureRoutes(root);
    assert.equal(row.route, "/");
    assert.equal(row.bytes, 15 * KIB);
    assert.equal(row.scripts, 2);
  });
});

test("passes a route inside its budget", () => {
  withTree({ "/": { scripts: { "a.js": 100 * KIB } } }, (root) => {
    assert.deepEqual(overBudget(measureRoutes(root), { defaultKib: 200 }), []);
  });
});

test("FAILS a route over its budget, and says by how much", () => {
  withTree({ "/heavy": { scripts: { "a.js": 300 * KIB } } }, (root) => {
    const failures = overBudget(measureRoutes(root), { defaultKib: 200 });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /\/heavy/);
    assert.match(failures[0], /over its 200 KiB budget by 100\.0 KiB/);
  });
});

test("ignores a chunk no route references — that is code-splitting working", () => {
  // The Cesium case, which is the whole reason this measures references rather than directory size:
  // a 4 MB chunk that arrives through `next/dynamic` is in the export and in nobody's critical path.
  withTree(
    {
      "/": { scripts: { "small.js": 50 * KIB, "cesium.js": 4000 * KIB }, referenced: ["small.js"] },
    },
    (root) => {
      const [row] = measureRoutes(root);
      assert.equal(row.bytes, 50 * KIB);
      assert.deepEqual(overBudget([row], { defaultKib: 200 }), []);
    },
  );
});

test("FAILS when that same chunk stops being code-split", () => {
  // The regression the gate exists for: somebody imports @astro-mine/view statically, the chunk
  // lands in the route's HTML, and every page pays four megabytes for a globe it does not draw.
  withTree({ "/": { scripts: { "small.js": 50 * KIB, "cesium.js": 4000 * KIB } } }, (root) => {
    const failures = overBudget(measureRoutes(root), { defaultKib: 200 });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /over its 200 KiB budget/);
  });
});

test("honours a per-route budget over the default", () => {
  withTree(
    { "/": { scripts: { "a.js": 100 * KIB } }, "/heavy": { scripts: { "b.js": 300 * KIB } } },
    (root) => {
      const rows = measureRoutes(root);
      assert.deepEqual(overBudget(rows, { defaultKib: 200, budgets: { "/heavy": 400 } }), []);
    },
  );
});

test("FAILS on a referenced script that is not in the export", () => {
  // A broken build, not a small one. Counting a missing file as zero bytes would let the most
  // broken export imaginable pass the budget with room to spare.
  withTree({ "/": { scripts: { "a.js": 10 * KIB } } }, (root) => {
    writeFileSync(
      join(root, "index.html"),
      `<html><body><script src="/_next/static/chunks/gone.js"></script></body></html>`,
    );
    const failures = overBudget(measureRoutes(root), { defaultKib: 200 });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /not in the export/);
    assert.match(failures[0], /gone\.js/);
  });
});

test("reports the largest route first, so the table reads top-down", () => {
  withTree(
    {
      "/small": { scripts: { "s.js": 10 * KIB } },
      "/big": { scripts: { "b.js": 90 * KIB } },
      "/mid": { scripts: { "m.js": 50 * KIB } },
    },
    (root) => {
      assert.deepEqual(
        measureRoutes(root).map((r) => r.route),
        ["/big", "/mid", "/small"],
      );
    },
  );
});
