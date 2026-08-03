// One entry's scorecard (ui#12; ui.md §7 honesty rule 5).
//
// The criterion this file exists for is an *ordering*: the runner and the integrity verdict are read
// **before** the numbers. A fixture-scored 0.83 and a simulated 0.83 are the same three characters
// and different claims, and a reader who meets the number first has already formed a view.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Scorecard } from "@/components/bench/Scorecard";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { submission } from "./fixtures";

const { api, use, server } = mockApi();

const AT =
  "/bench/submission?id=sha256:1111111111111111111111111111111111111111111111111111111111111111";

describe("reachable by URL alone", () => {
  it("renders from a cold load with only the query string", async () => {
    use(api.benchGetSubmission({ body: submission() }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    expect(await screen.findByRole("heading", { name: "Identity" })).toBeInTheDocument();
  });

  it("asks for the submission in the address", async () => {
    const seen: string[] = [];
    server.events.on("request:start", ({ request }) => seen.push(new URL(request.url).pathname));

    use(api.benchGetSubmission({ body: submission() }));
    goTo(AT);
    renderWithApi(<Scorecard />);
    await screen.findByRole("heading", { name: "Identity" });

    expect(seen[0]).toContain("/bench/submissions/sha256");
  });

  it("is a state, not an error, with no id in the address", async () => {
    // Nothing stubbed: a request here would fail the test.
    goTo("/bench/submission");
    renderWithApi(<Scorecard />);

    expect(await screen.findByText("No submission in the address")).toBeInTheDocument();
  });
});

describe("provenance before interpretation", () => {
  it("banners a stand-in above the scores", async () => {
    use(api.benchGetSubmission({ body: submission({ runner: "fixture/0.1.0" }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    const banner = await screen.findByText("These numbers came from a stand-in, not a simulation");
    expect(banner).toBeInTheDocument();

    // The ordering IS the assertion: the banner precedes the scores table in document order.
    const scores = screen.getByRole("table", { name: /Every metric/ });
    expect(banner.compareDocumentPosition(scores) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says a stand-in measured nothing physical", async () => {
    use(api.benchGetSubmission({ body: submission({ runner: "fixture/0.1.0" }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    expect(await screen.findByText(/never executed the simulator/)).toBeInTheDocument();
    expect(screen.getByText(/measure nothing physical/)).toBeInTheDocument();
  });

  it("says nothing of the sort for a simulated run", async () => {
    use(api.benchGetSubmission({ body: submission({ runner: "sim/1.4.0" }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);
    await screen.findByRole("heading", { name: "Identity" });

    expect(screen.queryByText(/came from a stand-in/)).toBeNull();
  });

  it("banners a flagged entry and says what flagged means", async () => {
    use(api.benchGetSubmission({ body: submission({ integrity: "flagged" }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    expect(await screen.findByText("This entry is flagged")).toBeInTheDocument();
    expect(screen.getByText(/did not reproduce its recorded result/)).toBeInTheDocument();
  });
});

describe("the scorecard", () => {
  it("shows every metric with its aggregation, seed count and direction", async () => {
    use(api.benchGetSubmission({ body: submission() }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    const table = await screen.findByRole("table", { name: /Every metric/ });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);

    const first = within(rows[0]!);
    expect(first.getByText("ice_yield")).toBeInTheDocument();
    expect(first.getByText("median")).toBeInTheDocument();
    expect(first.getByText("9")).toBeInTheDocument();
    expect(first.getByText("higher is better")).toBeInTheDocument();
  });

  it("renders the three value cases distinctly", async () => {
    use(api.benchGetSubmission({ body: submission() }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    const table = await screen.findByRole("table", { name: /Every metric/ });
    // measured → a bound; unbounded → an open mark; absent → a dash.
    expect(within(table).getByText(/±6.2/)).toBeInTheDocument();
    expect(within(table).getByText("no bound")).toBeInTheDocument();
    expect(within(table).getByText("—")).toHaveAttribute("data-metric-value", "absent");
  });

  it("renders the submission id as the digest it is", async () => {
    const id = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
    use(api.benchGetSubmission({ body: submission({ submission_id: id }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    expect(await screen.findByText(id)).toBeInTheDocument();
  });

  it("says so honestly when a submission carries no scores", async () => {
    use(api.benchGetSubmission({ body: submission({ scores: [] }) }));
    goTo(AT);
    renderWithApi(<Scorecard />);

    expect(await screen.findByText("This submission carries no scores")).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    goTo(AT);
    renderWithApi(<Scorecard />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, stand-in and flagged alike", async () => {
    use(
      api.benchGetSubmission({
        body: submission({ runner: "fixture/0.1.0", integrity: "flagged" }),
      }),
    );
    goTo(AT);

    await forEachColorScheme(withApi(<Scorecard />), async ({ container }) => {
      await screen.findAllByRole("heading", { name: "Identity" });
      await expectNoA11yViolations(container);
    });
  });
});
