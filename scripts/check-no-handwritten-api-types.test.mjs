#!/usr/bin/env node
// Proof that the hand-written-API-types gate is a gate.
//
// Same reasoning as `check-layering.test.mjs`, and the same shape: the real tree is clean by
// construction, so the failure modes are demonstrated against throwaway fixture trees under the OS
// temp directory. A check nobody has watched reject anything is a check nobody should trust — and
// this one in particular has to keep working long after everyone has forgotten it exists.
//
// Node's built-in test runner, zero dependencies:
// `node --test scripts/check-no-handwritten-api-types.test.mjs`, or `pnpm check:api-types:test`.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { checkNoHandwrittenApiTypes } from "./check-no-handwritten-api-types.mjs";

/** A document with two component schemas, standing in for the API's 78. */
const DOCUMENT = {
  openapi: "3.1.0",
  paths: {},
  components: { schemas: { ArtifactDetail: {}, Problem: {} } },
};

/**
 * Build a fixture tree.
 *
 * @param {Record<string, string>} files  repo-relative path → contents
 * @param {object|null} document          the vendored OpenAPI document, or null to omit it
 */
function fixture(files, document = DOCUMENT) {
  const root = mkdtempSync(join(tmpdir(), "astro-mine-api-types-"));
  const write = (relativePath, contents) => {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };
  if (document) write("packages/api-client/openapi/openapi.json", JSON.stringify(document));
  for (const [path, contents] of Object.entries(files)) write(path, contents);
  return root;
}

function withFixture(files, fn, document = DOCUMENT) {
  const root = fixture(files, document);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a page that calls the generated client is clean", () => {
  withFixture(
    {
      "apps/console/src/page.tsx":
        'import { createApiClient } from "@astro-mine/api-client";\n' +
        "const api = createApiClient({ baseUrl });\n" +
        "await api.hubSearch({ query: { q } });\n",
    },
    (root) => {
      const { violations, schemas } = checkNoHandwrittenApiTypes(root);
      assert.deepEqual(violations, []);
      assert.equal(schemas, 2);
    },
  );
});

test("a page that opens its own request is rejected", () => {
  withFixture(
    { "apps/console/src/page.tsx": 'const r = await fetch("/hub/search");\n' },
    (root) => {
      const { violations } = checkNoHandwrittenApiTypes(root);
      assert.equal(violations.length, 1);
      assert.equal(violations[0].file, "apps/console/src/page.tsx");
      assert.equal(violations[0].line, 1);
      assert.match(violations[0].message, /opens a request directly/);
    },
  );
});

test("the qualified spellings of fetch are rejected too", () => {
  withFixture(
    {
      "apps/console/src/a.ts": "await globalThis.fetch(url);\n",
      "apps/console/src/b.ts": "await window.fetch(url);\n",
    },
    (root) => {
      assert.equal(checkNoHandwrittenApiTypes(root).violations.length, 2);
    },
  );
});

test("passing a fetch along is not opening a request", () => {
  // `createApiClient({ fetch: doFetch })` and `config.fetch` are how the client is injected in
  // tests. A gate that flagged them would be one people turn off.
  withFixture(
    {
      "apps/console/src/page.tsx":
        "const api = createApiClient({ baseUrl, fetch: injected });\n" +
        "const doFetch = config.fetch ?? globalThis.fetch;\n",
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("the client itself may open requests — it is the transport", () => {
  withFixture(
    {
      "packages/api-client/src/request.ts": "const response = await fetch(url, init);\n",
      // ...and so may its own tests, which drive the transport against the fake on purpose.
      "packages/api-client/tests/msw.test.ts": 'const r = await fetch("/hub/publish");\n',
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("another package's tests may not — a page test that hand-rolls a request is still one", () => {
  withFixture({ "packages/ui/tests/chart.test.ts": 'await fetch("/bench/metrics");\n' }, (root) => {
    assert.equal(checkNoHandwrittenApiTypes(root).violations.length, 1);
  });
});

test("a mirrored response type in a page is rejected, by name", () => {
  withFixture(
    {
      "apps/console/src/types.ts":
        "// Mirrors the API. Keep in sync!\n" +
        "export interface ArtifactDetail {\n  name: string;\n}\n",
    },
    (root) => {
      const { violations } = checkNoHandwrittenApiTypes(root);
      assert.equal(violations.length, 1);
      assert.equal(violations[0].line, 2);
      assert.match(violations[0].message, /ArtifactDetail/);
      assert.match(violations[0].message, /hand-copied mirror/);
    },
  );
});

test("a mirrored type alias is rejected as well as an interface", () => {
  withFixture({ "packages/ui/src/x.ts": "type Problem = { code: string };\n" }, (root) => {
    assert.equal(checkNoHandwrittenApiTypes(root).violations.length, 1);
  });
});

test("deriving the name from the document is the opposite of mirroring it, and is allowed", () => {
  // Naming a shape is fine; restating one is not. There is nothing in an alias to drift.
  withFixture(
    {
      "packages/api-client/src/errors.ts":
        'import type { components } from "./generated/schema.gen.js";\n' +
        'export type Problem = components["schemas"]["Problem"];\n' +
        'export type ArtifactDetail =\n  components["schemas"]["ArtifactDetail"];\n',
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("an interface is a restatement whatever it says, so the derivation escape does not apply", () => {
  withFixture(
    {
      "apps/console/src/page.tsx":
        'export interface Problem {\n  code: components["schemas"]["ErrorCode"];\n}\n',
    },
    (root) => {
      assert.equal(checkNoHandwrittenApiTypes(root).violations.length, 1);
    },
  );
});

test("the generated output may declare the API's names — that is its job", () => {
  withFixture(
    {
      "packages/api-client/src/generated/schema.gen.ts":
        "export interface components {\n  schemas: { ArtifactDetail: unknown; Problem: unknown };\n}\n",
      "packages/api-client/src/generated/operations.gen.ts": "export type Problem = never;\n",
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("a type whose name is not a schema's is none of the gate's business", () => {
  withFixture(
    { "apps/console/src/page.tsx": "interface PageProps {\n  id: string;\n}\n" },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("with no document present, the name check stands down rather than guessing", () => {
  // The drift gate is what reports a missing document; reporting it twice sends a reader to the
  // wrong script.
  withFixture(
    { "apps/console/src/types.ts": "export interface ArtifactDetail {}\n" },
    (root) => {
      const { violations, schemas } = checkNoHandwrittenApiTypes(root);
      assert.equal(schemas, 0);
      assert.deepEqual(violations, []);
    },
    null,
  );
});

test("build output and dependencies are not searched", () => {
  withFixture(
    {
      "apps/console/dist/page.js": 'await fetch("/x");\n',
      "apps/console/node_modules/pkg/index.ts": "export interface Problem {}\n",
      "apps/console/.next/server/x.ts": 'await fetch("/x");\n',
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});

test("a commented-out fetch is not a request", () => {
  withFixture(
    {
      "apps/console/src/page.tsx":
        '// await fetch("/hub/search");  <- the thing this replaced\n' +
        " * await fetch(url) in a doc block\n",
    },
    (root) => {
      assert.deepEqual(checkNoHandwrittenApiTypes(root).violations, []);
    },
  );
});
