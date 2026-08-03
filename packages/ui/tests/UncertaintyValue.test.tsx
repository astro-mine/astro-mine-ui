// THE HONESTY ASSERTION (ui#3; ui.md §7 rule 2, §7.1; plan §5.1).
//
// The first test in this file is the one named in the issue's acceptance criteria as the assertion
// that must never be deleted. `visx` gave the open-mark property *by construction* — the previous
// chart library could not express a zero-length bound. MUI X Charts can, so the guarantee has become
// an obligation, and this is where the obligation is kept.
//
// If a refactor makes this test inconvenient, the refactor is wrong.

import { describe, expect, it } from "vitest";

import { UncertaintyValue } from "../src/components/UncertaintyValue.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

describe("a null bound", () => {
  it("renders an open mark, never a zero-length error bar", () => {
    const { container, getByText } = renderInMode(
      <UncertaintyValue value={142.8} bound={null} unit="kg" />,
      "light",
    );

    // The mark itself: an svg, present in the DOM, standing where a bound would be.
    expect(container.querySelector("[data-uncertainty-bound='open'] svg")).not.toBeNull();
    // ...and said in words too, because a mark alone is a convention a first-time reader has not
    // learned yet.
    expect(getByText("no bound")).toBeInTheDocument();

    // The failure this exists to prevent, stated as the assertion it is: nowhere does the rendered
    // output claim a bound of zero.
    expect(container.textContent).not.toContain("±0");
    expect(container.textContent).not.toContain("±");
  });

  it("still renders the value at full strength — only the bound is unknown", () => {
    // Marking the value would misreport which part is uncertain. The measurement is as good as any
    // other; what is missing is knowledge of its spread.
    const { getByText } = renderInMode(
      <UncertaintyValue value={142.8} bound={undefined} unit="kg" />,
      "light",
    );
    expect(getByText("142.8 kg")).toBeInTheDocument();
  });

  it("treats undefined exactly as null — an omitted bound is a missing one", () => {
    const { container } = renderInMode(<UncertaintyValue value={1} unit="m" />, "light");
    expect(container.querySelector("[data-uncertainty-bound='open']")).not.toBeNull();
  });
});

describe("a measured bound", () => {
  it("renders as ±bound with the unit", () => {
    const { container, getByText } = renderInMode(
      <UncertaintyValue value={142.8} bound={3.1} unit="kg" />,
      "light",
    );
    expect(getByText("±3.1 kg")).toBeInTheDocument();
    expect(container.querySelector("[data-uncertainty-bound='measured']")).not.toBeNull();
  });

  it("distinguishes a MEASURED zero from a missing bound", () => {
    // The converse of the honesty rule, and just as load-bearing. `bound={0}` is a real result — a
    // quantity that did not vary across seeds — and rendering it as "no bound" would discard a
    // finding. Only null/undefined is unknown.
    const { container, getByText } = renderInMode(
      <UncertaintyValue value={5} bound={0} unit="m" />,
      "light",
    );
    expect(getByText("±0 m")).toBeInTheDocument();
    expect(container.querySelector("[data-uncertainty-bound='measured']")).not.toBeNull();
    expect(container.querySelector("[data-uncertainty-bound='open']")).toBeNull();
  });

  it("renders numbers as given, without reformatting them", () => {
    // A design system that quietly rounds is one that can quietly change what a number says.
    const { getByText } = renderInMode(
      <UncertaintyValue value={0.000123} bound={0.0000456} unit={null} />,
      "light",
    );
    expect(getByText("0.000123")).toBeInTheDocument();
    expect(getByText("±0.0000456")).toBeInTheDocument();
  });
});

describe("units", () => {
  it("omits the unit only when the caller explicitly says the value is dimensionless", () => {
    // `unit` is a required prop precisely so this is a decision rather than an omission — a value
    // with no unit is a bug upstream (conventions.md §5), and an optional prop would let that bug
    // arrive here as a forgotten argument.
    const { getByText } = renderInMode(
      <UncertaintyValue value={0.82} bound={0.04} unit={null} />,
      "light",
    );
    expect(getByText("0.82")).toBeInTheDocument();
    expect(getByText("±0.04")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, bounded and unbounded", async () => {
    await forEachColorScheme(
      <UncertaintyValue value={1} bound={0.2} unit="kg" />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
    await forEachColorScheme(
      <UncertaintyValue value={1} bound={null} unit="kg" />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
