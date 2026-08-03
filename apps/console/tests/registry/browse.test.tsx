// Searching the commons (ui#10; UC-G2; CX-LOCAL).
//
// The acceptance criteria this file is the evidence for:
//
//   - reads are account-free — no credential is sent, and nothing prompts for one;
//   - an empty search says so with a hint, a failed one says why, neither blanks;
//   - the component tests cover empty, error and results.
//
// The artifact page's own criteria are in `artifact.test.tsx`.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrowseRegistry } from "@/components/registry/BrowseRegistry";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { hit } from "./fixtures";

const { api, use, server } = mockApi();

describe("results", () => {
  it("renders a row per artifact, addressed by name and version", async () => {
    use(
      api.hubSearch({
        body: [hit(), hit({ reference: "commons/haworth:0.2.0", name: "haworth" })],
      }),
    );
    goTo("/registry?q=lunar");
    renderWithApi(<BrowseRegistry />);

    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(3); // header + two
    expect(
      within(table).getByRole("link", { name: "commons/shackleton-rim:0.5.0" }),
    ).toHaveAttribute("href", "/registry/artifact?name=shackleton-rim&version=0.5.0");
  });

  it("shows the Core kind and the container kind as separate columns", async () => {
    // hub.md §2 principle 2: two vocabularies, never one field. They overlap on four names, and a
    // single "kind" column is how a Surrogate model gets read as a Worlds one.
    use(api.hubSearch({ body: [hit({ kind: "field_model", artifact_kind: "surrogate" })] }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("field_model")).toBeInTheDocument();
    expect(within(table).getByText("surrogate")).toBeInTheDocument();
  });

  it("badges a yanked artifact in the row itself", async () => {
    // A reader deciding whether to depend on something must not have to open it to find out.
    use(api.hubSearch({ body: [hit({ yanked: true })] }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("yanked")).toBeInTheDocument();
  });

  it("distinguishes yanked from deprecated, because they mean different things", async () => {
    use(api.hubSearch({ body: [hit({ deprecated: true })] }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("deprecated")).toBeInTheDocument();
    expect(within(table).queryByText("yanked")).toBeNull();
  });

  it("says when it is showing a truncated list rather than implying the catalog ends", async () => {
    // The route takes a limit and offers no cursor. Silently showing 50 of 500 is the kind of
    // quiet truncation that reads as "this is everything".
    use(api.hubSearch({ body: Array.from({ length: 50 }, (_, i) => hit({ name: `w${i}` })) }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByText(/there may be more/i)).toBeInTheDocument();
  });
});

describe("nothing matched", () => {
  it("says so, quotes the term, and hints at what to do", async () => {
    use(api.hubSearch({ body: [] }));
    goTo("/registry?q=nothing-like-this");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByText(/Nothing matched/)).toHaveTextContent("nothing-like-this");
    expect(screen.getByText(/switch to semantic search/i)).toBeInTheDocument();
  });

  it("says something different when the catalog itself is empty", async () => {
    // "Nothing matched ''" would be nonsense. An empty registry has a different remedy — publish
    // something, or point at a registry that has some.
    use(api.hubSearch({ body: [] }));
    goTo("/registry");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByText("Nothing published here yet")).toBeInTheDocument();
    expect(screen.getByText(/astro-mine hub publish/)).toBeInTheDocument();
  });
});

describe("when the search fails", () => {
  it("says why, in the API's own words", async () => {
    use(
      api.hubSearch({
        problem: { code: "internal_error", detail: "the catalog index is rebuilding" },
      }),
    );
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the catalog index is rebuilding");
  });

  it("degrades rather than erroring when the deployment has no Hub", async () => {
    use(
      api.hubSearch({ problem: { code: "capability_unavailable", detail: "hub is not mounted" } }),
    );
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);

    // Waited on by TEXT, not by role: `AsyncState`'s loading arm is also `role="status"`, so
    // `findByRole("status")` resolves against the spinner on the very first poll and asserts
    // against it.
    const reason = await screen.findByText(/hub is not mounted/);
    expect(reason.closest("[role='status']")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains itself with no API configured, and still renders the search box", async () => {
    renderWithApi(<BrowseRegistry />, UNCONFIGURED);

    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
    // Degrade visibly, never blank: the page is still a page.
    expect(screen.getByRole("textbox", { name: /Search the catalog/ })).toBeInTheDocument();
  });
});

describe("reads are account-free (CX-LOCAL)", () => {
  it("sends no credentials and no authorization header", async () => {
    // The client sets `credentials: "omit"` on every call, so this is really a regression test
    // against a page ever adding one — which is the only way it could come back.
    const seen: Request[] = [];
    server.events.on("request:start", ({ request }) => seen.push(request));

    use(api.hubSearch({ body: [hit()] }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);
    await screen.findByRole("table");

    expect(seen.length).toBeGreaterThan(0);
    for (const request of seen) {
      expect(request.headers.get("authorization")).toBeNull();
      expect(request.headers.get("cookie")).toBeNull();
      expect(request.credentials).toBe("omit");
    }
  });

  it("offers nothing that looks like signing in", async () => {
    use(api.hubSearch({ body: [hit()] }));
    goTo("/registry?q=x");
    renderWithApi(<BrowseRegistry />);
    await screen.findByRole("table");

    for (const label of [/sign in/i, /log in/i, /token/i, /password/i]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});

describe("the search is in the address", () => {
  it("reads the term the top bar wrote", async () => {
    // The top bar pushes `/registry?q=…` rather than implementing a second search. If this page
    // stopped reading `q`, that link would silently go nowhere useful.
    use(
      api.hubSearch(({ request }) => ({
        body: [hit({ name: new URL(request.url).searchParams.get("text") ?? "unset" })],
      })),
    );
    goTo("/registry?q=excavator");
    renderWithApi(<BrowseRegistry />);

    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getByText(/excavator/)).toBeInTheDocument());
  });

  it("sends the term as `semantic` when that is the mode", async () => {
    // Two different matchers on the same route; sending the wrong parameter silently returns the
    // wrong kind of answer rather than failing.
    use(
      api.hubSearch(({ request }) => {
        const params = new URL(request.url).searchParams;
        return {
          body:
            params.get("semantic") === "digs regolith" && params.get("text") === null
              ? [hit({ name: "semantic-ok" })]
              : [],
        };
      }),
    );
    goTo("/registry?q=digs+regolith&mode=semantic");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByText(/semantic-ok/)).toBeInTheDocument();
  });

  it("passes the facet filters through", async () => {
    use(
      api.hubSearch(({ request }) => {
        const params = new URL(request.url).searchParams;
        return {
          body:
            params.get("kind") === "policy" && params.get("artifact_kind") === "policy"
              ? [hit({ name: "filtered" })]
              : [],
        };
      }),
    );
    goTo("/registry?q=x&kind=policy&artifact_kind=policy");
    renderWithApi(<BrowseRegistry />);

    expect(await screen.findByText(/filtered/)).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(api.hubSearch({ body: [hit(), hit({ name: "haworth", yanked: true })] }));
    goTo("/registry?q=x");

    await forEachColorScheme(withApi(<BrowseRegistry />), async ({ container }) => {
      await screen.findAllByRole("table");
      await expectNoA11yViolations(container);
    });
  });
});
