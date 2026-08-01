// The fetch core (ui#2; ui.md §9; conventions.md §2.1).
//
// One function builds every request the application makes. It is deliberately small — no cache, no
// retry, no polling, no interceptor stack. `conventions.md` §2.1 ships no data-fetching library on
// purpose: these screens are read-mostly and human-paced, and the loading / error / empty
// discipline belongs in the design system's `AsyncState`, not in a client. When a page has a
// concrete need for optimistic writes or cross-page invalidation, that is a documented change to
// the baseline rather than an import.
//
// Nothing here knows any route: it is driven entirely by the generated `OperationSpec` table.

import {
  ApiProblemError,
  ApiTransportError,
  isProblemDocument,
  type ApiProblem,
} from "./errors.js";
import type { OperationSpec } from "./generated/manifest.gen.js";

/** Per-call options. Every operation accepts these; none of them is route-specific. */
export interface CallOptions {
  /**
   * Cancels the request. A page that navigates away passes the signal it aborts on unmount, and
   * the rejection that follows is an `AbortError` the caller is expected to ignore
   * (`isAbortError`).
   */
  signal?: AbortSignal;
}

/** The arguments an operation can carry, as the generated methods pass them along. */
export interface RequestArgs {
  path?: Record<string, string | number | boolean>;
  query?: Record<string, unknown>;
  header?: Record<string, unknown>;
  body?: unknown;
}

/** What the generated methods call. One per client. */
export type RequestFn = <T>(
  spec: OperationSpec,
  args?: RequestArgs,
  options?: CallOptions,
) => Promise<T>;

/** How a client reaches the API. */
export interface ApiClientConfig {
  /** The API's origin, e.g. `https://api.example.org`. A trailing slash is tolerated. */
  baseUrl: string;
  /** Injected in tests and in any host where the global is not the one to use. */
  fetch?: typeof globalThis.fetch;
}

/** What each decoder asks the server for, and what it will accept back. */
const ACCEPT = {
  json: "application/json",
  text: "text/plain",
  blob: "application/octet-stream",
} as const;

/** `/hub/artifacts/{name}/{version}` + `{name: "a/b"}` → `/hub/artifacts/a%2Fb/…`. */
function interpolate(template: string, path: RequestArgs["path"]): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = path?.[key];
    if (value === undefined || value === null) {
      throw new ApiTransportError(`the request is missing the path parameter \`${key}\``);
    }
    // Artifact names carry slashes and digests carry colons; both must survive as one segment.
    return encodeURIComponent(String(value));
  });
}

/**
 * Query parameters, in the shape FastAPI reads.
 *
 * `undefined` and `null` are dropped rather than sent as the strings "undefined" and "null" —
 * an optional filter left unset must be absent, not present and wrong. An array repeats its key,
 * which is what FastAPI's `list[str]` binding expects.
 */
function search(query: RequestArgs["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null) continue;
      params.append(key, String(item));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/** Header parameters the document declares, minus the ones left unset. */
function headers(spec: OperationSpec, args?: RequestArgs): Headers {
  const result = new Headers({
    accept: `${ACCEPT[spec.decode]}, application/problem+json`,
  });
  for (const [key, value] of Object.entries(args?.header ?? {})) {
    if (value === undefined || value === null) continue;
    result.set(key, String(value));
  }
  if (args?.body !== undefined) result.set("content-type", "application/json");
  return result;
}

/**
 * Read the failure off a response.
 *
 * Anything that is not a problem document becomes an `ApiTransportError` naming the status — an
 * HTML error page from a proxy in front of the API is a real and common failure, and pretending it
 * carried a `code` would be the client inventing one.
 */
async function toError(response: Response): Promise<ApiProblemError | ApiTransportError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    return new ApiTransportError(
      `the API answered ${response.status} with a body that is not JSON`,
      { status: response.status, cause },
    );
  }
  if (!isProblemDocument(body)) {
    return new ApiTransportError(
      `the API answered ${response.status} with a body that is not a problem document`,
      { status: response.status },
    );
  }
  return new ApiProblemError(body as ApiProblem);
}

/** Read the success body the way the document says it is encoded. */
async function decode<T>(response: Response, spec: OperationSpec): Promise<T> {
  if (spec.decode === "text") return (await response.text()) as T;
  if (spec.decode === "blob") return (await response.blob()) as T;
  // 204 and a genuinely empty 200 both arrive as no bytes; `.json()` would throw on them.
  const text = await response.text();
  if (text === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new ApiTransportError("the API answered with a success body that is not JSON", {
      status: response.status,
      cause,
    });
  }
}

/**
 * Build the one request function a client uses.
 *
 * **Reads carry no credentials, and neither does anything else**: `credentials: "omit"` on every
 * call. This is not defence in depth for its own sake — the API's CORS policy can never allow
 * credentials (`astro_mine_api._cors`), so a cookie attached here would not arrive; it would only
 * turn a working request into a preflight failure that reads like an outage.
 */
export function createRequest(config: ApiClientConfig): RequestFn {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  // An injected `fetch` is captured; the ambient one is resolved per call, deliberately. Binding
  // `globalThis.fetch` here would freeze whichever implementation existed when the client was
  // built — and a client is normally built at module scope, before a test's interceptor or a
  // polyfill has installed itself. The symptom is every request failing as unreachable while the
  // fake sits there unused, which reads like a network problem and is not one.
  const doFetch: typeof globalThis.fetch =
    config.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return async function request<T>(
    spec: OperationSpec,
    args?: RequestArgs,
    options?: CallOptions,
  ): Promise<T> {
    const url = `${baseUrl}${interpolate(spec.path, args?.path)}${search(args?.query)}`;

    let response: Response;
    try {
      response = await doFetch(url, {
        method: spec.method,
        headers: headers(spec, args),
        body: args?.body === undefined ? undefined : JSON.stringify(args.body),
        credentials: "omit",
        signal: options?.signal,
      });
    } catch (cause) {
      // An abort is the caller's own doing; it propagates untouched so `isAbortError` can see it.
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      // A cross-origin refusal is indistinguishable from an outage here — the browser withholds
      // the detail on purpose — so the message names both rather than guessing one.
      throw new ApiTransportError(
        `the API at ${baseUrl} could not be reached — it may be down, unreachable from this ` +
          `origin, or refusing this origin's requests`,
        { cause },
      );
    }

    if (!response.ok) throw await toError(response);
    return decode<T>(response, spec);
  };
}
