// Runtime configuration: every outcome is a state with a reason and a remedy, and none of them
// throws into a blank page (ui.md §7 honesty rule 3; an acceptance criterion of ui#2).

import { describe, expect, it, vi } from "vitest";

import { loadRuntimeConfig, RUNTIME_CONFIG_PATH } from "../src/index.js";

function answering(response: Response | (() => never)) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    if (typeof response === "function") response();
    return response as Response;
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("a configured deployment", () => {
  it("yields the endpoint", async () => {
    const state = await loadRuntimeConfig({
      fetch: answering(jsonResponse({ apiBaseUrl: "https://api.example.org" })),
    });
    expect(state).toEqual({
      status: "configured",
      config: { apiBaseUrl: "https://api.example.org" },
    });
  });

  it("reads config.json from the deployment root, not from beside the current page", async () => {
    // THE REGRESSION THIS REPLACES. The path was `config.json` — relative — on the reasoning that a
    // relative URL survives a base path. It resolves against the *current document*, so it only
    // ever pointed at the deployment root from the deployment root. `ui#5` turned one page into
    // twenty and the browser started asking for `/registry/config.json`,
    // `/registry/artifact/config.json` and so on: a correctly configured deployment reporting "no
    // API is configured" on every route but the home page.
    //
    // A test asserted the old behaviour, and asserted it *by its intent* — "so a base path still
    // resolves" — which is how a wrong decision survives review: the assertion agreed with the
    // comment, and both were about a case nobody had a second page to check.
    const doFetch = answering(jsonResponse({ apiBaseUrl: "https://api.example.org" }));
    await loadRuntimeConfig({ fetch: doFetch });
    expect(doFetch.mock.calls[0][0]).toBe(RUNTIME_CONFIG_PATH);
    expect(RUNTIME_CONFIG_PATH.startsWith("/")).toBe(true);
  });

  it("resolves to the same file from any depth of route", async () => {
    // The property stated as the thing that actually matters, rather than as a fact about the
    // string: wherever the reader is, the application asks for one file.
    const doFetch = answering(jsonResponse({ apiBaseUrl: "https://api.example.org" }));
    for (const page of ["/", "/registry/", "/registry/artifact/", "/bench/leaderboard/"]) {
      const resolved = new URL(RUNTIME_CONFIG_PATH, `https://console.example.org${page}`);
      expect(resolved.pathname, `from ${page}`).toBe("/config.json");
    }
    await loadRuntimeConfig({ fetch: doFetch });
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it("lets a deployment under a base path say so", async () => {
    // The case the relative path was reaching for, served properly: only the application knows its
    // own prefix, so the application passes it.
    const doFetch = answering(jsonResponse({ apiBaseUrl: "https://api.example.org" }));
    await loadRuntimeConfig({ fetch: doFetch, url: "/console/config.json" });
    expect(doFetch.mock.calls[0][0]).toBe("/console/config.json");
  });
});

describe("an unconfigured deployment", () => {
  it("is a state, not a throw, when the file is absent", async () => {
    const state = await loadRuntimeConfig({
      fetch: answering(new Response("", { status: 404 })),
    });
    expect(state.status).toBe("unconfigured");
    expect(state).toHaveProperty("reason");
    expect(state).toHaveProperty("remedy");
  });

  it("is a state when the file cannot be fetched at all", async () => {
    const state = await loadRuntimeConfig({
      fetch: answering(() => {
        throw new TypeError("Failed to fetch");
      }),
    });
    expect(state.status).toBe("unconfigured");
  });

  it("is a state when the file exists but names no endpoint", async () => {
    const state = await loadRuntimeConfig({ fetch: answering(jsonResponse({})) });
    expect(state.status).toBe("unconfigured");
    if (state.status === "unconfigured") expect(state.reason).toMatch(/names no `apiBaseUrl`/);
  });

  it("carries a remedy that says what to write", async () => {
    const state = await loadRuntimeConfig({
      fetch: answering(new Response("", { status: 404 })),
    });
    if (state.status !== "unconfigured") throw new Error("expected unconfigured");
    expect(state.remedy).toMatch(/config\.json/);
    expect(state.remedy).toMatch(/apiBaseUrl/);
  });
});

describe("a misconfigured deployment", () => {
  it("distinguishes 'wrote it wrong' from 'never wrote it', because the remedies differ", async () => {
    const notJson = await loadRuntimeConfig({
      fetch: answering(new Response("<!doctype html>", { status: 200 })),
    });
    expect(notJson.status).toBe("invalid");

    const notAnObject = await loadRuntimeConfig({ fetch: answering(jsonResponse([1, 2])) });
    expect(notAnObject.status).toBe("invalid");

    const notAUrl = await loadRuntimeConfig({
      fetch: answering(jsonResponse({ apiBaseUrl: "api.example.org" })),
    });
    expect(notAUrl.status).toBe("invalid");

    const wrongProtocol = await loadRuntimeConfig({
      fetch: answering(jsonResponse({ apiBaseUrl: "ftp://api.example.org" })),
    });
    expect(wrongProtocol.status).toBe("invalid");
  });

  it("tells the deployer to correct the file rather than to create one", async () => {
    const state = await loadRuntimeConfig({
      fetch: answering(jsonResponse({ apiBaseUrl: 7 })),
    });
    if (state.status !== "invalid") throw new Error("expected invalid");
    expect(state.remedy).toMatch(/Correct/);
  });
});

describe("cancellation", () => {
  it("is the one thing that propagates, because the caller asked for it", async () => {
    const doFetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    await expect(loadRuntimeConfig({ fetch: doFetch })).rejects.toSatisfy(
      (error: unknown) => error instanceof DOMException && error.name === "AbortError",
    );
  });
});
