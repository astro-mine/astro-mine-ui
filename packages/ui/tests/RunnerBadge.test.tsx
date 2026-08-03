// A stand-in must never look like the real thing — in the row (ui#3; ui.md §7 rules 1 and 5).

import { describe, expect, it } from "vitest";

import { RunnerBadge } from "../src/components/RunnerBadge.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

describe("a stand-in", () => {
  it("is labelled in the row itself, not in a footnote", () => {
    const { getByText } = renderInMode(<RunnerBadge runner="reference-fixture" standIn />, "light");
    // Visible, in place, and unmissable — a reader scanning the column sees it without opening
    // anything.
    expect(getByText("reference-fixture · stand-in")).toBeInTheDocument();
  });

  it("restates the whole claim in its accessible name", () => {
    // A chip in a dense table is routinely read out of context. The visible label carries
    // "stand-in", but heard on its own it needs to say what that means.
    const { getByLabelText } = renderInMode(
      <RunnerBadge runner="reference-fixture" standIn />,
      "light",
    );
    expect(
      getByLabelText(
        "Scored by reference-fixture — a deterministic stand-in, not a simulation run.",
      ),
    ).toBeInTheDocument();
  });

  it("is visually distinct from a real runner, not merely differently worded", () => {
    const standIn = renderInMode(<RunnerBadge runner="fixture" standIn />, "light");
    const real = renderInMode(<RunnerBadge runner="sim-0.5.0" standIn={false} />, "light");

    // Filled and coloured versus quiet and outlined. The case that must not be missed gets the
    // weight; two chips that differ only in their text would not survive a glance.
    expect(standIn.container.querySelector(".MuiChip-root")?.className).toMatch(/filled/i);
    expect(real.container.querySelector(".MuiChip-root")?.className).toMatch(/outlined/i);
  });
});

describe("a real runner", () => {
  it("carries its id honestly, so the two are told apart by provenance and not by value", () => {
    const { getByText, getByLabelText } = renderInMode(
      <RunnerBadge runner="sim-0.5.0" standIn={false} />,
      "light",
    );
    expect(getByText("sim-0.5.0")).toBeInTheDocument();
    expect(getByLabelText("Scored by runner sim-0.5.0.")).toBeInTheDocument();
  });

  it("says nothing about standing in", () => {
    const { container } = renderInMode(<RunnerBadge runner="sim-0.5.0" standIn={false} />, "light");
    expect(container.textContent).not.toContain("stand-in");
  });
});

describe("the honest answer is required, never inferred", () => {
  it("takes `standIn` from the caller rather than pattern-matching the runner id", () => {
    // This package is a leaf and knows nothing of the platform's runner-id conventions. A design
    // system that matched on the substring "fixture" would silently stop labelling the day a runner
    // was renamed — so a runner *called* fixture-something is still whatever the caller says it is.
    const { container } = renderInMode(
      <RunnerBadge runner="fixture-lookalike" standIn={false} />,
      "light",
    );
    expect(container.textContent).not.toContain("stand-in");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, both kinds", async () => {
    await forEachColorScheme(<RunnerBadge runner="fixture" standIn />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
    await forEachColorScheme(
      <RunnerBadge runner="sim-0.5.0" standIn={false} detail="Seeds 0–31." />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
