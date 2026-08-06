// One artifact, by URL alone (ui#10; ui.md §7 honesty rules 4 and 6; ui.md §6).
//
// Four acceptance criteria live here, and three of them are honesty rules rather than features:
//
//   - the page is reachable by URL alone and renders from a cold load with only the query string;
//   - the full digest is present, not only an abbreviation;
//   - attestations are never phrased as a verification result — with and without, both asserted;
//   - an artifact with an inspector and one without both render.
//
// `ui#51` adds the composition half of the last one: a panel is *handed* its heavy visuals, and the
// page is the only thing that may own a Cesium mount. What jsdom can assert is the wiring — the
// slot is filled, the request goes out when asked and not before, a failure carries the backend's
// words. **It cannot assert that a globe mounts**: there is no WebGL here. That is the journeys
// lane's, in a real browser against a real API (`e2e/journeys/p3p4-authors.spec.ts`).

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("the world artifact's terrain", () => {
  /** Every `/studio/worlds/…` request the page made, in order. */
  function watchWorldRequests(): string[] {
    const seen: string[] = [];
    server.events.on("request:start", ({ request }) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith("/studio/worlds")) seen.push(pathname);
    });
    return seen;
  }

  it("offers the terrain rather than reporting that none was supplied", async () => {
    // **The defect this file now guards.** `ui.md` §6 opens with "a `world` artifact renders a
    // globe"; the panel resolved correctly and then rendered `WorldInspector`'s "no globe was
    // supplied" state, because the page — the only thing that may own a Cesium mount — passed no
    // `globe` slot. `/dev/inspector` was the only place a globe ever reached a panel, and `ui#21`
    // deleted it.
    use(api.hubGetArtifact({ body: detail({ kind: "world_provider", artifact_kind: "world" }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    expect(await screen.findByRole("button", { name: "Draw the terrain" })).toBeInTheDocument();
    expect(screen.queryByText("No terrain rendered")).toBeNull();
  });

  it("states what drawing costs before anything is pulled", async () => {
    // Honesty rule 3's other half: a control that hides what it will do is a control a reader
    // cannot consent to. Resolving asks the backend to pull a possibly-multi-GB bundle out of Hub
    // and re-verify it, which is why this is a button at all rather than a page load.
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    await screen.findByRole("button", { name: "Draw the terrain" });
    expect(screen.getByText(/pull the bundle and re-verify its supply chain/)).toBeInTheDocument();
  });

  it("pulls nothing until it is asked to, and then asks for this artifact", async () => {
    const seen = watchWorldRequests();
    use(api.hubGetArtifact({ body: detail() }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    const draw = await screen.findByRole("button", { name: "Draw the terrain" });
    expect(seen).toEqual([]);

    await userEvent.setup().click(draw);

    // The artifact's own reference, encoded as one path segment — the client encodes a reference
    // for the same reason `replayUrl` encodes a digest: it carries `/` and `:` and must survive as
    // a single parameter.
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(decodeURIComponent(seen[0]!)).toBe("/studio/worlds/commons/shackleton-rim:0.5.0");
  });

  it("costs a policy artifact nothing, though the page passes the same slot", async () => {
    // **The property that lets the page stay ignorant of kinds.** `slots.globe` is an element, so
    // creating one runs no component and triggers no Cesium import; only `WorldInspector` renders
    // it. If this ever regresses into a fetch, it regresses on every artifact row in the registry.
    const seen = watchWorldRequests();
    use(api.hubGetArtifact({ body: detail({ kind: "policy", artifact_kind: "policy" }) }));
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    await screen.findByRole("heading", { name: "Inspector" });
    expect(screen.queryByRole("button", { name: "Draw the terrain" })).toBeNull();
    expect(seen).toEqual([]);
  });

  it("renders the backend's own reason when the world will not resolve", async () => {
    // A deployment with no registry wiring cannot materialize terrain, and that is a *degraded*
    // state with the API's sentence in it — not "something went wrong", and not a blank frame.
    use(api.hubGetArtifact({ body: detail() }));
    use(
      api.studioResolveWorld({
        problem: {
          code: "capability_unavailable",
          detail: "this deployment serves no terrain: no registry is configured",
        },
      }),
    );
    goTo(AT);
    renderWithApi(<ArtifactPage />);

    await userEvent.setup().click(await screen.findByRole("button", { name: "Draw the terrain" }));

    expect(
      await screen.findByText(/this deployment serves no terrain: no registry is configured/),
    ).toBeInTheDocument();
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
