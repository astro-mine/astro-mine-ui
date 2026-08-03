// The shell (ui#5; ui.md §5, §7 rules 3 and 7).
//
// Every acceptance criterion in this file is one that a screenshot cannot check. Focus does not
// appear in a screenshot; an announcement has no pixels; and "the nav entry stays" is a statement
// about what happens in the state nobody sets up by hand.

import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/shell/AppShell";
import { NAV_ENTRIES } from "@/shell/navigation";

import { expectNoA11yViolations, forEachColorScheme, renderLight } from "@astro-mine/ui/testing";
import { goTo, router } from "./router";

function Page({ children = "Page content" }: { children?: string }) {
  return <h1>{children}</h1>;
}

const shell = (children = <Page />) => <AppShell>{children}</AppShell>;

describe("the frame", () => {
  it("renders the landmarks a reader navigates by", async () => {
    renderLight(shell());
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("names the sections landmark exactly once", async () => {
    // Two drawers hold the same list, and only one of them is ever on screen. Two landmarks with
    // the same name would be two "Sections" in a landmark list, one of which goes nowhere.
    renderLight(shell());
    expect(screen.getAllByRole("navigation", { name: "Sections" })).toHaveLength(1);
  });

  it("mounts the page it was given", () => {
    renderLight(shell(<Page>The leaderboard</Page>));
    expect(screen.getByRole("heading", { name: "The leaderboard" })).toBeInTheDocument();
  });

  it("puts every destination in the sidebar", () => {
    renderLight(shell());
    const nav = screen.getByRole("navigation", { name: "Sections" });
    for (const entry of NAV_ENTRIES) {
      expect(
        within(nav).getByRole("link", { name: new RegExp(`^${entry.label}$`) }),
        `${entry.href} is missing from the sidebar`,
      ).toHaveAttribute("href", entry.href);
    }
  });
});

describe("the active entry", () => {
  it("marks exactly one entry as the current page", async () => {
    goTo("/registry/artifact");
    renderLight(shell());
    const current = screen.getAllByRole("link", { current: "page" });
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/registry/artifact");
  });

  it("does not mark the section index alongside its child", async () => {
    // The bug the retired shell shipped, asserted where a reader would meet it rather than only in
    // the resolver's own unit test.
    goTo("/registry/artifact");
    renderLight(shell());
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getByRole("link", { name: "Browse" })).not.toHaveAttribute("aria-current");
  });
});

describe("navigation moves focus and says so", () => {
  it("focuses the content region and announces the new title", async () => {
    goTo("/");
    const { rerender } = renderLight(shell());
    const main = screen.getByRole("main");

    // On first load, focus belongs at the top of the document, where the skip link is — moving it
    // into the content would jump straight past the link whose whole job is to make that jump.
    expect(main).not.toHaveFocus();

    goTo("/bench/leaderboard");
    await act(async () => {
      rerender(shell());
    });

    expect(main).toHaveFocus();
    await waitFor(() => {
      expect(screen.getByText("Leaderboard", { selector: "[aria-live]" })).toBeInTheDocument();
    });
  });

  it("re-announces when the route changes again", async () => {
    goTo("/bench/leaderboard");
    const { rerender } = renderLight(shell());

    goTo("/design/new");
    await act(async () => {
      rerender(shell());
    });

    const live = document.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("New study");
  });

  it("announces politely and atomically, so a partial title is never read", () => {
    renderLight(shell());
    const live = document.querySelector("[aria-live]");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
  });
});

describe("the keyboard", () => {
  it("reaches the skip link first, and it targets the content region", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.tab();
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", `#${screen.getByRole("main").id}`);
  });

  it("jumps to a destination on its chord", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.keyboard("gl");
    expect(router.push).toHaveBeenCalledWith("/bench/leaderboard");
  });

  it("does nothing for a chord that is not one", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.keyboard("gz");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("does not fire while the reader is typing", async () => {
    // The failure mode a bare keydown listener has by default: a shortcut that eats a keystroke
    // from a text field is worse than no shortcut.
    const user = userEvent.setup();
    renderLight(shell());

    await user.click(screen.getByRole("searchbox", { name: "Search the registry" }));
    await user.keyboard("gl");

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox", { name: "Search the registry" })).toHaveValue("gl");
  });

  it("leaves modified keystrokes to the browser and to assistive technology", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.keyboard("{Control>}g{/Control}l");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("focuses search on `/`", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.keyboard("/");
    expect(screen.getByRole("searchbox", { name: "Search the registry" })).toHaveFocus();
  });

  it("advertises a chord where the control is, not inside its name", async () => {
    renderLight(shell());
    const leaderboard = screen.getByRole("link", { name: "Leaderboard" });
    // Glued into the label, the accessible name would read "Leaderboard g l".
    expect(leaderboard).toHaveAttribute("aria-keyshortcuts", "g l");
  });

  it("reaches every destination with the keyboard alone", async () => {
    const user = userEvent.setup();
    renderLight(shell());
    const nav = screen.getByRole("navigation", { name: "Sections" });

    const reached = new Set<string>();
    // A bounded walk: enough tab stops to cross the whole sidebar, and a stop condition that does
    // not depend on knowing the exact number of controls in the chrome.
    for (let i = 0; i < 60 && reached.size < NAV_ENTRIES.length; i += 1) {
      await user.tab();
      const focused = document.activeElement;
      if (focused instanceof HTMLAnchorElement && nav.contains(focused)) {
        reached.add(focused.getAttribute("href") ?? "");
      }
    }

    for (const entry of NAV_ENTRIES) {
      expect(reached, `${entry.href} was never reached by Tab`).toContain(entry.href);
    }
  });
});

describe("the sidebar", () => {
  it("collapses a group and restores it", async () => {
    const user = userEvent.setup();
    renderLight(shell());
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const benchmark = within(nav).getByRole("button", { name: "Benchmark" });

    expect(benchmark).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: "Leaderboard" })).toBeInTheDocument();

    await user.click(benchmark);
    expect(benchmark).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => {
      expect(within(nav).queryByRole("link", { name: "Leaderboard" })).not.toBeInTheDocument();
    });

    await user.click(benchmark);
    expect(benchmark).toHaveAttribute("aria-expanded", "true");
  });

  it("points its disclosure at the list it controls", async () => {
    renderLight(shell());
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const benchmark = within(nav).getByRole("button", { name: "Benchmark" });
    const listId = benchmark.getAttribute("aria-controls");
    expect(listId).toBeTruthy();
    expect(document.getElementById(listId!)).toBeInTheDocument();
  });
});

describe("the responsive drawer", () => {
  it("opens from the top bar and stays operable", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    // At rest only the permanent drawer is mounted, which is what keeps one copy of every link in
    // the DOM. Opening the temporary one is what a reader below the breakpoint does.
    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const dialog = await screen.findByRole("presentation");
    const drawer = within(dialog);
    expect(drawer.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/bench/leaderboard",
    );
    expect(drawer.getByRole("button", { name: "Benchmark" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes itself when a destination is followed", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("presentation");
    await user.click(within(dialog).getByRole("link", { name: "Audit" }));

    await waitFor(() => {
      expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    });
  });
});

describe("global search", () => {
  it("routes to the registry with the query in the address", async () => {
    // The entry point, not the results: search over the catalog is ui#10's, and routing there with
    // the query in the URL is what stops this box becoming a second implementation of it.
    const user = userEvent.setup();
    renderLight(shell());

    await user.type(screen.getByRole("searchbox", { name: "Search the registry" }), "shackleton");
    await user.keyboard("{Enter}");

    expect(router.push).toHaveBeenCalledWith("/registry?q=shackleton");
  });

  it("does nothing on an empty query", async () => {
    const user = userEvent.setup();
    renderLight(shell());

    await user.click(screen.getByRole("searchbox", { name: "Search the registry" }));
    await user.keyboard("   {Enter}");

    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(shell(), async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });

  it("is axe-clean with the navigation drawer open", async () => {
    const user = userEvent.setup();
    renderLight(shell());
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await screen.findByRole("presentation");
    // The drawer is a portal, so it is not inside the render container — the whole document is the
    // subject once something is mounted outside the tree.
    await expectNoA11yViolations(document.body);
  });
});
