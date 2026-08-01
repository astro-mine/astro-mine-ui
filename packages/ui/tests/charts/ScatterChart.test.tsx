// The Pareto trade-off scatter (ui#4; ui.md §7.1).
//
// Three properties, and each is an acceptance criterion rather than a nicety: a null bound is an
// open mark *per axis*, Pareto membership is legible without colour, and a point can be selected
// without a mouse.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { describePoint, ScatterChart } from "../../src/charts/ScatterChart.js";
import { expectNoA11yViolations } from "../a11y.js";
import { forEachColorScheme, renderInMode } from "../render.js";
import { PARETO } from "./fixtures.js";

const ready = { status: "ready", data: PARETO } as const;

const chart = (extra: Record<string, unknown> = {}) => (
  <ScatterChart
    state={ready}
    title="Yield against fleet mass"
    xLabel="Fleet mass"
    xUnit="kg"
    yLabel="Coverage"
    yUnit={null}
    {...extra}
  />
);

const marksFor = (container: HTMLElement, id: string) =>
  [...container.querySelectorAll(`[data-uncertainty-for="${id}"]`)].map((mark) => ({
    axis: mark.getAttribute("data-uncertainty-axis"),
    bound: mark.getAttribute("data-uncertainty-bound"),
  }));

describe("uncertainty, per axis", () => {
  it("marks x and y independently — a point can be measured on one and open on the other", async () => {
    // The reason a point carries two marks rather than one: `x` and `y` are different measurements.
    // A candidate with a well-characterised mass and an unbounded yield is the ordinary case, and
    // a chart that took a single "has uncertainty" flag would have to lie about one of them.
    await forEachColorScheme(chart(), ({ container }) => {
      expect(marksFor(container, "cand-01")).toEqual([
        { axis: "x", bound: "measured" },
        { axis: "y", bound: "measured" },
      ]);
      expect(marksFor(container, "cand-02")).toEqual([
        { axis: "x", bound: "measured" },
        { axis: "y", bound: "open" },
      ]);
      expect(marksFor(container, "cand-03")).toEqual([
        { axis: "x", bound: "open" },
        { axis: "y", bound: "measured" },
      ]);
      expect(marksFor(container, "cand-05")).toEqual([
        { axis: "x", bound: "open" },
        { axis: "y", bound: "open" },
      ]);
    });
  });

  it("draws the open mark open — dashed, and closed by nothing", () => {
    const { container } = renderInMode(chart(), "light");
    const open = container.querySelector(
      '[data-uncertainty-for="cand-05"][data-uncertainty-axis="y"]',
    );
    expect(open).toHaveAttribute("data-uncertainty-bound", "open");
    expect(open!.querySelector("line")).toHaveAttribute("stroke-dasharray");
    expect(open!.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("draws a measured bound of zero as a capped, zero-length interval", () => {
    const { container } = renderInMode(chart(), "light");
    const zero = container.querySelector(
      '[data-uncertainty-for="cand-04"][data-uncertainty-axis="y"]',
    );
    expect(zero).toHaveAttribute("data-uncertainty-bound", "measured");
    const [whisker, ...caps] = [...zero!.querySelectorAll("line")];
    expect(whisker.getAttribute("y1")).toBe(whisker.getAttribute("y2"));
    expect(caps).toHaveLength(2);
  });

  it("counts a point as open if either of its axes is, and says so", () => {
    renderInMode(chart(), "light");
    expect(
      screen.getByText(/3 of 5 points carry no measured uncertainty bound/),
    ).toBeInTheDocument();
  });
});

describe("Pareto membership", () => {
  it("is a shape, not only a colour", () => {
    // The acceptance criterion "Pareto membership distinguishable without relying on colour alone".
    // Two hues are one hue to a dichromat, and the front is the entire point of the plot — so
    // membership is carried by geometry: a filled circle on the front, a hollow square off it.
    const { container } = renderInMode(chart(), "light");

    const onFront = [...container.querySelectorAll('[data-pareto-front="on"]')];
    const offFront = [...container.querySelectorAll('[data-pareto-front="off"]')];
    expect(onFront).toHaveLength(2);
    expect(offFront).toHaveLength(3);

    for (const mark of onFront) {
      expect(mark.querySelector("circle")).not.toBeNull();
      expect(mark.querySelector("rect")).toBeNull();
    }
    for (const mark of offFront) {
      expect(mark.querySelector("rect")).not.toBeNull();
      expect(mark.querySelector("circle")).toBeNull();
    }
  });

  it("is stated in words too, per point", () => {
    expect(describePoint(PARETO[0], "kg", null)).toContain("on the Pareto front");
    expect(describePoint(PARETO[2], "kg", null)).toContain("not on the Pareto front");
  });

  it("colours the front from the theme rather than from a literal", () => {
    const { container } = renderInMode(chart(), "light");
    const front = container.querySelector('[data-pareto-front="on"] circle');
    expect(front).toHaveAttribute("fill", "var(--mui-palette-categorical-series1)");
  });
});

describe("the accessible description", () => {
  it("names the bound of each axis separately", () => {
    const description = describePoint(PARETO[1], "kg", null);
    expect(description).toContain("x: 1810 ± 60 kg");
    expect(description).toContain("y: 0.91, no measured uncertainty bound");
  });

  it("is what the chart publishes, and it covers every point", () => {
    renderInMode(chart(), "light");
    const figcaption = document.querySelector("figcaption")!;
    expect(figcaption).toHaveTextContent("Scatter plot of 5 points");
    expect(figcaption).toHaveTextContent("2 on the Pareto front");
    for (const point of PARETO) {
      expect(figcaption).toHaveTextContent(point.label);
    }
  });
});

describe("selection", () => {
  it("is reachable and operable by keyboard, through real buttons rather than the marks", async () => {
    // The marks live inside an `aria-hidden` SVG, so they cannot be the keyboard affordance. These
    // buttons are, they are hidden until focused, and they are what a screen-reader user operates.
    //
    // Tabbed to rather than focused directly, because "it is in the tab order" is the claim. The
    // loop is deliberately not a fixed count: MUI X's surface takes a tab stop of its own for its
    // internal navigation, and pinning the number here would make this test a description of the
    // chart library's internals rather than of our keyboard path.
    const onSelect = vi.fn();
    renderInMode(chart({ onSelect }), "light");

    const button = screen.getByRole("button", { name: describePoint(PARETO[0], "kg", null) });
    for (let step = 0; step < 8 && document.activeElement !== button; step += 1) {
      await userEvent.tab();
    }
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("cand-01");
  });

  it("selects on a click of the mark itself, for a reader holding a mouse", async () => {
    const onSelect = vi.fn();
    const { container } = renderInMode(chart({ onSelect }), "light");
    await userEvent.click(container.querySelector('[data-point-id="cand-03"]')!);
    expect(onSelect).toHaveBeenCalledWith("cand-03");
  });

  it("deselects when the selected point is chosen again", async () => {
    const onSelect = vi.fn();
    renderInMode(chart({ onSelect, selectedId: "cand-03" }), "light");
    await userEvent.click(
      screen.getByRole("button", { name: describePoint(PARETO[2], "kg", null) }),
    );
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("names the buttons so a voice-control user can say what they see", () => {
    renderInMode(chart({ onSelect: vi.fn() }), "light");
    const button = screen.getByRole("button", { name: describePoint(PARETO[0], "kg", null) });
    // WCAG 2.5.3: the accessible name must contain the visible label.
    expect(button).toHaveTextContent("Candidate 01");
    expect(button.getAttribute("aria-label")).toMatch(/^Candidate 01,/);
  });

  it("rings the selected mark instead of recolouring it", async () => {
    // Selection and Pareto membership must not compete for the same channel: recolouring the
    // selected mark would make it read as having changed sides.
    const { container } = renderInMode(
      chart({ onSelect: vi.fn(), selectedId: "cand-01" }),
      "light",
    );
    const mark = container.querySelector('[data-point-id="cand-01"]')!;
    expect(mark).toHaveAttribute("data-selected", "true");
    expect(mark.querySelectorAll("circle")).toHaveLength(2); // the ring, and the mark itself
    expect(mark).toHaveAttribute("data-pareto-front", "on");
    expect(container.querySelector('[data-point-id="cand-02"]')).not.toHaveAttribute(
      "data-selected",
    );
    await Promise.resolve();
  });

  it("offers no buttons at all when the chart is not selectable", () => {
    renderInMode(chart(), "light");
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});

describe("the request state", () => {
  it("treats a ready-but-zero-row result as empty", () => {
    const { container } = renderInMode(
      <ScatterChart
        state={{ status: "ready", data: [] }}
        title="Front"
        xLabel="Mass"
        xUnit="kg"
        yLabel="Coverage"
        yUnit={null}
      />,
      "light",
    );
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("accessibility", () => {
  it("has no axe violations, in either colour scheme", async () => {
    await forEachColorScheme(chart(), async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });

  it("has no axe violations when it is selectable either", async () => {
    await forEachColorScheme(chart({ onSelect: vi.fn() }), async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });
});
