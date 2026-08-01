// Parallel coordinates (ui#4; ui.md §7.1).
//
// The hand-built chart, and the only one with no MUI X plot underneath it. Its honesty rule is a
// different one from the other two: it takes no uncertainty bound at all (a polyline over six axes
// has nowhere to put six intervals a reader could follow), so what it must never do is quietly drop
// a candidate it cannot draw. An exclusion nobody is told about is a lie by omission.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  axisExtent,
  drawableRows,
  exclusionCaption,
  ParallelCoordinates,
} from "../../src/charts/ParallelCoordinates.js";
import { expectNoA11yViolations } from "../a11y.js";
import { forEachColorScheme, renderInMode } from "../render.js";
import { COMPARISON_AXES, COMPARISON_ROWS } from "./fixtures.js";

const ready = { status: "ready", data: COMPARISON_ROWS } as const;

const chart = (extra: Record<string, unknown> = {}) => (
  <ParallelCoordinates
    state={ready}
    title="Candidate comparison"
    axes={COMPARISON_AXES}
    {...extra}
  />
);

describe("a candidate it cannot draw", () => {
  it("is excluded rather than imputed", () => {
    // The fixture's last candidate scored two of the four metrics. Threading its line through a
    // zero — or through a mean, or through anything — would draw a design that was never evaluated,
    // and it would sit on the plot looking exactly as real as the four that were.
    const drawable = drawableRows(COMPARISON_ROWS, COMPARISON_AXES);
    expect(drawable.map((row) => row.id)).toEqual(["cand-01", "cand-02", "cand-03", "cand-04"]);
  });

  it("is counted and explained, not silently dropped", () => {
    renderInMode(chart(), "light");
    expect(screen.getByText(/1 of 5 candidates is not drawn/)).toBeInTheDocument();
    expect(screen.getByText(/would show a design that was never evaluated/)).toBeInTheDocument();
  });

  it("says nothing when there is nothing to disclose", () => {
    expect(exclusionCaption(4, 4)).toBeNull();
    expect(exclusionCaption(4, 5)).toMatch(/^1 of 5 candidates is not drawn/);
    expect(exclusionCaption(3, 5)).toMatch(/^2 of 5 candidates are not drawn/);
  });

  it("draws one polyline per drawable candidate and no more", async () => {
    await forEachColorScheme(chart(), ({ container }) => {
      expect(container.querySelectorAll("polyline")).toHaveLength(4);
      expect(container.querySelector('[data-row-id="cand-05"]')).toBeNull();
    });
  });
});

describe("the axes", () => {
  it("are independently scaled — this is not a chart with four y-axes", () => {
    // Each axis spans its own metric's range. That is what makes parallel coordinates legitimate
    // where a second y-axis is not: no two axes share a scale, so no reader can be induced to read
    // one series against another's units (ui.md §7.1).
    const drawable = drawableRows(COMPARISON_ROWS, COMPARISON_AXES);
    expect(axisExtent(drawable, COMPARISON_AXES[0])).toEqual({ min: 88.1, max: 142.8 });
    expect(axisExtent(drawable, COMPARISON_AXES[1])).toEqual({ min: 980, max: 1810 });
  });

  it("keeps a degenerate axis visible rather than collapsing it to a line", () => {
    // Every candidate scoring the same is a real, interesting outcome — and a zero-height axis
    // would hide it behind a rendering artifact.
    const flat = [
      { id: "a", label: "A", onFront: true, values: { m: 3 } },
      { id: "b", label: "B", onFront: false, values: { m: 3 } },
    ];
    expect(axisExtent(flat, { key: "m", label: "M", unit: null })).toEqual({ min: 2.5, max: 3.5 });
  });

  it("writes every unit out, and says so when there is none", () => {
    const { container } = renderInMode(chart(), "light");
    const text = container.textContent ?? "";
    expect(text).toContain("kg/sol");
    expect(text).toContain("kW·h/kg");
    // conventions.md §5: a value with no unit is a bug upstream, so a genuinely dimensionless axis
    // says the word rather than leaving a reader to assume one.
    expect(text).toContain("dimensionless");
  });
});

describe("Pareto membership", () => {
  it("is a dash pattern and a stroke width, not only a colour", () => {
    const { container } = renderInMode(chart(), "light");
    const onFront = container.querySelectorAll('[data-pareto-front="on"] polyline');
    const offFront = container.querySelectorAll('[data-pareto-front="off"] polyline');
    expect(onFront).toHaveLength(2);
    expect(offFront).toHaveLength(2);

    for (const line of onFront) expect(line).not.toHaveAttribute("stroke-dasharray");
    for (const line of offFront) expect(line).toHaveAttribute("stroke-dasharray");
  });
});

describe("the accessible description", () => {
  it("describes only what is drawn, and names every axis with its unit", () => {
    renderInMode(chart(), "light");
    const figcaption = document.querySelector("figcaption")!;
    expect(figcaption).toHaveTextContent("Parallel coordinates over 4 axes");
    expect(figcaption).toHaveTextContent("Water-ice yield in kg/sol");
    expect(figcaption).toHaveTextContent("4 candidates drawn");
    // The excluded candidate is disclosed in the caption, not described as if it were plotted.
    expect(figcaption).toHaveTextContent("1 of 5 candidates is not drawn");
    expect(figcaption.textContent).not.toContain("Candidate 05:");
  });
});

describe("selection", () => {
  it("is offered through the same keyboard path as the scatter", async () => {
    const onSelect = vi.fn();
    renderInMode(chart({ onSelect }), "light");

    const button = screen.getByRole("button", { name: "Candidate 01, on the Pareto front" });
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("cand-01");

    // Only the drawable candidates are selectable: offering the excluded one would be offering to
    // select something that is not on the chart.
    expect(screen.queryByRole("button", { name: /Candidate 05/ })).toBeNull();
  });

  it("thickens the selected line rather than recolouring it", () => {
    const { container } = renderInMode(
      chart({ onSelect: vi.fn(), selectedId: "cand-03" }),
      "light",
    );
    const selected = container.querySelector('[data-row-id="cand-03"]');
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(selected!.querySelector("polyline")).toHaveAttribute("stroke-width", "3");
    // Still off the front, and still saying so.
    expect(selected).toHaveAttribute("data-pareto-front", "off");
  });

  it("offers no buttons at all when the chart is not selectable", () => {
    renderInMode(chart(), "light");
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});

describe("the request state", () => {
  it("treats a ready-but-zero-row result as empty", () => {
    const { container } = renderInMode(
      <ParallelCoordinates
        state={{ status: "ready", data: [] }}
        title="Comparison"
        axes={COMPARISON_AXES}
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
