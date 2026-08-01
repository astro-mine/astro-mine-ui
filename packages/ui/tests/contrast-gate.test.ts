// PROOF THAT THE CONTRAST GATE CAN FAIL (ui#3).
//
// `tests/contrast.test.ts` is green. That is only worth something if it is capable of being red, and
// with a palette that already passes there is no live failure to demonstrate — so each failure mode
// is proven against a deliberately-bad theme instead. This is the same discipline
// `scripts/check-layering.test.mjs` and `scripts/check-no-handwritten-api-types.test.mjs` apply to
// their gates (conventions.md §11: "once for conformance against the tree, and once against a
// synthetic violation proving the check fires"), and it is the acceptance criterion "the check fails
// on a deliberately-bad pair".

import { createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import { contrastRatio, measureContrast, parseColor } from "../src/contrast.js";
import { COLOR_SCHEMES, CONTRAST_PAIRS, theme } from "../src/theme.js";

/** A theme whose only difference from the real one is the pairing under test. */
function themeWith(overrides: { light?: object; dark?: object }) {
  return createTheme({
    cssVariables: { colorSchemeSelector: "data" },
    colorSchemes: {
      light: { palette: { background: { paper: "#ffffff" }, ...overrides.light } },
      dark: { palette: { background: { paper: "#181c22" }, ...overrides.dark } },
    },
  });
}

const TEXT_ON_PAPER = [["text.primary", "background.paper", "aa"]] as const;

describe("the gate rejects", () => {
  it("a deliberately-bad pair — light grey body text on white", () => {
    // 2.32:1. Legible enough to survive a design review at a glance, and well below the 4.5:1 the
    // standard requires — which is exactly the failure a human eye does not reliably catch.
    const bad = themeWith({ light: { text: { primary: "#9aa3b0" } } });
    const failures = measureContrast(bad, TEXT_ON_PAPER, ["light"]).filter((m) => !m.passes);

    expect(failures).toHaveLength(1);
    expect(failures[0].ratio).toBeLessThan(4.5);
    expect(failures[0].failure).toMatch(/below the aa floor of 4.5:1/);
    // The message has to say what to do, not just that something is wrong.
    expect(failures[0].failure).toMatch(/Darken the foreground or lighten the surface/);
  });

  it("a pair that passes in one scheme and fails in the other", () => {
    // The reason both schemes are measured rather than one. A palette edit that fixes light mode
    // and quietly breaks dark mode is the single most likely way this design system would start
    // lying, because whoever made the edit was only looking at one of them.
    const lopsided = themeWith({
      light: { text: { primary: "#15181d" } },
      dark: { text: { primary: "#2b3038" } },
    });
    const measured = measureContrast(lopsided, TEXT_ON_PAPER, COLOR_SCHEMES);

    expect(measured.find((m) => m.scheme === "light")?.passes).toBe(true);
    expect(measured.find((m) => m.scheme === "dark")?.passes).toBe(false);
  });

  it("a role that does not exist, rather than silently skipping it", () => {
    // A typo in a pairing must be louder than a missing pairing, not quieter. Reporting nothing
    // would make `CONTRAST_PAIRS` self-disabling: rename a role and the gate stops measuring it.
    const failures = measureContrast(
      theme,
      [["text.pirmary", "background.paper", "aa"]],
      ["light"],
    ).filter((m) => !m.passes);

    expect(failures).toHaveLength(1);
    expect(failures[0].ratio).toBeNull();
    expect(failures[0].failure).toMatch(/is not a colour role/);
  });

  it("a translucent backdrop, whose contrast is undefined", () => {
    const translucent = themeWith({
      light: { text: { primary: "#15181d" }, background: { paper: "rgba(255, 255, 255, 0.4)" } },
    });
    const failures = measureContrast(translucent, TEXT_ON_PAPER, ["light"]).filter(
      (m) => !m.passes,
    );

    expect(failures).toHaveLength(1);
    expect(failures[0].failure).toMatch(/translucent/);
  });

  it("a value that is not a colour at all", () => {
    const nonsense = themeWith({ light: { text: { primary: "not-a-colour" } } });
    const failures = measureContrast(nonsense, TEXT_ON_PAPER, ["light"]).filter((m) => !m.passes);

    expect(failures).toHaveLength(1);
    expect(failures[0].failure).toMatch(/not a parseable colour/);
  });
});

describe("the maths", () => {
  it("matches the WCAG 2.1 reference extremes", () => {
    const white = parseColor("#ffffff")!;
    const black = parseColor("#000000")!;
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
    // Symmetric: the ratio is a property of the pair, not of which one was named first.
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
  });

  it("composites a translucent foreground instead of measuring its nominal colour", () => {
    const white = parseColor("#ffffff")!;
    const halfBlack = parseColor("rgba(0, 0, 0, 0.5)")!;
    const solidBlack = parseColor("#000000")!;

    const composited = contrastRatio(halfBlack, white);
    // Measured as if opaque it would score 21:1 — the flattering answer, and the wrong one.
    expect(composited).toBeLessThan(contrastRatio(solidBlack, white));
    expect(composited).toBeGreaterThan(1);
  });

  it("reads every colour notation Material UI emits", () => {
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("#aabbcc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("#aabbcc80")?.a).toBeCloseTo(0.502, 2);
    expect(parseColor("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor("rgba(1, 2, 3, 0.5)")).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parseColor("rgb(1 2 3 / 50%)")).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parseColor("chartreuse")).toBeNull();
  });
});

describe("the real theme", () => {
  it("is what the gate measures — not a table written beside it", () => {
    // If this ever reads from anywhere but the theme object, the gate can pass while the shipped
    // colours fail. Asserting the source is what keeps the two from drifting apart.
    const measured = measureContrast(theme, CONTRAST_PAIRS, COLOR_SCHEMES);
    const first = measured[0];
    const fromTheme = theme.colorSchemes?.[first.scheme]?.palette;

    expect(fromTheme).toBeDefined();
    expect(measured).toHaveLength(CONTRAST_PAIRS.length * COLOR_SCHEMES.length);
  });
});
