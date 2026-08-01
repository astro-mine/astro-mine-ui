// The fake and the client agree — which is the only thing that makes a component test meaningful.
//
// These drive the *real* client against the *generated* handlers over MSW's interceptor, so a
// mismatch in path, method, media type or shape fails here rather than in the page that trusted it.

import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApiClient, isApiProblem } from "../src/index.js";
import { createMockApi, notStubbedHandlers, toMswPath } from "../src/testing.js";

const BASE = "https://api.test";
const server = setupServer();
const mock = createMockApi(BASE);
const api = createApiClient({ baseUrl: BASE });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("a stubbed operation", () => {
  it("answers the client with the body the test gave it", async () => {
    server.use(mock.hubHealthz({ body: { status: "ok", component: "hub", version: "0.1.0" } }));
    await expect(api.hubHealthz()).resolves.toEqual({
      status: "ok",
      component: "hub",
      version: "0.1.0",
    });
  });

  it("matches a path with parameters", async () => {
    server.use(mock.benchGetJob({ body: { id: "job-7", state: "succeeded" } as never }));
    await expect(api.benchGetJob({ path: { job_id: "job-7" } })).resolves.toMatchObject({
      id: "job-7",
    });
  });

  it("sees the request, so a test can assert what the client actually sent", async () => {
    let seen: URL | undefined;
    server.use(
      mock.hubSearch(({ request }) => {
        seen = new URL(request.url);
        return { body: { results: [], total: 0 } as never };
      }),
    );

    await api.hubSearch({ query: { text: "ice", limit: 5 } });

    expect(seen?.pathname).toBe("/hub/search");
    expect(seen?.searchParams.get("text")).toBe("ice");
    expect(seen?.searchParams.get("limit")).toBe("5");
  });

  it("answers a problem document the client maps to ApiProblemError", async () => {
    server.use(mock.hubGetArtifact({ problem: { code: "content_not_found" } }));
    const error = await api.hubGetArtifact({ path: { name: "a", version: "1" } }).catch((e) => e);
    expect(isApiProblem(error)).toBe(true);
    expect(error.code).toBe("content_not_found");
    expect(error.status).toBe(404);
  });

  it("sends the problem media type, so a client that checks it is not misled", async () => {
    let contentType: string | null = null;
    server.use(
      mock.hubPublish({ problem: { code: "admission_rejected", detail: "digest mismatch" } }),
      // A second, lower-priority handler is not needed; MSW hands us the response through the
      // client, so the header is read from the error path itself.
    );
    const response = await fetch(`${BASE}/hub/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    contentType = response.headers.get("content-type");
    expect(contentType).toContain("application/problem+json");
    expect(response.status).toBe(422);
  });

  it("serves text and bytes as themselves, not as JSON", async () => {
    server.use(mock.benchPrometheusMetrics({ body: "# HELP up\nup 1\n" }));
    await expect(api.benchPrometheusMetrics()).resolves.toBe("# HELP up\nup 1\n");

    server.use(mock.benchGetReplay({ body: new Uint8Array([1, 2, 3]).buffer as never }));
    const replay = await api.benchGetReplay({ path: { submission_id: "s-1" } });
    expect(replay).toBeInstanceOf(Blob);
    expect(replay.size).toBe(3);
  });
});

describe("an operation the test forgot", () => {
  it("fails by name instead of escaping to the network", async () => {
    server.use(...notStubbedHandlers(BASE));
    const error = await api.studioListCatalog().catch((e) => e);
    expect(isApiProblem(error)).toBe(true);
    expect(error.code).toBe("capability_unavailable");
    expect(error.problem.detail).toMatch(/studioListCatalog/);
    expect(error.problem.detail).toMatch(/not stubbed/);
  });

  it("still yields to a handler the test did register", async () => {
    // MSW takes the first match, so the catch-alls must come last and must not shadow a real stub.
    server.use(
      mock.studioListCatalog({ body: { assets: [] } as never }),
      ...notStubbedHandlers(BASE),
    );
    await expect(api.studioListCatalog()).resolves.toEqual({ assets: [] });
  });
});

describe("path translation", () => {
  it("turns the document's braces into MSW's colons", () => {
    expect(toMswPath("/hub/artifacts/{name}/{version}")).toBe("/hub/artifacts/:name/:version");
    expect(toMswPath("/bench/audit")).toBe("/bench/audit");
  });
});
