// The error contract (api.md §4): one problem document, and `code` is the only thing to branch on.

import { describe, expect, it, vi } from "vitest";

import {
  ApiProblemError,
  ApiTransportError,
  createApiClient,
  hasErrorCode,
  isAbortError,
  isApiProblem,
  isProblemDocument,
  type ApiProblem,
} from "../src/index.js";

const BASE = "https://api.test";

function problemResponse(problem: Partial<ApiProblem>, status = 404): Response {
  return new Response(JSON.stringify(problem), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

function clientAnswering(response: Response | (() => never)) {
  const doFetch = vi.fn(async () => {
    if (typeof response === "function") response();
    return response as Response;
  });
  return createApiClient({ baseUrl: BASE, fetch: doFetch });
}

describe("a problem document", () => {
  it("throws ApiProblemError carrying the code, status and detail", async () => {
    const api = clientAnswering(
      problemResponse({
        code: "content_not_found",
        title: "Not found",
        status: 404,
        detail: "no artifact named that",
        errors: [],
      }),
    );

    const error = await api.hubGetArtifact({ path: { name: "a", version: "1" } }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiProblemError);
    expect(error.code).toBe("content_not_found");
    expect(error.status).toBe(404);
    expect(error.problem.detail).toBe("no artifact named that");
  });

  it("exposes field-level failures as an array a form can iterate unconditionally", async () => {
    const api = clientAnswering(
      problemResponse(
        {
          code: "validation_failed",
          title: "Validation failed",
          status: 422,
          detail: "the request did not validate — body.name: Field required",
          errors: [{ field: "body.name", message: "Field required", type: "missing" }],
        },
        422,
      ),
    );

    const error = await api.hubResolve({ body: {} as never }).catch((e) => e);

    expect(isApiProblem(error)).toBe(true);
    expect(error.errors).toEqual([
      { field: "body.name", message: "Field required", type: "missing" },
    ]);
  });

  it("gives an empty array when the API sent no errors member at all", async () => {
    const api = clientAnswering(
      problemResponse({
        code: "capability_unavailable",
        title: "Capability unavailable",
        status: 503,
        detail: "no registry configured",
      }),
    );
    const error = await api.hubGetArtifact({ path: { name: "a", version: "1" } }).catch((e) => e);
    expect(error.errors).toEqual([]);
  });

  it("distinguishes two failures that share a status, which is the point of the code", async () => {
    // Three different things answer 503 and four answer 404. Before the contract, the front end
    // was reduced to reading messages to tell them apart.
    const unconfigured = clientAnswering(
      problemResponse({ code: "publish_unconfigured", title: "…", status: 503, detail: "…" }, 503),
    );
    const unavailable = clientAnswering(
      problemResponse(
        { code: "capability_unavailable", title: "…", status: 503, detail: "…" },
        503,
      ),
    );

    const first = await unconfigured.hubPublish({ body: {} as never }).catch((e) => e);
    const second = await unavailable.hubPublish({ body: {} as never }).catch((e) => e);

    expect(first.status).toBe(second.status);
    expect(hasErrorCode(first, "publish_unconfigured")).toBe(true);
    expect(hasErrorCode(second, "publish_unconfigured")).toBe(false);
    expect(hasErrorCode(second, "capability_unavailable")).toBe(true);
  });
});

describe("a response that is not the contract", () => {
  it("becomes a transport error when the body is not JSON", async () => {
    // A proxy in front of the API answering an HTML error page is the common case.
    const api = clientAnswering(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );
    const error = await api.hubHealthz().catch((e) => e);
    expect(error).toBeInstanceOf(ApiTransportError);
    expect(error.status).toBe(502);
    expect(error.reason).toMatch(/not JSON/);
  });

  it("becomes a transport error when the JSON is not a problem document", async () => {
    const api = clientAnswering(
      new Response(JSON.stringify({ message: "nope" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    const error = await api.hubHealthz().catch((e) => e);
    expect(error).toBeInstanceOf(ApiTransportError);
    expect(error.reason).toMatch(/not a problem document/);
  });

  it("never invents an ErrorCode for a failure the API did not name", async () => {
    // `code` is the API's append-only vocabulary. A client-side member would be a name no server
    // will ever send, which is the second vocabulary the one-contract rule exists to prevent.
    const api = clientAnswering(
      new Response("nope", { status: 503, headers: { "content-type": "text/plain" } }),
    );
    const error = await api.hubHealthz().catch((e) => e);
    expect(isApiProblem(error)).toBe(false);
    expect(error).not.toHaveProperty("code");
  });
});

describe("no response at all", () => {
  it("reports a reachability failure that names both causes it cannot tell apart", async () => {
    // The browser withholds the detail on a cross-origin refusal on purpose, so a client that
    // claimed "the API is down" would be guessing.
    const api = clientAnswering(() => {
      throw new TypeError("Failed to fetch");
    });
    const error = await api.hubHealthz().catch((e) => e);
    expect(error).toBeInstanceOf(ApiTransportError);
    expect(error.reason).toMatch(/could not be reached/);
    expect(error.reason).toMatch(/refusing this origin/);
    expect(error.status).toBeUndefined();
  });
});

describe("the guards", () => {
  it("isProblemDocument accepts a code it has never heard of", async () => {
    // The API's codes are append-only; one added after this build must still reach a page.
    expect(
      isProblemDocument({ code: "a_code_from_the_future", title: "…", status: 418, detail: "…" }),
    ).toBe(true);
  });

  it("isProblemDocument rejects anything missing a required member", () => {
    expect(isProblemDocument(null)).toBe(false);
    expect(isProblemDocument("nope")).toBe(false);
    expect(isProblemDocument({ code: "conflict" })).toBe(false);
    expect(isProblemDocument({ code: "conflict", title: "…", status: "409", detail: "…" })).toBe(
      false,
    );
  });

  it("isAbortError recognises only a real abort", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new DOMException("boom", "NotFoundError"))).toBe(false);
    expect(isAbortError(new Error("aborted"))).toBe(false);
  });

  it("names the error classes, so a caught error reads as itself", () => {
    const problem = new ApiProblemError({
      code: "conflict",
      title: "Conflict",
      status: 409,
      detail: "…",
      errors: [],
    });
    expect(problem.name).toBe("ApiProblemError");
    expect(new ApiTransportError("…").name).toBe("ApiTransportError");
  });
});
