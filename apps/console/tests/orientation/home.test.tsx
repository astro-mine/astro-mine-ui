// Home — the persona router and the configuration panel (ui#9; UC-A4; gap report §5 J6).
//
// The acceptance criteria this file is the evidence for:
//
//   - with no API configured, the page still renders and explains exactly what to set;
//   - every persona card leads somewhere that exists — no link to an unbuilt page;
//   - the configuration panel distinguishes not-configured, unreachable and mounted-but-absent,
//     because the fixes differ.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Configured } from "@/components/orientation/Configured";
import { PersonaCards } from "@/components/orientation/PersonaCards";
import { PERSONAS } from "@/components/orientation/personas";
import { NAV_ENTRIES } from "@/shell/navigation";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";

const { api, use } = mockApi();

const health = (surfaces: string[]) =>
  api.healthz({
    body: { component: "astro-mine-api", status: "ok", version: "0.5.0", surfaces },
  });
describe("the persona router", () => {
  it("offers all seven personas", async () => {
    renderWithApi(<PersonaCards />);
    for (const persona of PERSONAS) {
      expect(await screen.findByText(persona.title)).toBeInTheDocument();
    }
    expect(PERSONAS).toHaveLength(7);
  });

  it("leads every card somewhere that exists — no link to an unbuilt page", async () => {
    // The criterion, and the failure it prevents: a card linking somewhere plausible-but-unbuilt is
    // exactly the "so this is the GUI" impression the gap report's J6 records.
    const routes = new Set(NAV_ENTRIES.map((entry) => entry.href));
    for (const persona of PERSONAS) {
      if (persona.route === null) continue;
      expect(routes, `${persona.id} links to ${persona.route}, which is not a route`).toContain(
        persona.route,
      );
    }
  });

  it("says plainly when a persona's work has no page, and names the command", async () => {
    // Four of the seven. Saying so is the honest alternative to a link that goes somewhere
    // approximately related.
    renderWithApi(<PersonaCards />);
    await screen.findByText("Planning & autonomy researcher");

    const withoutPages = PERSONAS.filter((persona) => persona.route === null);
    expect(withoutPages.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/This has no page/)).toHaveLength(withoutPages.length);
    for (const persona of withoutPages) {
      expect(screen.getByText(persona.command)).toBeInTheDocument();
    }
  });

  it("carries each persona's trap", async () => {
    renderWithApi(<PersonaCards />);
    expect(
      await screen.findByText(/The default runner is the fixture, not physics/),
    ).toBeInTheDocument();
  });
});

describe("what is configured, right now", () => {
  it("says what to set when nothing is configured", async () => {
    renderWithApi(<Configured />, UNCONFIGURED);

    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
    expect(screen.getByText(/Create `config.json`/)).toBeInTheDocument();
  });

  it("distinguishes unreachable from unconfigured — the fixes differ", async () => {
    // The most expensive collapse of the three: telling a reader to check their configuration when
    // their configuration is fine.
    use(api.healthz({ problem: { code: "internal_error", detail: "gateway timeout" } }));
    renderWithApi(<Configured />);

    expect(
      await screen.findByText("An API is configured, and it did not answer"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your configuration is not the problem/)).toBeInTheDocument();
    expect(screen.queryByText(/Create `config.json`/)).toBeNull();
  });

  it("distinguishes a surface that is not mounted from one that is broken", async () => {
    use(health(["hub", "bench"]));
    renderWithApi(<Configured />);

    expect(await screen.findByText("hub · mounted")).toBeInTheDocument();
    expect(screen.getByText("studio · not mounted")).toBeInTheDocument();
    // Two surfaces are absent in this fixture, so the phrase appears twice — one per absent
    // surface, which is the point rather than a duplication.
    expect(screen.getAllByText(/not broken/)).toHaveLength(2);
  });

  it("names what stops working without each absent surface", async () => {
    use(health(["hub"]));
    renderWithApi(<Configured />);

    await screen.findByText("hub · mounted");
    expect(
      screen.getByText(/Leaderboards, scorecards, submitting, the audit trail/),
    ).toBeInTheDocument();
  });

  it("says nothing at all before it has looked", () => {
    // "Not configured" during the cold-load window is how a working deployment blames itself.
    const { container } = renderWithApi(<Configured />);
    expect(container.textContent).toBe("");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(health(["hub", "bench", "studio", "cloud"]));
    await forEachColorScheme(
      withApi(
        <>
          <PersonaCards />
          <Configured />
        </>,
      ),
      async ({ container }) => {
        await screen.findAllByText("Benchmark researcher");
        await expectNoA11yViolations(container);
      },
    );
  });
});
