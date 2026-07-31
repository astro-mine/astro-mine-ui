#!/usr/bin/env node
// Proof that the layering gate is a gate.
//
// A check that has never been observed to fail is a check nobody should trust. The real tree has
// four empty packages and no violation to demonstrate, so the failure modes are proven here against
// throwaway fixture trees written under the OS temp directory — one per rule, plus the clean case.
//
// Node's built-in test runner, zero dependencies: `node --test scripts/check-layering.test.mjs`, or
// `pnpm check:layering:test`. Vitest arrives with the rest of the test harness in ui#8; this gate
// should not have to wait for it, and should not drag a test framework into a script whose whole
// point is that it runs with nothing installed.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { checkLayering, importedAstroMinePackages } from "./check-layering.mjs";

/**
 * Build a workspace fixture.
 *
 * @param {Record<string, {slot?: "packages"|"apps", pkg?: object, sources?: Record<string,string>}>} spec
 *        keyed by directory name under the slot.
 * @returns {string} the fixture root; caller removes it.
 */
function fixture(spec) {
  const root = mkdtempSync(join(tmpdir(), "astro-mine-layering-"));
  for (const [dirName, entry] of Object.entries(spec)) {
    const slot = entry.slot ?? "packages";
    const dir = join(root, slot, dirName);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify(entry.pkg ?? {}, null, 2));
    for (const [file, contents] of Object.entries(entry.sources ?? {})) {
      writeFileSync(join(dir, "src", file), contents);
    }
  }
  return root;
}

function withFixture(spec, fn) {
  const root = fixture(spec);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The legal graph, as the real tree declares it. */
const CLEAN = {
  "api-client": {
    pkg: { name: "@astro-mine/api-client" },
    sources: { "index.ts": "export {};\n" },
  },
  ui: { pkg: { name: "@astro-mine/ui" }, sources: { "index.ts": "export {};\n" } },
  view: { pkg: { name: "@astro-mine/view" }, sources: { "index.ts": "export {};\n" } },
  inspectors: {
    pkg: {
      name: "@astro-mine/inspectors",
      dependencies: { "@astro-mine/ui": "workspace:*", "@astro-mine/view": "workspace:*" },
    },
    sources: {
      "index.ts":
        'import { Panel } from "@astro-mine/ui";\nimport { Globe } from "@astro-mine/view";\nexport { Panel, Globe };\n',
    },
  },
  console: {
    slot: "apps",
    pkg: {
      name: "@astro-mine/console",
      dependencies: {
        "@astro-mine/api-client": "workspace:*",
        "@astro-mine/inspectors": "workspace:*",
        "@astro-mine/ui": "workspace:*",
        "@astro-mine/view": "workspace:*",
      },
    },
    sources: {
      "page.tsx":
        'import "@astro-mine/ui";\nimport { client } from "@astro-mine/api-client";\nexport default client;\n',
    },
  },
};

test("the legal graph passes", () => {
  withFixture(CLEAN, (root) => {
    const { violations, packageCount } = checkLayering(root);
    assert.deepEqual(violations, [], "the design's own graph must be clean");
    assert.equal(packageCount, 5);
  });
});

test("rule 1 — the application may import every package", () => {
  withFixture(CLEAN, (root) => {
    const { violations } = checkLayering(root);
    assert.equal(
      violations.filter((v) => v.includes("console")).length,
      0,
      "the app depends on all four packages and that is the design",
    );
  });
});

test("rule 2 — a package may not depend on the application (manifest)", () => {
  withFixture(
    {
      ...CLEAN,
      ui: {
        pkg: { name: "@astro-mine/ui", dependencies: { "@astro-mine/console": "workspace:*" } },
        sources: { "index.ts": "export {};\n" },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1);
      assert.match(violations[0], /^\[manifest\]/);
      assert.match(violations[0], /nothing may depend on @astro-mine\/console/);
    },
  );
});

test("rule 2 — a package may not import the application (source)", () => {
  withFixture(
    {
      ...CLEAN,
      view: {
        pkg: { name: "@astro-mine/view" },
        sources: {
          "index.ts": 'import { shell } from "@astro-mine/console";\nexport { shell };\n',
        },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1);
      assert.match(violations[0], /^\[import\]/);
      assert.match(violations[0], /nothing may depend on @astro-mine\/console/);
    },
  );
});

test("rule 3 — a leaf may not import a sibling", () => {
  withFixture(
    {
      ...CLEAN,
      ui: {
        pkg: { name: "@astro-mine/ui" },
        sources: {
          "index.ts": 'import { registry } from "@astro-mine/inspectors";\nexport { registry };\n',
        },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1);
      assert.match(violations[0], /may not depend on the sibling @astro-mine\/inspectors/);
      assert.match(violations[0], /it is a leaf/);
    },
  );
});

test("rule 3 — a type-only import is still an edge", () => {
  withFixture(
    {
      ...CLEAN,
      "api-client": {
        pkg: { name: "@astro-mine/api-client" },
        sources: {
          "index.ts": 'import type { Theme } from "@astro-mine/ui";\nexport type { Theme };\n',
        },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1, "import type must not be a hole in the rule");
      assert.match(violations[0], /may not depend on the sibling @astro-mine\/ui/);
    },
  );
});

test("rule 3 — inspectors' two permitted edges are permitted, and no others", () => {
  withFixture(
    {
      ...CLEAN,
      inspectors: {
        pkg: {
          name: "@astro-mine/inspectors",
          dependencies: {
            "@astro-mine/ui": "workspace:*",
            "@astro-mine/view": "workspace:*",
            "@astro-mine/api-client": "workspace:*",
          },
        },
        sources: { "index.ts": 'import "@astro-mine/ui";\nimport "@astro-mine/view";\n' },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1, "ui and view are legal; api-client is not");
      assert.match(violations[0], /may not depend on the sibling @astro-mine\/api-client/);
      assert.match(violations[0], /it may only depend on: @astro-mine\/ui, @astro-mine\/view/);
    },
  );
});

test("a dynamic import is an edge — Cesium and the replay layer mount this way", () => {
  withFixture(
    {
      ...CLEAN,
      ui: {
        pkg: { name: "@astro-mine/ui" },
        sources: {
          "lazy.ts": 'export const globe = () => import("@astro-mine/view");\n',
        },
      },
    },
    (root) => {
      const { violations } = checkLayering(root);
      assert.equal(violations.length, 1);
      assert.match(violations[0], /may not depend on the sibling @astro-mine\/view/);
    },
  );
});

test("an empty tree is clean rather than an error", () => {
  withFixture({}, (root) => {
    assert.deepEqual(checkLayering(root), { violations: [], packageCount: 0 });
  });
});

test("the specifier scanner reads every import form, and a subpath resolves to its package", () => {
  const found = importedAstroMinePackages(`
    import a from "@astro-mine/ui";
    import type { B } from "@astro-mine/view";
    export { c } from "@astro-mine/api-client";
    export type { D } from "@astro-mine/inspectors";
    import "@astro-mine/console";
    const e = await import("@astro-mine/ui/theme");
  `);
  assert.deepEqual([...found].sort(), [
    "@astro-mine/api-client",
    "@astro-mine/console",
    "@astro-mine/inspectors",
    "@astro-mine/ui",
    "@astro-mine/view",
  ]);
});

test("a package outside the layered graph is not this script's business", () => {
  withFixture(
    {
      ...CLEAN,
      unrelated: {
        pkg: { name: "@some-vendor/thing", dependencies: { "@astro-mine/console": "1.0.0" } },
        sources: { "index.ts": 'import "@astro-mine/console";\n' },
      },
    },
    (root) => {
      assert.deepEqual(checkLayering(root).violations, []);
    },
  );
});
