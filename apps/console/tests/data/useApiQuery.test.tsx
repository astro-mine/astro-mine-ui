// Reading from the API (Wave 29).
//
// The three mistakes `useApiQuery` exists to make unavailable are the three things asserted here:
// a request that outlives its page, an abort rendered as an error, and "no API configured"
// collapsed into "the API said no". Each of them is a defect that reads as something else when it
// happens, which is exactly why they are tests rather than review notes.

import { mockApi } from "@astro-mine/api-client/testing";
import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useApiQuery, useReloadToken, type ApiQuery } from "@/data/useApiQuery";

import { renderWhileLoading, renderWithApi, UNCONFIGURED } from "./harness";

const { api, use } = mockApi();

/** Renders whatever the query is, as text an assertion can read. */
function Probe({ query }: { query: ApiQuery<unknown> }) {
  return (
    <div data-testid="probe">
      {query.status === "ready" ? `ready:${JSON.stringify(query.data)}` : query.status}
      {query.status === "failed" ? `:${query.failure.kind}:${query.failure.title}` : ""}
      {query.status === "unconfigured" ? `:${query.config.status}` : ""}
    </div>
  );
}

const probe = () => screen.getByTestId("probe").textContent ?? "";

function SearchPage({ q, enabled }: { q: string; enabled?: boolean }) {
  const query = useApiQuery(
    (client, signal) => client.hubSearch({ query: { text: q } }, { signal }),
    [q],
    { enabled },
  );
  return <Probe query={query} />;
}

const hit = (name: string) => ({
  reference: `commons/${name}:1.0.0`,
  name,
  namespace: "commons",
  version: "1.0.0",
  digest: `sha256:${name.padEnd(64, "0")}`,
  kind: "world",
  artifact_kind: "world",
  publisher: "astro-mine",
  license: "Apache-2.0",
  yanked: false,
  deprecated: false,
  score: 1,
});

describe("a successful read", () => {
  it("ends ready, carrying what the API sent", async () => {
    use(api.hubSearch({ body: [hit("shackleton")] }));
    renderWithApi(<SearchPage q="shackleton" />);
    await waitFor(() => expect(probe()).toContain("ready:"));
    expect(probe()).toContain("shackleton");
  });

  it("says loading before it says anything else", () => {
    use(api.hubSearch({ body: [] }));
    renderWithApi(<SearchPage q="anything" />);
    // Synchronously after mount: the request is out and nothing has come back.
    expect(probe()).toBe("loading");
  });
});

describe("a read the API refused", () => {
  it("ends failed, with the cause the API named", async () => {
    use(
      api.hubSearch({ problem: { code: "capability_unavailable", detail: "hub is not mounted" } }),
    );
    renderWithApi(<SearchPage q="anything" />);
    await waitFor(() => expect(probe()).toContain("failed"));
    // Degraded, not error: the deployment does not offer this, which is a state with a remedy.
    expect(probe()).toContain("degraded");
  });
});

describe("a deployment with no API", () => {
  it("is its own arm, not a failure", async () => {
    // Honesty rule 3. A deployment nobody pointed at an API has not failed — and the remedy is a
    // file to write, which is nothing like the remedy for a request that was refused.
    renderWithApi(<SearchPage q="anything" />, UNCONFIGURED);
    await waitFor(() => expect(probe()).toContain("unconfigured"));
    expect(probe()).toContain("unconfigured:unconfigured");
  });

  it("does not claim to be unconfigured before it has looked", () => {
    // The cold-load flash: `config.json` is still in flight, and saying "no API" here makes a
    // correctly configured deployment blame itself on every load.
    renderWhileLoading(<SearchPage q="anything" />);
    expect(probe()).toBe("loading");
  });
});

describe("a page that has nothing to ask for", () => {
  it("stays idle rather than firing a request", async () => {
    // `/registry/artifact` with no `name` in the address. Firing anyway would interpolate
    // `undefined` into the path and turn an empty page into a 404 the reader has to interpret.
    // Nothing is stubbed here — `onUnhandledRequest: "error"` means a request would fail the test.
    renderWithApi(<SearchPage q="" enabled={false} />);
    await waitFor(() => expect(probe()).toBe("idle"));
  });
});

describe("no request outlives its page", () => {
  it("aborts the signal it handed the callback when the page goes away", async () => {
    // ui#14 makes this an acceptance criterion. It is equally true of every page: without it a
    // slow response lands after the reader has left, and an early response can land after a late
    // one and leave the wrong results on the screen.
    let signal: AbortSignal | undefined;
    function Never() {
      const query = useApiQuery((_client, given) => {
        signal = given;
        return new Promise<never>(() => {});
      }, []);
      return <Probe query={query} />;
    }

    const { unmount } = renderWithApi(<Never />);
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);

    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("renders nothing at all for the abort it caused", async () => {
    // The abort is the page's own doing. Reported, it reads as "something went wrong" to a reader
    // who did nothing but click a link.
    const rendered = vi.fn();
    function Aborting() {
      const query = useApiQuery(
        (_client, signal) =>
          new Promise<never>((_resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
        [],
      );
      rendered(query.status);
      return <Probe query={query} />;
    }

    const { unmount } = renderWithApi(<Aborting />);
    await waitFor(() => expect(rendered).toHaveBeenCalledWith("loading"));
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rendered).not.toHaveBeenCalledWith("failed");
  });
});

describe("when the request's inputs change", () => {
  it("asks again", async () => {
    use(
      api.hubSearch(({ request }) => ({
        body: [hit(new URL(request.url).searchParams.get("text") ?? "")],
      })),
    );

    // The term is driven from *inside* the tree rather than through `rerender`. `rerender` replaces
    // the element that was rendered, which here is the `RuntimeConfigProvider` — so the second
    // render would mount a fresh provider, reload the configuration and build a new client, and the
    // refetch under test would be indistinguishable from a remount.
    function Searching() {
      const [q, setQ] = useState("rover");
      return (
        <>
          <SearchPage q={q} />
          <button onClick={() => setQ("hopper")}>change</button>
        </>
      );
    }

    renderWithApi(<Searching />);
    await waitFor(() => expect(probe()).toContain("rover"));

    screen.getByRole("button", { name: "change" }).click();
    await waitFor(() => expect(probe()).toContain("hopper"));
  });
});

describe("reloading", () => {
  it("runs the read again when the token changes", async () => {
    let calls = 0;
    function Reloadable() {
      const [token, reload] = useReloadToken();
      const query = useApiQuery(() => {
        calls += 1;
        return Promise.resolve(calls);
      }, [token]);
      return (
        <>
          <Probe query={query} />
          <button onClick={reload}>reload</button>
        </>
      );
    }

    renderWithApi(<Reloadable />);
    await waitFor(() => expect(probe()).toBe("ready:1"));

    screen.getByRole("button", { name: "reload" }).click();
    await waitFor(() => expect(probe()).toBe("ready:2"));
  });
});
