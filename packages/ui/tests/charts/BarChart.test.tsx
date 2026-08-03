// The leaderboard's primary-metric view (ui#4; ui.md §7.1).
//
// The first assertion in this file is *the* acceptance criterion of the issue: "a null bound renders
// as an open mark, asserted by a unit test on every chart that takes one." Everything else here is
// scaffolding around keeping that true.

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarChart, describeBars, niceBound, valueDomain } from "../../src/charts/BarChart.js";
import { PALETTES } from "../../src/theme.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../../src/testing.js";
import { LEADERBOARD } from "./fixtures.js";

const ready = { status: "ready", data: LEADERBOARD } as const;

const marks = (container: HTMLElement, state: "open" | "measured") => [
  ...container.querySelectorAll(`[data-uncertainty-bound="${state}"]`),
];

describe("uncertainty", () => {
  it("draws an OPEN mark for a null bound and for an absent one — never a zero-length tick", async () => {
    // The fixture carries `"bound": null` on one row and no `bound` key at all on another. They mean
    // the same thing — nobody measured — and a chart that treated `undefined` as anything else
    // would be wrong for every caller who built its rows from an optional field.
    await forEachColorScheme(
      <BarChart state={ready} title="Water-ice yield" unit="kg/sol" />,
      ({ container }) => {
        const open = marks(container, "open");
        expect(open).toHaveLength(2);
        expect(open.map((mark) => mark.getAttribute("data-uncertainty-for")).sort()).toEqual([
          "haworth",
          "shoemaker",
        ]);

        for (const mark of open) {
          // An open mark is dashed and terminates in outward chevrons. Nothing closes it, because
          // nothing is known to close it — a cap would say the interval stops there.
          expect(mark.querySelector("line")).toHaveAttribute("stroke-dasharray");
          expect(mark.querySelectorAll("polyline")).toHaveLength(2);
          expect(mark.querySelectorAll("line")).toHaveLength(1);
        }
      },
    );
  });

  it("draws a MEASURED bound of exactly zero as a real, zero-length interval", () => {
    // The counterpart, and the reason `boundState` exists rather than a truthiness test: `0` is a
    // result — a quantity that did not vary across seeds — and collapsing it into "unmeasured"
    // destroys the distinction in the other direction.
    const { container } = renderInMode(
      <BarChart state={ready} title="Water-ice yield" unit="kg/sol" />,
      "light",
    );
    const zero = container.querySelector('[data-uncertainty-for="de-gerlache"]');
    expect(zero).toHaveAttribute("data-uncertainty-bound", "measured");

    const [whisker, ...caps] = [...zero!.querySelectorAll("line")];
    expect(whisker.getAttribute("y1")).toBe(whisker.getAttribute("y2"));
    // Still capped: the marks say "measured, and it did not move", which is what happened.
    expect(caps).toHaveLength(2);
    expect(whisker).not.toHaveAttribute("stroke-dasharray");
  });

  it("gives every bar a mark, so no bar is silently unannotated", () => {
    const { container } = renderInMode(
      <BarChart state={ready} title="Water-ice yield" unit="kg/sol" />,
      "light",
    );
    expect(marks(container, "open").length + marks(container, "measured").length).toBe(
      LEADERBOARD.length,
    );
  });

  it("discloses the unmeasured bounds in a caption, in the reader's words", () => {
    renderInMode(<BarChart state={ready} title="Water-ice yield" unit="kg/sol" />, "light");
    expect(
      screen.getByText(/2 of 5 points carry no measured uncertainty bound/),
    ).toBeInTheDocument();
    expect(screen.getByText(/never measured, not measured as zero/)).toBeInTheDocument();
  });
});

describe("the accessible description", () => {
  it("says which values have no bound, rather than reading the numbers alone", () => {
    // MUI X hides the SVG from assistive technology and exposes `desc` as the chart's description,
    // so this string is the *entire* chart for a screen-reader user. If it listed only the numbers
    // it would hand them the false precision the marks refuse to draw.
    const description = describeBars("Water-ice yield", "kg/sol", LEADERBOARD);
    expect(description).toContain("haworth: 96.5 kg/sol, no measured uncertainty bound");
    expect(description).toContain("shackleton-rim: 142.8 ± 6.4 kg/sol");
    expect(description).toContain("de-gerlache: 118.2 ± 0 kg/sol");
    expect(description).not.toMatch(/haworth: 96\.5 ± /);
  });

  it("is what the chart actually publishes", () => {
    renderInMode(<BarChart state={ready} title="Water-ice yield" unit="kg/sol" />, "light");
    expect(
      screen.getByText(describeBars("Water-ice yield", "kg/sol", LEADERBOARD)),
    ).toBeInTheDocument();
  });

  it("writes a dimensionless quantity without a unit rather than inventing one", () => {
    expect(describeBars("Coverage", null, [{ label: "a", value: 0.8, bound: 0.1 }])).toContain(
      "a: 0.8 ± 0.1.",
    );
  });
});

describe("the value axis", () => {
  it("holds every interval, so no error bar is clipped into a shorter one", () => {
    const domain = valueDomain(LEADERBOARD);
    expect(domain.max).toBeGreaterThanOrEqual(142.8 + 6.4);
    // A bar is read against zero; starting the axis elsewhere turns a small difference into a big
    // one, which is a different way to mislead with the same data.
    expect(domain.min).toBe(0);
  });

  it("keeps zero in the domain even when every value is negative", () => {
    const domain = valueDomain([{ label: "a", value: -40, bound: 5 }]);
    expect(domain.max).toBe(0);
    expect(domain.min).toBeLessThanOrEqual(-45);
  });

  it("rounds away from zero", () => {
    expect(niceBound(142.8)).toBe(200);
    expect(niceBound(0)).toBe(0);
    expect(niceBound(-42)).toBe(-50);
  });
});

describe("colour", () => {
  it("paints the bars from the theme's categorical palette, not from a literal", () => {
    // The bars must re-theme with the mode and be visible to the contrast and separation gates.
    // A CSS variable is what makes both true; a hex here would make neither.
    const { container } = renderInMode(
      <BarChart state={ready} title="Water-ice yield" unit="kg/sol" series="series3" />,
      "light",
    );
    const bar = container.querySelector(".MuiBarChart-element");
    expect(bar).toHaveAttribute("fill", "var(--mui-palette-categorical-series3)");
    // And the variable names a colour the theme really declares.
    expect(PALETTES.light.categorical.series3).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the request state", () => {
  it("renders the one empty discipline when the request returned nothing", () => {
    renderInMode(<BarChart state={{ status: "empty" }} title="Yield" unit="kg/sol" />, "light");
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("treats a ready-but-zero-row result as empty, not as a chart with no marks", () => {
    // Axes with nothing on them are the blank pane `AsyncState` exists to prevent: a reader cannot
    // tell "nothing scored" from "still loading" from "the request failed".
    const { container } = renderInMode(
      <BarChart state={{ status: "ready", data: [] }} title="Yield" unit="kg/sol" />,
      "light",
    );
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("announces loading by name rather than spinning anonymously", () => {
    renderInMode(<BarChart state={{ status: "loading" }} title="Yield" unit="kg/sol" />, "light");
    expect(screen.getByRole("status")).toHaveTextContent("Loading Yield…");
  });

  it("shows the words the request produced when it failed", () => {
    renderInMode(
      <BarChart state={{ status: "error", error: "502 from bench" }} title="Yield" unit={null} />,
      "light",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("502 from bench");
  });
});

describe("accessibility", () => {
  it("has no axe violations, in either colour scheme", async () => {
    await forEachColorScheme(
      <BarChart state={ready} title="Water-ice yield" unit="kg/sol" />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
