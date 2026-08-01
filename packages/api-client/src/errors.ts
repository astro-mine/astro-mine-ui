// What a failed call throws (api.md §4; ui#2).
//
// The API answers **one** problem document from every surface (RFC 9457,
// `application/problem+json`) carrying a stable machine-readable `code`. `code` is the only member
// a client may branch on; `detail` is prose for a person and nothing parses it. That contract is
// the reason this file is short.
//
// Two failure classes, because a page can do something different about each:
//
//   ApiProblemError    the API answered, and said what went wrong. Branch on `.problem.code`.
//   ApiTransportError  no usable answer arrived — offline, DNS, a CORS preflight refusal, or a
//                      response that violated the contract. There is nothing to branch on, and a
//                      page should say so rather than guess.
//
// **A transport failure is never given an `ErrorCode`.** The enumeration is the API's, it is
// append-only public API, and minting a client-side member would put a name in it that no server
// will ever send — which is exactly the kind of second vocabulary the one-contract rule exists to
// prevent.

import type { components } from "./generated/schema.gen.js";

/** The problem document, straight from the document — not a mirror of it. */
export type ApiProblem = components["schemas"]["Problem"];

/** Every failure the API can name. Branch on this, never on `detail`. */
export type ErrorCode = components["schemas"]["ErrorCode"];

/** One field-level failure inside a validation problem. */
export type FieldProblem = components["schemas"]["FieldProblem"];

/** The base every failure from this client shares, so one `catch` can recognise them all. */
export abstract class ApiError extends Error {
  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    // `new.target` rather than a literal, so each subclass reports its own name without repeating
    // it — a caught error that says `Error` tells a reader nothing.
    this.name = new.target.name;
  }
}

/** The API answered a problem document. */
export class ApiProblemError extends ApiError {
  /** The document as sent. */
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(`${problem.code}: ${problem.detail}`);
    this.problem = problem;
  }

  /** The machine-readable cause. The one thing worth switching on. */
  get code(): ErrorCode {
    return this.problem.code;
  }

  /** The HTTP status, as the API reported it in the body. */
  get status(): number {
    return this.problem.status;
  }

  /** Field-level failures. Always an array, so a form can iterate unconditionally. */
  get errors(): FieldProblem[] {
    return this.problem.errors ?? [];
  }
}

/** No usable response arrived, or the one that did was not the contract. */
export class ApiTransportError extends ApiError {
  /** What went wrong, in words. There is no code, because no server named one. */
  readonly reason: string;
  /** The status, when a response arrived at all and merely failed to be a problem document. */
  readonly status?: number;

  constructor(reason: string, options?: { status?: number; cause?: unknown }) {
    super(reason, options);
    this.reason = reason;
    this.status = options?.status;
  }
}

/** Did this call fail with a problem document? Narrows, so `.problem.code` is reachable after it. */
export function isApiProblem(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError;
}

/** Did this call fail with the given code? The common shape of a page's one special case. */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isApiProblem(error) && error.problem.code === code;
}

/**
 * Was this call aborted by its own caller?
 *
 * Aborts are deliberately **not** wrapped: a page that navigates away cancels its requests, and
 * the resulting rejection is the caller's own doing rather than a failure to report. `AsyncState`
 * uses this to drop the result silently instead of rendering an error nobody caused.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Is *value* shaped like a problem document?
 *
 * Structural, not exhaustive: it establishes that the four required members are present and of the
 * right primitive kind, which is what separates "the API refused, and said why" from "something
 * upstream answered with an HTML error page". Validating `code` against the enumeration would be
 * worse, not better — a code added to the API after this build must still reach a page.
 */
export function isProblemDocument(value: unknown): value is ApiProblem {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.detail === "string"
  );
}
