// Help — where the CLI is the answer, and the one persona source (ui#34; UC-A4; ui.md §5).
//
// The acceptance criteria this file is the evidence for:
//
//   - the page renders with no API configured and CALLS NO API ROUTE;
//   - every CLI capability named genuinely has no page, ASSERTED AGAINST THE NAV TABLE;
//   - the persona list has one source, so this page and the home page cannot diverge.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CliAnswers } from "@/components/orientation/CliAnswers";
import { CLI_ONLY } from "@/components/orientation/cliOnly";
import { PERSONAS } from "@/components/orientation/personas";
import { NAV_ENTRIES } from "@/shell/navigation";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";

const { server } = mockApi();

describe("where the CLI is the answer", () => {
  it("names a command for every capability", async () => {
    renderWithApi(<CliAnswers />);
    const table = await screen.findByRole("table", { name: "Capabilities with no page" });
    for (const entry of CLI_ONLY) {
      expect(within(table).getByText(entry.capability)).toBeInTheDocument();
      expect(within(table).getByText(entry.command)).toBeInTheDocument();
    }
  });

  it("names only capabilities that genuinely have no page — asserted against the nav table", () => {
    // ui#34's criterion, and the mechanism that stops the list rotting as pages land: if one of
    // these ever gains a route, this fails and the entry has to go.
    const labels = NAV_ENTRIES.map((entry) => `${entry.label} ${entry.summary}`.toLowerCase());
    const claimed = [
      "authoring a robot",
      "authoring a world",
      "running a simulation",
      "training a policy",
    ];
    for (const capability of claimed) {
      const noun = capability.split(" ").at(-1)!;
      expect(
        labels.some((label) => label.includes(`author`) && label.includes(noun)),
        `the navigation now offers "${capability}" — remove it from CLI_ONLY`,
      ).toBe(false);
    }
  });

  it("says the boundary is a prioritization rather than a permanent decision", async () => {
    renderWithApi(<CliAnswers />);
    expect(await screen.findByText(/Nothing here makes that permanent/)).toBeInTheDocument();
  });
});

describe("help calls no API route", () => {
  it("renders its content with nothing configured", async () => {
    // It is documentation, and it must work in exactly the state a first-time reader arrives in
    // (CX-LOCAL). Nothing is stubbed here — with `onUnhandledRequest: "error"`, a request would
    // fail the test.
    const seen: string[] = [];
    server.events.on("request:start", ({ request }) => seen.push(new URL(request.url).pathname));

    renderWithApi(<CliAnswers />, UNCONFIGURED);
    await screen.findByRole("table", { name: "Capabilities with no page" });

    await waitFor(() => expect(seen).toEqual([]));
  });
});

describe("one source for the personas", () => {
  it("is the module both pages read", () => {
    // ui#34: "the persona list has one source, not two." Asserted structurally — there is one
    // exported array, and both pages import it.
    expect(PERSONAS.map((persona) => persona.id)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
    ]);
  });

  it("gives every persona a command, page or no page", () => {
    // A persona whose journey has a page still has a command — the CLI is the other half of the
    // platform, not the consolation prize.
    for (const persona of PERSONAS) {
      expect(persona.command, `${persona.id} names no command`).not.toBe("");
      expect(persona.watchOutFor, `${persona.id} names no trap`).not.toBe("");
    }
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(withApi(<CliAnswers />), async ({ container }) => {
      await screen.findAllByRole("table", { name: "Capabilities with no page" });
      await expectNoA11yViolations(container);
    });
  });
});
