#!/usr/bin/env node
// The gate on the property that decays (ui#2).
//
// The old front end shipped three hand-written API clients and three hand-copied `types.ts`
// mirrors of shapes the server already published. Nobody decided to do that; it happened one
// convenient copy at a time, and each copy was correct on the day it was made. A generated client
// removes the mirrors that exist — this removes the ones that would come back.
//
// Two conditions, both mechanical, both derived from the document rather than from a wordlist:
//
//   1. NO `fetch(` OUTSIDE THE CLIENT. A page that reaches past the generated methods is a page
//      hand-writing a request, and it is invisible to the drift gate because it is not generated
//      output at all.
//
//   2. NO SHAPE RESTATED OUTSIDE `generated/` UNDER A COMPONENT SCHEMA'S NAME. `interface
//      ArtifactDetail` in a page is the mirror, exactly as it was before, and its name is how it
//      is recognisable: a copy is worth making precisely because it wears the server's name.
//      Deriving that name from the document — `type ErrorCode = components["schemas"]["ErrorCode"]`
//      — is the opposite and is allowed; there is nothing in it to drift.
//
// Neither condition is airtight — a determined rename defeats the second, and neither can see a
// shape inlined into a prop type. They are not meant to be airtight. They are meant to catch the
// thing that actually happened, on the day it starts happening again, which no review does
// reliably a year in.
//
// Exported as `checkNoHandwrittenApiTypes(root)` so the failure modes can be proven against
// fixture trees (`check-no-handwritten-api-types.test.mjs`). A gate nothing can prove *fails* is
// not a gate.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Where the client's generated output lives — the one place API shapes may be declared. */
/**
 * The trees whose contents are written by a generator and guarded against their upstream.
 *
 * The rule this gate enforces is *"no shape restated by hand under a schema's name"* — and the test
 * for "by hand" is not the file's name, it is whether a generator wrote it and something fails when
 * its source moves. Both of these qualify, and each is listed with the pair that makes it qualify:
 *
 *   packages/api-client/src/generated  ← `codegen-api-client.mjs`, guarded by `check-api-drift.mjs`
 *   packages/view/src/frames/generated ← `codegen-units.mjs`,      guarded by `check-core-schema.mjs`
 *
 * The second arrived with `ui#6` and is the reason this stopped being one constant. View generates
 * `PlanetaryCRS` from **Core's** units schema, which is also the name of an API component schema —
 * the API publishes that shape because Core defines it, so the two are the same shape reached by two
 * routes, not a copy of one made from the other. And the remedy this gate normally offers is
 * unavailable here by design: `packages/view` may not import `@astro-mine/api-client`, because a
 * package may not import a sibling (ui.md §3). Exempting the tree is the honest answer; exempting
 * the *name* would have hidden a real hand-copy the day someone made one.
 */
const GENERATED_TREES = ["packages/api-client/src/generated", "packages/view/src/frames/generated"];

/**
 * The client owns the transport. Nothing else may open a request.
 *
 * The whole package, not just its `src/`: its tests drive `fetch` against the fake on purpose,
 * which is the one place in the workspace where hand-opening a request is the thing being tested.
 */
const TRANSPORT_OWNER = "packages/api-client";

/** Where the vendored document is, relative to the tree being checked. */
const DOCUMENT = "packages/api-client/openapi/openapi.json";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "dist",
  "out",
  "coverage",
  ".git",
  ".turbo",
]);

/** `type Foo =`, `interface Foo {`, `export type Foo<T> =` — the declaration forms that name a shape. */
const DECLARATION = /(?:^|\n)\s*(?:export\s+)?(?:declare\s+)?(type|interface)\s+([A-Za-z0-9_$]+)/g;

/**
 * A right-hand side that reaches into the generated types instead of restating them.
 *
 * `export type ErrorCode = components["schemas"]["ErrorCode"]` is the opposite of the mirror this
 * gate is looking for: it gives the document's own type a short name, and it cannot drift, because
 * there is nothing in it to drift. Naming a shape is fine. Restating one is not — which is also
 * why an `interface` is always a violation: an interface has members, and members are the copy.
 */
const DERIVED_FROM_DOCUMENT = /\b(?:components|operations|paths)\s*\[/;

/** `fetch(`, `globalThis.fetch(`, `window.fetch(` — but not `config.fetch` being passed along. */
const FETCH_CALL = /(?<![.\w])(?:globalThis\.|window\.|self\.)?fetch\s*\(/;

function listSourceFiles(directory, root, found = []) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      listSourceFiles(path, root, found);
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      found.push(relative(root, path));
    }
  }
  return found;
}

/** Is *file* inside *directory*, in a way that survives Windows path separators? */
function isInside(file, directory) {
  const normalized = file.split("\\").join("/");
  return normalized === directory || normalized.startsWith(`${directory}/`);
}

/**
 * Check *root* for hand-written API surface.
 *
 * Returns `{ violations, checked, schemas }`. A violation is `{ file, line, message }`.
 */
export function checkNoHandwrittenApiTypes(root) {
  const violations = [];

  let schemaNames = new Set();
  try {
    const document = JSON.parse(readFileSync(join(root, DOCUMENT), "utf8"));
    schemaNames = new Set(Object.keys(document.components?.schemas ?? {}));
  } catch {
    // No document, nothing to compare names against. The drift gate is what notices that the
    // document is missing; reporting it twice would send a reader to the wrong script.
  }

  const files = [];
  for (const slot of ["apps", "packages", "e2e", "scripts"]) {
    const directory = join(root, slot);
    try {
      statSync(directory);
    } catch {
      continue;
    }
    files.push(...listSourceFiles(directory, root));
  }

  for (const file of files.sort()) {
    const source = readFileSync(join(root, file), "utf8");
    const lines = source.split("\n");

    if (!isInside(file, TRANSPORT_OWNER)) {
      lines.forEach((line, index) => {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
        if (FETCH_CALL.test(line)) {
          violations.push({
            file,
            line: index + 1,
            message:
              `opens a request directly. Every call goes through the generated client — ` +
              `\`createApiClient(...)\` — so that the drift gate can see it.`,
          });
        }
      });
    }

    const isGenerated = GENERATED_TREES.some((tree) => isInside(file, tree));
    if (!isGenerated && schemaNames.size > 0) {
      for (const match of source.matchAll(DECLARATION)) {
        const [matched, kind, name] = match;
        if (!schemaNames.has(name)) continue;

        // For a type alias, read to the end of the statement and let a derivation through. The
        // 400-character window is generous for an alias and stops a missing semicolon from
        // swallowing the rest of the file.
        if (kind === "type") {
          const start = match.index + matched.length;
          const rest = source.slice(start, start + 400);
          const body = rest.slice(0, rest.indexOf(";") === -1 ? undefined : rest.indexOf(";"));
          if (DERIVED_FROM_DOCUMENT.test(body)) continue;
        }

        // The name sits at the end of the matched text; the match itself begins at the newline
        // before the declaration, so counting to the start would report the line above it.
        const line = source.slice(0, match.index + matched.length).split("\n").length;
        violations.push({
          file,
          line,
          message:
            `declares \`${name}\`, which is the name of an API component schema. That is a ` +
            `hand-copied mirror of a shape the server already publishes — derive it instead ` +
            `(\`components["schemas"]["${name}"]\`, from \`@astro-mine/api-client\`).`,
        });
      }
    }
  }

  return { violations, checked: files.length, schemas: schemaNames.size };
}

// Run as a script (not when imported by its tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { violations, checked, schemas } = checkNoHandwrittenApiTypes(root);

  if (violations.length === 0) {
    console.log(
      `✓ no hand-written API request or response types ` +
        `(${checked} source files checked against ${schemas} component schemas)`,
    );
  } else {
    for (const { file, line, message } of violations) {
      console.error(`[31m✗[0m ${file}:${line} — ${message}`);
    }
    console.error(
      `\n${violations.length} violation${violations.length === 1 ? "" : "s"}. ` +
        `The API's shapes are published; this workspace consumes them and does not restate them.`,
    );
    process.exitCode = 1;
  }
}
