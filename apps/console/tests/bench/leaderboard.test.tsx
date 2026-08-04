// The leaderboard (ui#12; UC-G5; LUNAR-UX-006; ui.md §7 honesty rules 1 and 2).
//
// Every acceptance criterion in the issue has an assertion here, and four of them are the ones the
// leaderboard exists to get right rather than features it happens to have:
//
//   - a fixture-scored row is distinguishable from a simulated one WITHOUT opening anything;
//   - a null dispersion renders an open value, and a null value renders a dash;
//   - sorting by a metric puts nulls last in BOTH directions;
//   - unsorted keeps the server's order — the page never re-ranks.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Leaderboard } from "@/components/bench/Leaderboard";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { absent, board, fixtureRow, measured, row, unbounded } from "./fixtures";

const { api, use, server } = mockApi();

const AT = "/bench/leaderboard?scenario=lunar-polar-ice-v1";

/**
 * The scenario picker's own read, stubbed in every test so nothing goes un-stubbed.
 *
 * A handler value rather than a helper function that calls `use(...)`: `react-hooks/rules-of-hooks`
 * reads a bare `use(…)` inside a *named* function as React 19's `use` hook and rejects it. Inside
 * an anonymous `it` callback the rule does not fire, which is why this is the only place it bites.
 */
const SCENARIOS = api.benchListScenarios({ body: ["lunar-polar-ice-v1"] });

/** The data rows, header excluded. */
async function bodyRows(): Promise<HTMLElement[]> {
  const table = await screen.findByRole("table", { name: /Leaderboard for/ });
  const [, ...rest] = within(table).getAllByRole("row");
  return rest as HTMLElement[];
}

describe("the runner is in the row", () => {
  it("marks a fixture-scored entry without anything being opened", async () => {
    // The API's own schema states the requirement: "View **must** render it in the ranking row: a
    // fixture-scored entry has to look fixture-scored, not merely carry a footnote."
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board() }));
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    expect(within(rows[0]!).getByText("sim/1.4.0")).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Fixture · stand-in/)).toBeInTheDocument();
  });

  it("keeps labelling a fixture runner when the reference version moves", async () => {
    // Matched on the namespace, not on the exact constant. `runner === "fixture/0.1.0"` would stop
    // labelling the day the platform bumps REFERENCE_EPISODE_RUNNER_ID, and the failure mode is a
    // stand-in presented as a simulated result.
    use(SCENARIOS);
    use(
      api.benchLeaderboardScorecards({
        body: board({ rows: [fixtureRow({ runner: "fixture/0.9.0" })] }),
      }),
    );
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    expect(within(rows[0]!).getByText(/stand-in/)).toBeInTheDocument();
  });

  it("badges an entry whose integrity is flagged", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board({ rows: [row({ integrity: "flagged" })] }) }));
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    expect(within(rows[0]!).getByText("flagged")).toBeInTheDocument();
  });
});

describe("uncertainty renders as uncertainty", () => {
  it("renders a null dispersion as an open value, never a zero-length bound", async () => {
    // Honesty rule 2. `±0` asserts a precision nobody measured.
    use(SCENARIOS);
    use(
      api.benchLeaderboardScorecards({
        body: board({ rows: [row({ scores: [unbounded({ metric: "ice_yield" })] })] }),
      }),
    );
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    expect(within(rows[0]!).getByText("no bound")).toBeInTheDocument();
    expect(within(rows[0]!).queryByText(/±0\b/)).toBeNull();
  });

  it("renders a null value as a dash, never a fabricated zero", async () => {
    use(SCENARIOS);
    use(
      api.benchLeaderboardScorecards({
        body: board({ rows: [row({ scores: [absent({ metric: "ice_yield" })] })] }),
      }),
    );
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    const cell = within(rows[0]!).getByText("—");
    expect(cell).toHaveAttribute("data-metric-value", "absent");
  });

  it("shows a measured bound as a bound", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board({ rows: [row()] }) }));
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const rows = await bodyRows();
    expect(within(rows[0]!).getByText(/±6.2/)).toBeInTheDocument();
  });
});

describe("sorting", () => {
  const ranked = board({
    primary_metric: "ice_yield",
    rows: [
      row({ rank: 1, submission_id: "sha256:aaa", scores: [measured({ value: 300 })] }),
      row({ rank: 2, submission_id: "sha256:bbb", scores: [absent({ metric: "ice_yield" })] }),
      row({ rank: 3, submission_id: "sha256:ccc", scores: [measured({ value: 100 })] }),
    ],
  });

  const idsInOrder = async () =>
    (await bodyRows()).map((tr) => within(tr).getAllByRole("cell")[3]?.textContent ?? "");

  it("keeps the server's order until a reader asks for another", async () => {
    // The received order IS the ranking. Re-deriving it — even "sorted by rank" — would be this
    // page computing a ranking of its own, and a reader could not tell it from the real one.
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: ranked }));
    goTo(AT);
    renderWithApi(<Leaderboard />);

    const ids = await idsInOrder();
    expect(ids[0]).toContain("sha256:aaa");
    expect(ids[1]).toContain("sha256:bbb");
    expect(ids[2]).toContain("sha256:ccc");
  });

  it("puts nulls last descending", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: ranked }));
    goTo(AT);
    renderWithApi(<Leaderboard />);
    await bodyRows();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /ice_yield/ }));

    await waitFor(async () => {
      const ids = await idsInOrder();
      expect(ids[0]).toContain("sha256:aaa"); // 300
      expect(ids[1]).toContain("sha256:ccc"); // 100
      expect(ids[2]).toContain("sha256:bbb"); // null — last
    });
  });

  it("puts nulls last ascending too — an inapplicable metric is never 'best'", async () => {
    // The criterion in as many words. A comparator that treats null as a number sorts it to one
    // end, where it reads as best on one click and worst on the next; neither is true.
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: ranked }));
    goTo(AT);
    renderWithApi(<Leaderboard />);
    await bodyRows();

    const user = userEvent.setup();
    const header = screen.getByRole("button", { name: /ice_yield/ });
    await user.click(header);
    await user.click(header);

    await waitFor(async () => {
      const ids = await idsInOrder();
      expect(ids[0]).toContain("sha256:ccc"); // 100
      expect(ids[1]).toContain("sha256:aaa"); // 300
      expect(ids[2]).toContain("sha256:bbb"); // null — still last
    });
  });

  it("says an ordering is the reader's, not the ranking", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: ranked }));
    goTo(AT);
    renderWithApi(<Leaderboard />);
    await bodyRows();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /ice_yield/ }));

    expect(await screen.findByText(/this is your ordering, not the ranking/)).toBeInTheDocument();
  });

  it("returns to the authoritative order on a third click", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: ranked }));
    goTo(AT);
    renderWithApi(<Leaderboard />);
    await bodyRows();

    const user = userEvent.setup();
    const header = screen.getByRole("button", { name: /ice_yield/ });
    await user.click(header);
    await user.click(header);
    await user.click(header);

    await waitFor(async () => {
      const ids = await idsInOrder();
      expect(ids[1]).toContain("sha256:bbb");
    });
  });
});

describe("states", () => {
  it("says an empty board is empty, and names the command that would fill it", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board({ rows: [] }) }));
    goTo(AT);
    renderWithApi(<Leaderboard />);

    expect(
      await screen.findByText("Nothing has been ranked on this scenario yet"),
    ).toBeInTheDocument();
    expect(screen.getByText(/astro-mine bench submit --scenario/)).toBeInTheDocument();
  });

  it("is idle with no scenario in the address, rather than firing a request", async () => {
    use(SCENARIOS);
    goTo("/bench/leaderboard");
    renderWithApi(<Leaderboard />);

    expect(await screen.findByText("No scenario chosen")).toBeInTheDocument();
  });

  it("says why the board could not be read", async () => {
    use(SCENARIOS);
    use(
      api.benchLeaderboardScorecards({
        problem: { code: "content_not_found", detail: "no such scenario" },
      }),
    );
    goTo(AT);
    renderWithApi(<Leaderboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("no such scenario");
  });

  it("explains itself with no API configured", async () => {
    goTo(AT);
    renderWithApi(<Leaderboard />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("reads are account-free (CX-LOCAL)", () => {
  it("never prompts for a login and sends no credential", async () => {
    const seen: Request[] = [];
    server.events.on("request:start", ({ request }) => seen.push(request));

    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board() }));
    goTo(AT);
    renderWithApi(<Leaderboard />);
    await bodyRows();

    expect(seen.length).toBeGreaterThan(0);
    for (const request of seen) {
      expect(request.headers.get("authorization")).toBeNull();
      expect(request.credentials).toBe("omit");
    }
    expect(screen.queryByText(/sign in/i)).toBeNull();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(SCENARIOS);
    use(api.benchLeaderboardScorecards({ body: board() }));
    goTo(AT);

    await forEachColorScheme(withApi(<Leaderboard />), async ({ container }) => {
      await screen.findAllByRole("table", { name: /Leaderboard for/ });
      await expectNoA11yViolations(container);
    });
  });
});
