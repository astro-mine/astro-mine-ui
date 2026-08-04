// One artifact, by URL alone (ui#10; ui.md §7 honesty rules 4 and 6; ui.md §6).
//
// Four acceptance criteria live here, and three of them are honesty rules rather than features:
//
//   - the page is reachable by URL alone and renders from a cold load with only the query string;
//   - the full digest is present, not only an abbreviation;
//   - attestations are never phrased as a verification result — with and without, both asserted;
//   - an artifact with an inspector and one without both render.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArtifactPage } from "@/components/registry/ArtifactPage";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { detail, digestFor } from "./fixtures";

const { api, use, server } = mockApi();

const AT = "/registry/artifact?name=shackleton-rim&version=0.5.0";

describe("reachable by URL alone", () => {
  it("renders from a cold load with only the query string", async () => {
    // No navigation, no prior search, no state handed in — which is the whole difference between
    // this page and the master-detail drawer it replaces.
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(
      await screen.findByRole("heading", { name: "commons/shackleton-rim:0.5.0" }),
    ).toBeInTheDocument();
  });

  it("asks for exactly the name and version in the address", async () => {
    const seen: string[] = [];
    server.events.on("request:start", ({ request }) => seen.push(new URL(request.url).pathname));

    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);
    await screen.findByRole("heading", { name: /shackleton-rim/ });

    expect(seen).toContain("/hub/artifacts/shackleton-rim/0.5.0");
  });

  it("is a state, not an error, when the address names nothing", async () => {
    // Nothing is stubbed: a request here would fail the test outright, which is the point — a page
    // with no subject must not interpolate `undefined` into the path.
    goTo("/registry/artifact");
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByText("No artifact in the address")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the artifact was not found, in the API's own words", async () => {
    use(
      api.hubGetArtifact({
        problem: { code: "content_not_found", detail: "no artifact shackleton-rim:0.5.0" },
      }),
    );
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("no artifact shackleton-rim:0.5.0");
  });
});

describe("the digest is the identity", () => {
  it("is present in full, not only abbreviated", async () => {
    // Honesty rule 4, and the criterion in as many words. An abbreviation is a fine affordance in a
    // table row and useless to somebody pinning bytes into a lockfile.
    const digest = digestFor("b");
    use(api.hubGetArtifact({ body: detail({ digest }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByText(digest)).toBeInTheDocument();
  });

  it("says in words that the reference is a query and the digest is the answer", async () => {
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByText(/This is the identity/)).toBeInTheDocument();
    expect(screen.getByText(/may resolve to another tomorrow/)).toBeInTheDocument();
  });
});

describe("attestations are what is held, never a verdict", () => {
  it("says so in those words, before listing them", async () => {
    use(api.hubGetArtifact({ body: detail({ attestations: ["cosign_signature", "sbom"] }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByText("Attestations held")).toBeInTheDocument();
    expect(screen.getByText(/This is not a verification result/)).toBeInTheDocument();
    expect(screen.getByText("cosign_signature")).toBeInTheDocument();
  });

  it("claims no verification anywhere on the page", async () => {
    // The failure mode is a word, not a component: "verified" beside a signature type is a claim
    // the browser has not earned.
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);
    await screen.findByText("Attestations held");

    const said = document.body.textContent ?? "";
    // "verified them server-side at admission" is a statement about the *registry* and is allowed;
    // a bare "verified" attached to the artifact is not. Assert the honest sentence is what carries
    // the word, and that no success/verified badge exists.
    expect(said).toContain("verified them");
    expect(screen.queryByText(/^verified$/i)).toBeNull();
    expect(screen.queryByText(/signature valid/i)).toBeNull();
  });

  it("distinguishes 'nothing is held' from 'this is unsigned'", async () => {
    // Absence of a record is not evidence of absence, and a page that says "unsigned" here would be
    // asserting something nobody checked.
    use(api.hubGetArtifact({ body: detail({ attestations: [] }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(
      await screen.findByText("No attestations are held for this artifact"),
    ).toBeInTheDocument();
    expect(screen.getByText(/absence of a record/)).toBeInTheDocument();
  });
});

describe("catalog facets", () => {
  it("shows the Core kind and the container kind separately", async () => {
    use(api.hubGetArtifact({ body: detail({ kind: "field_model", artifact_kind: "surrogate" }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    const facets = (await screen.findByText("Catalog facets")).parentElement as HTMLElement;
    expect(within(facets).getByText("Core kind")).toBeInTheDocument();
    expect(within(facets).getByText("Container kind")).toBeInTheDocument();
  });

  it("renders a dash for a facet the catalog did not record", async () => {
    // Never a blank cell: a blank reads as a rendering fault, and a reader cannot tell it from one.
    use(api.hubGetArtifact({ body: detail({ license: null, publisher: null }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    await screen.findByText("Catalog facets");
    expect(screen.getAllByLabelText("not recorded").length).toBeGreaterThanOrEqual(2);
  });

  it("warns in the page when the artifact is yanked", async () => {
    use(api.hubGetArtifact({ body: detail({ yanked: true }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByText(/do not take a new dependency on it/)).toBeInTheDocument();
  });
});

describe("the inspector", () => {
  it("renders the panel for the artifact's kind", async () => {
    // Resolution is `@astro-mine/inspectors`' and is normative (ui.md §6); this asserts the page
    // hands it a subject it can resolve, not that the resolution rule works.
    use(api.hubGetArtifact({ body: detail({ kind: "world_provider", artifact_kind: "world" }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByRole("heading", { name: "Inspector" })).toBeInTheDocument();
    // The world inspector names the body it is for; the fallback never would.
    expect(screen.getByText(/MOON/)).toBeInTheDocument();
  });

  it("says honestly that there is no inspector for a kind that has none", async () => {
    use(
      api.hubGetArtifact({
        body: detail({ kind: "comms_model", artifact_kind: "plugin", attributes: {} }),
      }),
    );
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    await screen.findByRole("heading", { name: "Inspector" });
    // The fallback's own title, which names the kind — not a loose /no inspector/i, which also
    // matches the panel heading and the explanatory sentence beneath it.
    expect(screen.getByText("No inspector for kind “comms_model”")).toBeInTheDocument();
  });
});

describe("with no API configured", () => {
  it("explains what to set rather than blanking", async () => {
    goTo(AT);
    renderWithApi(<ArtifactPage />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);

    await forEachColorScheme(withApi(<ArtifactPage />), async ({ container }) => {
      await screen.findAllByText("Attestations held");
      await expectNoA11yViolations(container);
    });
  });
});
