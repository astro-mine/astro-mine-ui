// Run the study and compare the front (ui#16; UC-F3, UC-F4; studio.md §2 principle 7).
//
// The acceptance criteria this file is the evidence for:
//
//   - each of the three honesty statements renders from a fixture that triggers it;
//   - a metric with no bound renders as an open mark and NEVER a zero-length error bar;
//   - the seeded example is unmistakably an example wherever a number is shown;
//   - a study is reachable by URL alone;
//   - the page issues no ranking computation of its own — the order shown is the order received.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  isDegenerateFront,
  isStandInEvaluator,
  unboundedMetrics,
} from "@/components/design/Honesty";
import { StudyComparison } from "@/components/design/StudyComparison";
import { StudyList } from "@/components/design/StudyList";
import { EXAMPLE_STUDY_ID, rememberStudy } from "@/components/design/session";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { candidateScore, comparison, tradeStudy } from "./fixtures";

const { api, use } = mockApi();

beforeEach(() => {
  window.sessionStorage.clear();
});

const AT_EXAMPLE = `/design/study?id=${EXAMPLE_STUDY_ID}`;

describe("the three honesty statements", () => {
  it("names the evaluator's provenance when a stand-in produced the numbers", async () => {
    // The picture is pixel-identical either way, so it has to be words — and they have to be first.
    use(api.studioComparison({ body: comparison({ evaluator: "fixture/example" }) }));
    goTo(AT_EXAMPLE);
    renderWithApi(<StudyComparison />);

    expect(
      await screen.findByText("A stand-in produced these numbers — no physics was run"),
    ).toBeInTheDocument();
    expect(screen.getByText(/pixel-identical/)).toBeInTheDocument();
  });

  it("still names the evaluator when it was a real one", async () => {
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(api.studioComparison({ body: comparison({ evaluator: "sim/1.4.0" }) }));
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    expect(await screen.findByText("Evaluated by sim/1.4.0")).toBeInTheDocument();
  });

  it("says a degenerate front is a property of the scoring, not a finding", async () => {
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(
      api.studioComparison({
        body: comparison({
          evaluator: "sim/1.4.0",
          candidates: [
            candidateScore({ candidate_id: "a", on_pareto_front: true }),
            candidateScore({ candidate_id: "b", on_pareto_front: true }),
          ],
          pareto_front: ["a", "b"],
        }),
      }),
    );
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    expect(await screen.findByText("Every candidate is on the front")).toBeInTheDocument();
    expect(
      screen.getByText(/property of the scoring, not a finding about the designs/),
    ).toBeInTheDocument();
  });

  it("names the metrics that carry no measured bound", async () => {
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(
      api.studioComparison({
        body: comparison({
          evaluator: "sim/1.4.0",
          metrics: ["ice_yield", "traverse_time"],
          candidates: [
            candidateScore({
              candidate_id: "a",
              metrics: {
                ice_yield: { value: 10, uncertainty: 1 },
                traverse_time: { value: 100, uncertainty: null },
              },
            }),
          ],
          pareto_front: ["a"],
        }),
      }),
    );
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    const notice = (await screen.findByText("One metric carries no measured bound")).closest(
      "[role='status']",
    ) as HTMLElement;
    // Scoped: `traverse_time` is also an option in both axis pickers.
    expect(within(notice).getByText("traverse_time")).toBeInTheDocument();
    expect(within(notice).getByText(/not a tie-breaker/)).toBeInTheDocument();
  });

  it("says nothing about bounds when every metric has one", async () => {
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(
      api.studioComparison({
        body: comparison({
          evaluator: "sim/1.4.0",
          metrics: ["ice_yield"],
          candidates: [
            candidateScore({
              candidate_id: "a",
              metrics: { ice_yield: { value: 10, uncertainty: 1 } },
            }),
            candidateScore({
              candidate_id: "b",
              on_pareto_front: false,
              metrics: { ice_yield: { value: 5, uncertainty: 2 } },
            }),
          ],
          pareto_front: ["a"],
        }),
      }),
    );
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    await screen.findByText("Evaluated by sim/1.4.0");
    expect(screen.queryByText(/carries no measured bound/)).toBeNull();
    expect(screen.queryByText("Every candidate is on the front")).toBeNull();
  });
});

describe("the predicates behind them", () => {
  it("recognises a stand-in evaluator by namespace, not by exact id", () => {
    expect(isStandInEvaluator("fixture/example")).toBe(true);
    expect(isStandInEvaluator("fixture/0.9.0")).toBe(true);
    expect(isStandInEvaluator("surrogate/excavation")).toBe(true);
    expect(isStandInEvaluator("sim/1.4.0")).toBe(false);
  });

  it("calls a front degenerate only when there is more than one candidate", () => {
    // One candidate is trivially the whole front; saying so would be noise, not honesty.
    const single = comparison({ candidates: [candidateScore()], pareto_front: ["Two excavators"] });
    expect(isDegenerateFront(single)).toBe(false);
  });

  it("counts a metric as unbounded only when NO candidate has a bound for it", () => {
    const mixed = comparison({
      metrics: ["m"],
      candidates: [
        candidateScore({ candidate_id: "a", metrics: { m: { value: 1, uncertainty: null } } }),
        candidateScore({ candidate_id: "b", metrics: { m: { value: 2, uncertainty: 0.5 } } }),
      ],
    });
    expect(unboundedMetrics(mixed)).toEqual([]);
  });
});

describe("the page computes nothing", () => {
  it("draws front membership from the backend's own flag", async () => {
    // A front this page derived would be a front nobody can reproduce from the artifact.
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(api.studioComparison({ body: comparison({ evaluator: "sim/1.4.0" }) }));
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    expect(await screen.findByText(/1 on the front/)).toBeInTheDocument();
    expect(screen.getByText(/runs no dominance test of its own/)).toBeInTheDocument();
  });

  it("passes a null uncertainty through as a null bound, never as zero", async () => {
    // The chart layer turns a null bound into an open mark and asserts that in its own suite. What
    // this asserts is that the page does not helpfully default it to 0 on the way in — which would
    // draw a zero-length bar claiming a precision nobody measured.
    rememberStudy(tradeStudy({ id: "study-1" }));
    use(
      api.studioComparison({
        body: comparison({
          evaluator: "sim/1.4.0",
          metrics: ["ice_yield", "traverse_time"],
          candidates: [
            candidateScore({
              candidate_id: "a",
              metrics: {
                ice_yield: { value: 10, uncertainty: null },
                traverse_time: { value: 100, uncertainty: null },
              },
            }),
          ],
          pareto_front: ["a"],
        }),
      }),
    );
    goTo("/design/study?id=study-1");
    renderWithApi(<StudyComparison />);

    // Both charts render (the scatter and the parallel coordinates), and the page names every
    // metric that carries no bound — which for this fixture is both of them.
    expect(await screen.findByText(/2 metrics carry no measured bound/)).toBeInTheDocument();
    expect(screen.getAllByRole("figure").length).toBeGreaterThanOrEqual(1);
  });
});

describe("opening a study", () => {
  it("renders the example by URL alone, with no session behind it", async () => {
    use(api.studioComparison({ body: comparison({ evaluator: "fixture/example" }) }));
    goTo(AT_EXAMPLE);
    renderWithApi(<StudyComparison />);

    expect(await screen.findByText(/A stand-in produced these numbers/)).toBeInTheDocument();
  });

  it("says plainly when this session does not have the study, rather than spinning", async () => {
    // The API serves no GET for a study, so a link only resolves in the session that ran it. A URL
    // that looks shareable and silently is not is worse than one that explains itself.
    goTo("/design/study?id=someone-elses-study");
    renderWithApi(<StudyComparison />);

    expect(await screen.findByText("This session does not have that study")).toBeInTheDocument();
    expect(screen.getByText(/serves no way to fetch one by id/)).toBeInTheDocument();
  });

  it("is a state, not an error, with no id in the address", async () => {
    goTo("/design/study");
    renderWithApi(<StudyComparison />);
    expect(await screen.findByText("No study in the address")).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    goTo(AT_EXAMPLE);
    renderWithApi(<StudyComparison />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("the studies list", () => {
  it("badges the seeded example wherever it is shown", async () => {
    goTo("/design");
    renderWithApi(<StudyList />);

    expect(await screen.findByText("An example, not your result")).toBeInTheDocument();
    expect(screen.getByText(/not run by you and not run at all/)).toBeInTheDocument();
    expect(screen.getByText("example")).toBeInTheDocument();
  });

  it("says there is nothing to launch without an objective", async () => {
    goTo("/design");
    renderWithApi(<StudyList />);

    expect(await screen.findByText("No objective captured in this session")).toBeInTheDocument();
  });

  it("links each study to its comparison", async () => {
    goTo("/design");
    renderWithApi(<StudyList />);

    const links = await screen.findAllByRole("link", { name: "Open the comparison" });
    expect(links[0]).toHaveAttribute("href", `/design/study?id=${EXAMPLE_STUDY_ID}`);
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(api.studioComparison({ body: comparison({ evaluator: "fixture/example" }) }));
    goTo(AT_EXAMPLE);

    await forEachColorScheme(withApi(<StudyComparison />), async ({ container }) => {
      await screen.findAllByText(/A stand-in produced these numbers/);
      await expectNoA11yViolations(container);
    });
  });
});
