// How a call reaches the API: the URL it builds, what it sends, and what it reads back.

import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "../src/index.js";
import { createRequest } from "../src/request.js";
import { OPERATIONS } from "../src/generated/manifest.gen.js";

const BASE = "https://api.test";

/** A `fetch` that records its call and answers with *response*. */
function stubFetch(response: Response | (() => Response | Promise<Response>)) {
  return vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return typeof response === "function" ? response() : response;
  });
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** The request a stub recorded, as URL + init. */
function callOf(fetchStub: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

describe("the URL", () => {
  it("joins the base URL and the path", async () => {
    const doFetch = stubFetch(json({ status: "ok" }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz();
    expect(callOf(doFetch).url).toBe("https://api.test/hub/healthz");
  });

  it("tolerates a trailing slash on the base URL rather than doubling it", async () => {
    const doFetch = stubFetch(json({ status: "ok" }));
    await createApiClient({ baseUrl: "https://api.test/", fetch: doFetch }).hubHealthz();
    expect(callOf(doFetch).url).toBe("https://api.test/hub/healthz");
  });

  it("substitutes path parameters", async () => {
    const doFetch = stubFetch(json({}));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).benchGetJob({
      path: { job_id: "job-7" },
    });
    expect(callOf(doFetch).url).toBe("https://api.test/bench/jobs/job-7");
  });

  it("encodes a path parameter so a slash or a colon stays inside its segment", async () => {
    // Artifact names carry slashes and versions carry digests. Either would otherwise invent a
    // path segment and hit a route nobody meant.
    const doFetch = stubFetch(json({}));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubGetArtifact({
      path: { name: "astro-mine/shackleton", version: "sha256:abc" },
    });
    expect(callOf(doFetch).url).toBe(
      "https://api.test/hub/artifacts/astro-mine%2Fshackleton/sha256%3Aabc",
    );
  });

  it("fails with a named transport error when a path parameter is missing", async () => {
    const doFetch = stubFetch(json({}));
    const api = createApiClient({ baseUrl: BASE, fetch: doFetch });
    await expect(
      // The type system already refuses this; the guard is for a value that went undefined at
      // runtime, which is where a query-string-driven page actually breaks.
      api.benchGetJob({ path: { job_id: undefined as unknown as string } }),
    ).rejects.toThrow(/missing the path parameter `job_id`/);
    expect(doFetch).not.toHaveBeenCalled();
  });
});

describe("query parameters", () => {
  it("serializes the ones that are set", async () => {
    const doFetch = stubFetch(json({ results: [], total: 0 }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubSearch({
      query: { text: "ice", limit: 10 },
    });
    expect(callOf(doFetch).url).toBe("https://api.test/hub/search?text=ice&limit=10");
  });

  it("drops undefined and null rather than sending them as words", async () => {
    // An unset filter must be absent. `?text=undefined` is a filter that is present and wrong,
    // and `null` is what the document's `string | null` query parameters actually admit.
    const doFetch = stubFetch(json({ results: [], total: 0 }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubSearch({
      query: { text: undefined, kind: null },
    });
    expect(callOf(doFetch).url).toBe("https://api.test/hub/search");
  });

  it("repeats the key for an array, which is what FastAPI reads", async () => {
    const doFetch = stubFetch(json({ assets: [] }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).studioListCatalog({
      query: { requires: ["mobility", "drill"] },
    });
    expect(callOf(doFetch).url).toBe(
      "https://api.test/studio/catalog/assets?requires=mobility&requires=drill",
    );
  });
});

describe("what is sent", () => {
  it("uses the method the document declares", async () => {
    const doFetch = stubFetch(json({}));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubResolve({
      body: { name: "a", version: "1" } as never,
    });
    expect(callOf(doFetch).init.method).toBe("POST");
  });

  it("sends a JSON body with its content type", async () => {
    const doFetch = stubFetch(json({}));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubResolve({
      body: { name: "a", version: "1" } as never,
    });
    const { init, headers } = callOf(doFetch);
    expect(init.body).toBe('{"name":"a","version":"1"}');
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("sends no content type when there is no body", async () => {
    const doFetch = stubFetch(json({ status: "ok" }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz();
    const { init, headers } = callOf(doFetch);
    expect(init.body).toBeUndefined();
    expect(headers.has("content-type")).toBe(false);
  });

  it("accepts the media type the operation answers with, and a problem document", async () => {
    const doFetch = stubFetch(json({ status: "ok" }));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz();
    expect(callOf(doFetch).headers.get("accept")).toBe(
      "application/json, application/problem+json",
    );
  });

  it("passes a declared header parameter through", async () => {
    const doFetch = stubFetch(json([]));
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).benchAuditTrail({
      header: { authorization: "Bearer t" },
    });
    expect(callOf(doFetch).headers.get("authorization")).toBe("Bearer t");
  });

  it("carries no credentials — on reads or on anything else", async () => {
    // The API's CORS policy can never allow credentials, so a cookie attached here would not
    // arrive; it would only turn a working request into a preflight failure.
    const doFetch = stubFetch(json({ status: "ok" }));
    const api = createApiClient({ baseUrl: BASE, fetch: doFetch });
    await api.hubHealthz();
    expect(callOf(doFetch).init.credentials).toBe("omit");

    const write = stubFetch(json({}));
    await createApiClient({ baseUrl: BASE, fetch: write }).hubResolve({ body: {} as never });
    expect(callOf(write).init.credentials).toBe("omit");
  });
});

describe("what is read back", () => {
  it("resolves a JSON body", async () => {
    const doFetch = stubFetch(json({ status: "ok", component: "hub", version: "1" }));
    const health = await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz();
    expect(health).toEqual({ status: "ok", component: "hub", version: "1" });
  });

  it("resolves text for the metrics endpoint", async () => {
    const doFetch = stubFetch(
      new Response("# HELP up\nup 1\n", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );
    const metrics = await createApiClient({
      baseUrl: BASE,
      fetch: doFetch,
    }).benchPrometheusMetrics();
    expect(metrics).toBe("# HELP up\nup 1\n");
  });

  it("resolves a Blob for the replay bytes, not a string", async () => {
    // The document says `type: string, format: binary`, which is what OpenAPI has to say. What
    // `fetch` produces is bytes, and the replay reader wants them as such.
    const doFetch = stubFetch(
      new Response(new Uint8Array([0x89, 0x4d, 0x43, 0x41]), {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    const replay = await createApiClient({ baseUrl: BASE, fetch: doFetch }).benchGetReplay({
      path: { submission_id: "s-1" },
    });
    expect(replay).toBeInstanceOf(Blob);
    expect(replay.size).toBe(4);
  });

  it("resolves undefined for an empty success body rather than throwing on the parse", async () => {
    const doFetch = stubFetch(new Response("", { status: 200 }));
    await expect(
      createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz(),
    ).resolves.toBeUndefined();
  });
});

describe("cancellation", () => {
  it("passes the signal to fetch", async () => {
    const doFetch = stubFetch(json({ status: "ok" }));
    const controller = new AbortController();
    await createApiClient({ baseUrl: BASE, fetch: doFetch }).hubHealthz({
      signal: controller.signal,
    });
    expect(callOf(doFetch).init.signal).toBe(controller.signal);
  });

  it("lets an abort propagate untouched instead of reporting it as a failure", async () => {
    // A page that navigates away cancels its requests. That is the caller's own doing, and
    // wrapping it would make `AsyncState` render an error nobody caused.
    const doFetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    const api = createApiClient({ baseUrl: BASE, fetch: doFetch });
    await expect(api.hubHealthz()).rejects.toSatisfy(
      (error: unknown) => error instanceof DOMException && error.name === "AbortError",
    );
  });
});

describe("the operation table", () => {
  it("drives the request — nothing in the fetch core knows a route", async () => {
    const doFetch = stubFetch(json({}));
    const request = createRequest({ baseUrl: BASE, fetch: doFetch });
    await request(OPERATIONS.benchGetJob, { path: { job_id: "x" } });
    const { url, init } = callOf(doFetch);
    expect(url).toBe("https://api.test/bench/jobs/x");
    expect(init.method).toBe("GET");
  });
});
