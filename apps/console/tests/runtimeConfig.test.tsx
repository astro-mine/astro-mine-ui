// The unconfigured deployment (ui#5; ui.md §7 honesty rule 3, CX-LOCAL).
//
// **"With no `/config.json` and no API, the app renders, navigates, and says what is missing."**
// This is the state a first-time reader arrives in — the repository ships no endpoint on purpose —
// so it is not an edge case, it is the default, and it has to be as considered as any page.

import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeConfigState } from "@astro-mine/api-client";

import { AppShell } from "@/shell/AppShell";
import { NAV_ENTRIES } from "@/shell/navigation";
import { RuntimeConfigProvider } from "@/shell/runtimeConfig";

import { expectNoA11yViolations } from "./a11y";
import { forEachColorScheme, renderShell } from "./render";

/** A loader that answers with one state, standing in for `config.json` at whatever it says. */
const loaderFor = (state: RuntimeConfigState) => vi.fn(async () => state);

const UNCONFIGURED: RuntimeConfigState = {
  status: "unconfigured",
  reason: "No `config.json` was found beside the application.",
  remedy: 'Create `config.json` containing {"apiBaseUrl": "https://your-api.example.org"}.',
};

const INVALID: RuntimeConfigState = {
  status: "invalid",
  reason: "`config.json` has an `apiBaseUrl` that is not an absolute http(s) URL.",
  remedy: "Correct `config.json`: `apiBaseUrl` must be an absolute http(s) URL.",
};

const CONFIGURED: RuntimeConfigState = {
  status: "configured",
  config: { apiBaseUrl: "https://api.example.org" },
};

const app = (state: RuntimeConfigState) => (
  <RuntimeConfigProvider load={loaderFor(state)}>
    <AppShell>
      <h1>Page content</h1>
    </AppShell>
  </RuntimeConfigProvider>
);

describe("with no API configured", () => {
  it("says what is missing and what to do about it", async () => {
    renderShell(app(UNCONFIGURED));

    const notice = await screen.findByRole("status");
    expect(within(notice).getByText("No API is configured")).toBeInTheDocument();
    expect(notice).toHaveTextContent("No `config.json` was found beside the application.");
    expect(notice).toHaveTextContent("Create `config.json` containing");
  });

  it("keeps the whole navigation — a missing backend is a state, not a missing feature", async () => {
    renderShell(app(UNCONFIGURED));
    await screen.findByRole("status");

    const nav = screen.getByRole("navigation", { name: "Sections" });
    for (const entry of NAV_ENTRIES) {
      expect(
        within(nav).getByRole("link", { name: new RegExp(`^${entry.label}$`) }),
        `${entry.href} disappeared when the API was unreachable`,
      ).toBeInTheDocument();
    }
  });

  it("still renders the page, rather than replacing it", async () => {
    // Some pages need no API at all. Replacing them with an apology would be a lie about what this
    // deployment can do.
    renderShell(app(UNCONFIGURED));
    await screen.findByRole("status");
    expect(screen.getByRole("heading", { name: "Page content" })).toBeInTheDocument();
  });

  it("leaves search and the colour toggle working", async () => {
    renderShell(app(UNCONFIGURED));
    await screen.findByRole("status");
    expect(screen.getByRole("searchbox", { name: "Search the registry" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Colour mode" })).toBeInTheDocument();
  });
});

describe("with a configuration that cannot be used", () => {
  it("distinguishes an unusable file from an absent one — the fixes differ", async () => {
    renderShell(app(INVALID));

    const notice = await screen.findByRole("status");
    expect(within(notice).getByText("The API configuration cannot be used")).toBeInTheDocument();
    expect(notice).toHaveTextContent("not an absolute http(s) URL");
    // "Write one" would send a deployer to create a file that already exists.
    expect(notice).not.toHaveTextContent("Create `config.json` containing");
  });
});

describe("with an API configured", () => {
  it("says nothing at all", async () => {
    const { container } = renderShell(app(CONFIGURED));
    await waitFor(() => {
      expect(container.querySelector("[role='status']")).toBeNull();
    });
    expect(screen.getByRole("heading", { name: "Page content" })).toBeInTheDocument();
  });

  it("does not flash a warning before it has looked", async () => {
    // "Loading" and "there is nothing" are different states, and collapsing them makes a correctly
    // configured deployment blame itself on every cold load.
    const never = vi.fn(() => new Promise<RuntimeConfigState>(() => {}));
    renderShell(
      <RuntimeConfigProvider load={never}>
        <AppShell>
          <h1>Page content</h1>
        </AppShell>
      </RuntimeConfigProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("accessibility of the degraded state", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(app(UNCONFIGURED), async ({ container }) => {
      await screen.findAllByRole("status");
      await expectNoA11yViolations(container);
    });
  });
});
