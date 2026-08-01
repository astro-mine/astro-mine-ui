// The plumbing behind the generated MSW handlers (ui#2).
//
// Generated code should be the part that cannot be written once — here that is the *binding* of an
// operation to its response type, which is per-operation and must track the document. Everything
// below is the same for all 40, so it is written once and the emitter references it.
//
// Nothing in this module is imported by the client itself. It reaches the application only through
// the `./testing` entry point, which is why `msw` is an optional peer dependency rather than a
// dependency: a page bundle must never carry a request interceptor.

import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from "msw";

import type { ApiProblem, ErrorCode, FieldProblem } from "./errors.js";
import type { OperationSpec } from "./generated/manifest.gen.js";

/** A problem document, with everything a test does not care about filled in. */
export interface ProblemInit {
  code: ErrorCode;
  detail?: string;
  title?: string;
  status?: number;
  errors?: FieldProblem[];
}

/**
 * What an operation answers with.
 *
 * Two arms, always spelled out. A bare body would be shorter to write, but "the happy path" and
 * "the refusal" are the two things a test is choosing between, and a test that reads
 * `{ problem: { code: "content_not_found" } }` says which one it meant.
 */
export type Reply<T> = { body: T; status?: number } | { problem: ProblemInit };

/**
 * A reply, or a function computing one from the request — for asserting what was sent.
 *
 * The resolver's argument is MSW's own info object at its default parameters: the path params and
 * request body stay loose because this signature does not narrow them, and what is pinned is the
 * thing worth pinning — the reply, against the document's response type.
 */
export type ReplyOrResolver<T> =
  Reply<T> | ((info: Parameters<HttpResponseResolver>[0]) => Reply<T> | Promise<Reply<T>>);

/**
 * The status a problem answers with when the test did not say.
 *
 * This mirrors `astro_mine_api._errors._STATUS`, and the document cannot supply it — the codes are
 * enumerated there, but which status each answers with is not. It is safe to mirror precisely
 * because **nothing branches on it**: the client reads `code` and never infers meaning from a
 * status, so a stale entry here can make a mock marginally less lifelike and can do nothing else.
 * Anywhere a test cares, it passes `status` explicitly.
 */
const STATUS_FOR: Partial<Record<ErrorCode, number>> = {
  publish_unconfigured: 503,
  namespace_refused: 403,
  admission_rejected: 422,
  resolution_failed: 404,
  content_not_found: 404,
  capability_unavailable: 503,
  download_denied: 403,
  validation_failed: 422,
  invalid_request: 400,
  not_authenticated: 401,
  not_authorized: 403,
  rate_limited: 429,
  submission_rejected: 422,
  conflict: 409,
  method_not_allowed: 405,
  internal_error: 500,
};

/** `/hub/artifacts/{name}/{version}` → `/hub/artifacts/:name/:version`, which is MSW's spelling. */
export function toMswPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function problemDocument(init: ProblemInit): ApiProblem {
  const status = init.status ?? STATUS_FOR[init.code] ?? 500;
  return {
    code: init.code,
    title: init.title ?? init.code,
    status,
    detail: init.detail ?? `stubbed \`${init.code}\``,
    errors: init.errors ?? [],
  };
}

function toResponse<T>(reply: Reply<T>, spec: OperationSpec): Response {
  if ("problem" in reply) {
    const problem = problemDocument(reply.problem);
    return HttpResponse.json(problem, {
      status: problem.status,
      // The media type is part of the contract, and a fake that answers `application/json` would
      // let a client that sniffs it pass here and fail against the real API.
      headers: { "content-type": "application/problem+json" },
    });
  }
  const status = reply.status ?? spec.status;
  if (spec.decode === "text") return HttpResponse.text(String(reply.body), { status });
  if (spec.decode === "blob") {
    return HttpResponse.arrayBuffer(reply.body as ArrayBuffer, {
      status,
      headers: { "content-type": "application/octet-stream" },
    });
  }
  return HttpResponse.json(reply.body as never, { status });
}

/** Bind one operation to a handler factory. The generated interface supplies `T`. */
export function mockOperation<T>(
  baseUrl: string,
  spec: OperationSpec,
): (reply: ReplyOrResolver<T>) => HttpHandler {
  const url = `${baseUrl.replace(/\/+$/, "")}${toMswPath(spec.path)}`;
  const method = spec.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
  return (reply) =>
    http[method](url, async (info) => {
      const resolved = typeof reply === "function" ? await reply(info) : reply;
      return toResponse(resolved, spec);
    });
}

/**
 * A handler that fails by name.
 *
 * Registered after everything a test stubbed, so a call the test did not anticipate answers
 * `capability_unavailable` saying which operation was missed — rather than escaping to the network,
 * or hanging, or (worst) matching some other stub whose shape happened to fit.
 */
export function notStubbed(baseUrl: string, spec: OperationSpec): HttpHandler {
  return mockOperation<never>(
    baseUrl,
    spec,
  )({
    problem: {
      code: "capability_unavailable",
      detail: `\`${spec.name}\` (${spec.method} ${spec.path}) was called but not stubbed in this test`,
    },
  });
}
