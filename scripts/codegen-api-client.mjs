#!/usr/bin/env node
// The client generator (ui#2; ui.md §9, §10.6; conventions.md §2.1).
//
//   pnpm codegen:api                 regenerate from the vendored document
//   pnpm codegen:api --from <path>   refresh the vendored document first, then regenerate
//   pnpm codegen:api --from <url>    the same, from a running API's /openapi.json
//
// **The OpenAPI document is the contract.** Everything under `packages/api-client/src/generated/`
// is written by this script and by nothing else: four files, committed, so a clean clone builds
// with no API running and no Python in sight (CX-LOCAL). The document itself is vendored at
// `packages/api-client/openapi/openapi.json` — a byte-identical copy of astro-mine-api's own
// committed snapshot, which that repository's CI proves equal to its live document.
//
// That vendoring is what makes this reproducible, and it is also what could rot, so
// `check-api-drift.mjs` asserts both halves: the vendored document still equals astro-mine-api at
// HEAD, and the committed output still equals what this script produces from it. Hand-editing the
// output is therefore not a style violation; it is a red build.
//
// Why an emitter here rather than an off-the-shelf SDK generator: the issue asks for "types plus a
// thin typed request layer over fetch. No class hierarchy, no cache, no interceptor stack", and the
// generators that name methods after operation ids all ship a client runtime with the interceptor
// stack attached. `openapi-typescript` does the part nobody should hand-write — schemas to
// TypeScript — and the ~200 lines below bind those types to the fetch core in `src/request.ts`.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import openapiTS, { astToString } from "openapi-typescript";
import prettier from "prettier";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(repoRoot, "packages/api-client");
const DOCUMENT = resolve(packageRoot, "openapi/openapi.json");
const GENERATED = resolve(packageRoot, "src/generated");

/** The HTTP methods an OpenAPI path item can carry that are operations rather than metadata. */
const VERBS = ["get", "put", "post", "delete", "patch"];

/** How a success body is read off the wire, keyed by the media type the document declares. */
const DECODERS = {
  "application/json": { decode: "json", type: null },
  // Prometheus exposition — text, and the document already says `type: string`.
  "text/plain": { decode: "text", type: "string" },
  // MCAP bytes. The document says `type: string, format: binary`, which is what OpenAPI has to
  // say and is not what `fetch` produces; the honest browser type is a Blob, so the generated
  // signature says Blob and `request.ts` calls `.blob()`. A generated lie here would be found by
  // the first page that tried to hand the result to the replay reader.
  "application/octet-stream": { decode: "blob", type: "Blob" },
};

/** `bench_audit_trail` → `benchAuditTrail`. The operation id is the method name (api#3). */
function camel(operationId) {
  return operationId.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** `benchAuditTrail` → `BenchAuditTrail`, for the per-operation type names. */
function pascal(name) {
  return name[0].toUpperCase() + name.slice(1);
}

/** Every operation in the document, in a stable order, with what the emitter needs about it. */
function readOperations(document) {
  const operations = [];
  for (const [path, item] of Object.entries(document.paths)) {
    for (const verb of VERBS) {
      const operation = item[verb];
      if (!operation) continue;

      const { operationId } = operation;
      if (!operationId) throw new Error(`${verb.toUpperCase()} ${path} has no operationId`);

      const status = Object.keys(operation.responses).find((code) => code.startsWith("2"));
      if (!status) throw new Error(`${operationId} declares no 2xx response`);

      const content = operation.responses[status].content ?? {};
      const [mediaType] = Object.keys(content);
      const decoder = DECODERS[mediaType];
      if (!decoder)
        throw new Error(`${operationId} answers an unsupported media type: ${mediaType}`);

      const parameters = operation.parameters ?? [];
      operations.push({
        operationId,
        name: camel(operationId),
        method: verb,
        path,
        status: Number(status),
        decode: decoder.decode,
        resultType: decoder.type,
        hasPath: parameters.some((p) => p.in === "path"),
        hasQuery: parameters.some((p) => p.in === "query"),
        hasHeader: parameters.some((p) => p.in === "header"),
        hasBody: Boolean(operation.requestBody),
        bodyRequired: Boolean(operation.requestBody?.required),
        summary: operation.summary,
      });
    }
  }
  return operations.sort((a, b) => a.name.localeCompare(b.name));
}

/** The doc comment above a generated member: what it is, and where it is. */
function docComment(operation) {
  const where = `\`${operation.method.toUpperCase()} ${operation.path}\``;
  const summary = operation.summary ? `${operation.summary} — ${where}` : where;
  return `/** ${summary} */`;
}

const BANNER = (what) => `// GENERATED — DO NOT EDIT. ${what}
//
// Written by \`scripts/codegen-api-client.mjs\` from \`packages/api-client/openapi/openapi.json\`.
// Regenerate with \`pnpm codegen:api\`; a hand edit is caught by \`pnpm check:api-drift\`.
`;

// ---------------------------------------------------------------------------------------------
// schema.gen.ts — every request, response and component type in the document.
// ---------------------------------------------------------------------------------------------

async function emitSchema() {
  const ast = await openapiTS(new URL(`file://${DOCUMENT}`), {
    // `unknown` is the honest type for an undeclared body, and the acceptance criterion is that no
    // route resolves to one — asserted over the emitted file rather than trusted here.
    emptyObjectsUnknown: true,
    alphabetize: true,
  });
  return `${BANNER("The OpenAPI document as TypeScript.")}\n${astToString(ast)}`;
}

// ---------------------------------------------------------------------------------------------
// manifest.gen.ts — the operation table. What the mocks and the surface test read.
// ---------------------------------------------------------------------------------------------

function emitManifest(operations) {
  const names = operations.map((o) => `  | "${o.name}"`).join("\n");
  const entries = operations
    .map(
      (o) => `  ${o.name}: {
    operationId: "${o.operationId}",
    name: "${o.name}",
    method: "${o.method.toUpperCase()}",
    path: "${o.path}",
    status: ${o.status},
    decode: "${o.decode}",
  },`,
    )
    .join("\n");

  return `${BANNER("The operation table.")}
/** Every operation the API serves, by its generated method name. */
export type OperationName =
${names};

/** How one operation is addressed and how its success body is read. */
export interface OperationSpec {
  /** The document's operation id — the name on the wire, and the one api#3 stabilised. */
  readonly operationId: string;
  /** The generated method name: the operation id in camelCase. */
  readonly name: OperationName;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** The path template, with \`{name}\` placeholders. */
  readonly path: string;
  /** The success status this operation answers with. */
  readonly status: number;
  /** Which \`Response\` reader produces the success body. */
  readonly decode: "json" | "text" | "blob";
}

/**
 * The whole surface, as data.
 *
 * A table rather than 40 hand-maintained constants: the mock factories bind to it, and the
 * generated-surface test asserts it covers the document exactly — no operation missing, none
 * invented.
 */
export const OPERATIONS: Record<OperationName, OperationSpec> = {
${entries}
};
`;
}

// ---------------------------------------------------------------------------------------------
// operations.gen.ts — one method per operation id, and a named type for each argument and result.
// ---------------------------------------------------------------------------------------------

function argsMembers(operation) {
  const op = `operations["${operation.operationId}"]`;
  const members = [];
  if (operation.hasPath) {
    members.push(`  /** Path parameters. */
  path: NonNullable<${op}["parameters"]["path"]>;`);
  }
  if (operation.hasQuery) {
    members.push(`  /** Query parameters. */
  query?: ${op}["parameters"]["query"];`);
  }
  if (operation.hasHeader) {
    members.push(`  /** Header parameters declared by the document. */
  header?: ${op}["parameters"]["header"];`);
  }
  if (operation.hasBody) {
    members.push(`  /** The request body. */
  body${operation.bodyRequired ? "" : "?"}: NonNullable<${op}["requestBody"]>["content"]["application/json"];`);
  }
  return members;
}

function emitOperations(operations) {
  const types = [];
  const signatures = [];
  const bindings = [];

  for (const operation of operations) {
    const Name = pascal(operation.name);
    const op = `operations["${operation.operationId}"]`;
    const members = argsMembers(operation);

    const resultType =
      operation.resultType ??
      `${op}["responses"][${operation.status}]["content"]["application/json"]`;
    types.push(`${docComment(operation)}
export type ${Name}Result = ${resultType};`);

    // Args are optional as a whole when nothing in them is: a caller of \`healthz\` writes
    // \`api.healthz()\`, not \`api.healthz({})\`.
    const required = members.some((m) => !m.includes("?:"));
    let argument = "";
    if (members.length > 0) {
      types.push(`/** Arguments for \`${operation.name}\`. */
export interface ${Name}Args {
${members.join("\n")}
}`);
      argument = `args${required ? "" : "?"}: ${Name}Args, `;
    }

    signatures.push(`  ${docComment(operation)}
  ${operation.name}(${argument}options?: CallOptions): Promise<${Name}Result>;`);

    bindings.push(
      members.length > 0
        ? `    ${operation.name}: (args, options) =>
      request<${Name}Result>(OPERATIONS.${operation.name}, args, options),`
        : `    ${operation.name}: (options) =>
      request<${Name}Result>(OPERATIONS.${operation.name}, undefined, options),`,
    );
  }

  return `${BANNER("The API surface: one method per operation id.")}
import type { CallOptions, RequestFn } from "../request.js";
import { OPERATIONS } from "./manifest.gen.js";
import type { operations } from "./schema.gen.js";

${types.join("\n\n")}

/**
 * Every operation the API serves, named by its operation id (api#3).
 *
 * A method resolves with the success body and **throws** on anything else: \`ApiProblemError\` when
 * the API answered a problem document, \`ApiTransportError\` when no usable response arrived. That
 * is what the design system's \`AsyncState\` discipline expects — a returned union would put a
 * branch at every call site, and the point of the problem contract is that a page branches on
 * \`code\` only where it has something different to say.
 */
export interface ApiOperations {
${signatures.join("\n\n")}
}

/** Bind every operation to *request*. The one place the table becomes callable methods. */
export function createOperations(request: RequestFn): ApiOperations {
  return {
${bindings.join("\n")}
  };
}
`;
}

// ---------------------------------------------------------------------------------------------
// msw.gen.ts — a typed mock per operation, so a test's fake cannot drift from the document either.
// ---------------------------------------------------------------------------------------------

function emitMsw(operations) {
  const imports = operations.map((o) => `  ${pascal(o.name)}Result`).join(",\n");
  const signatures = operations
    .map(
      (o) => `  ${docComment(o)}
  ${o.name}(reply: ReplyOrResolver<${pascal(o.name)}Result>): HttpHandler;`,
    )
    .join("\n\n");
  const bindings = operations
    .map((o) => `    ${o.name}: mockOperation(baseUrl, OPERATIONS.${o.name}),`)
    .join("\n");

  return `${BANNER("Typed MSW handlers.")}
import type { HttpHandler } from "msw";

import { mockOperation, notStubbed, type ReplyOrResolver } from "../msw-runtime.js";
import { OPERATIONS, type OperationName } from "./manifest.gen.js";
import type {
${imports},
} from "./operations.gen.js";

/**
 * One typed handler factory per operation.
 *
 * The reply is checked against the *document's* response type, so a test whose fixture stops
 * matching the API fails to compile rather than passing against a shape the server never sends.
 * That is the whole reason these are generated rather than written.
 */
export interface MockApi {
${signatures}
}

/** Mock handlers for an API served at *baseUrl*. */
export function createMockApi(baseUrl: string): MockApi {
  return {
${bindings}
  };
}

/**
 * A catch-all per operation, answering \`capability_unavailable\` with a message naming the
 * operation. Register these **last**: MSW takes the first matching handler, so anything a test
 * stubbed explicitly still wins, and anything it forgot fails by name instead of escaping to the
 * network.
 */
export function notStubbedHandlers(baseUrl: string): HttpHandler[] {
  return (Object.keys(OPERATIONS) as OperationName[]).map((name) =>
    notStubbed(baseUrl, OPERATIONS[name]),
  );
}
`;
}

// ---------------------------------------------------------------------------------------------

async function write(file, source) {
  const config = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(source, { ...config, filepath: file });
  writeFileSync(file, formatted, "utf8");
  return file;
}

async function refresh(from) {
  const bytes = /^https?:\/\//.test(from)
    ? Buffer.from(await (await fetch(from)).arrayBuffer())
    : readFileSync(resolve(process.cwd(), from));
  // Byte-identical, deliberately: the document is vendored, not reformatted. `check-api-drift.mjs`
  // compares it to astro-mine-api's snapshot as bytes, and a prettier pass here would turn that
  // comparison into an argument about JSON style.
  writeFileSync(DOCUMENT, bytes);
  console.log(`refreshed ${DOCUMENT} from ${from}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const fromIndex = argv.indexOf("--from");
  if (fromIndex !== -1) {
    const from = argv[fromIndex + 1];
    if (!from) throw new Error("--from needs a path or a URL");
    await refresh(from);
  }

  const document = JSON.parse(readFileSync(DOCUMENT, "utf8"));
  const operations = readOperations(document);

  const written = [
    await write(resolve(GENERATED, "schema.gen.ts"), await emitSchema()),
    await write(resolve(GENERATED, "manifest.gen.ts"), emitManifest(operations)),
    await write(resolve(GENERATED, "operations.gen.ts"), emitOperations(operations)),
    await write(resolve(GENERATED, "msw.gen.ts"), emitMsw(operations)),
  ];

  for (const file of written) console.log(`wrote ${file.replace(`${repoRoot}/`, "")}`);
  console.log(
    `${operations.length} operations · ${Object.keys(document.components.schemas).length} schemas ` +
      `· OpenAPI ${document.openapi}`,
  );
}

await main();
