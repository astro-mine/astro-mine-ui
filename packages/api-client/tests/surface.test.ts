// The generated surface is the document's surface — no operation missing, none invented, none
// typed as nothing. This is the acceptance criterion that decays, so it is asserted rather than
// counted by hand.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApiClient, OPERATIONS, type ApiOperations } from "../src/index.js";

const DOCUMENT = JSON.parse(
  readFileSync(fileURLToPath(new URL("../openapi/openapi.json", import.meta.url)), "utf8"),
) as {
  openapi: string;
  paths: Record<
    string,
    Record<string, { operationId?: string; responses: Record<string, { content?: object }> }>
  >;
  components: { schemas: Record<string, object> };
};

const VERBS = new Set(["get", "put", "post", "delete", "patch"]);

/** Every operation the document declares: `{operationId, method, path}`, sorted. */
const declared = Object.entries(DOCUMENT.paths)
  .flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([verb]) => VERBS.has(verb))
      .map(([verb, operation]) => ({
        operationId: operation.operationId as string,
        method: verb.toUpperCase(),
        path,
      })),
  )
  .sort((a, b) => a.operationId.localeCompare(b.operationId));

describe("the operation table", () => {
  it("covers the document exactly", () => {
    // Deliberately not a hard-coded count. `ui-rebuild-plan.md` §3 says "37 routes"; the document
    // at api#4 serves 40. A literal here would encode whichever number was true the day it was
    // written and then quietly disagree with the contract — which is the failure this whole
    // package exists to prevent.
    const generated = Object.values(OPERATIONS)
      .map(({ operationId, method, path }) => ({ operationId, method, path }))
      .sort((a, b) => a.operationId.localeCompare(b.operationId));

    expect(generated).toEqual(declared);
  });

  it("is not empty, so an emitter that silently produced nothing would fail here", () => {
    expect(declared.length).toBeGreaterThan(30);
    expect(Object.keys(OPERATIONS)).toHaveLength(declared.length);
  });

  it("names every method after its operation id, in camelCase (api#3)", () => {
    for (const spec of Object.values(OPERATIONS)) {
      const expected = spec.operationId.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
      expect(spec.name).toBe(expected);
    }
  });

  it("embeds no path or method in a method name — renaming a URL must not rename a method", () => {
    for (const name of Object.keys(OPERATIONS)) {
      expect(name).not.toMatch(/^(get|post|put|patch|delete)[A-Z]/);
      expect(name).not.toMatch(/(Get|Post|Put|Patch|Delete)$/);
    }
  });
});

describe("the client", () => {
  it("exposes a callable method for every operation", () => {
    const api = createApiClient({ baseUrl: "https://api.test" }) as unknown as Record<
      string,
      unknown
    >;
    for (const name of Object.keys(OPERATIONS)) {
      expect(typeof api[name], `${name} is not callable`).toBe("function");
    }
  });

  it("exposes nothing the document does not declare", () => {
    const api = createApiClient({ baseUrl: "https://api.test" });
    expect(Object.keys(api).sort()).toEqual(Object.keys(OPERATIONS).sort());
  });
});

describe("every route is typed", () => {
  it("declares a success body with a schema — nothing resolves to nothing", () => {
    const untyped: string[] = [];
    for (const [path, item] of Object.entries(DOCUMENT.paths)) {
      for (const [verb, operation] of Object.entries(item)) {
        if (!VERBS.has(verb)) continue;
        const [, success] =
          Object.entries(operation.responses).find(([code]) => code.startsWith("2")) ?? [];
        const content = (success?.content ?? {}) as Record<string, { schema?: object }>;
        const [schema] = Object.values(content);
        if (!schema?.schema || Object.keys(schema.schema).length === 0) {
          untyped.push(`${verb.toUpperCase()} ${path}`);
        }
      }
    }
    expect(untyped).toEqual([]);
  });
});

/**
 * ...and the same claim at the type level, which is the half a runtime test cannot make.
 *
 * `unknown extends T` is true only for `unknown` and `any`, so this collects the name of any
 * operation whose result is either. If the collection is non-empty the assignment below does not
 * compile, and `pnpm typecheck` is where it fails — with the offending operation named in the
 * error. Nothing needs to run for this to hold.
 */
type Results = { [K in keyof ApiOperations]: Awaited<ReturnType<ApiOperations[K]>> };
type UntypedResults = {
  [K in keyof Results]: unknown extends Results[K] ? K : never;
}[keyof Results];

/** `true` exactly when no operation resolves to `unknown` or `any`. */
export const everyResultIsTyped: [UntypedResults] extends [never] ? true : never = true;

describe("the type-level assertion", () => {
  it("is present, and is checked by tsc rather than by this assertion", () => {
    expect(everyResultIsTyped).toBe(true);
  });
});
