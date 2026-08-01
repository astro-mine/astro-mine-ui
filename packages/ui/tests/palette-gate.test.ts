// PROOF THAT THE COLOUR-VISION GATE CAN FAIL (ui#4).
//
// `tests/palette.test.ts` is green. That is worth something only if it is capable of being red, and
// a palette that already passes offers no live failure to demonstrate — so each failure mode is
// proven here against a deliberately-bad theme. Same discipline as `tests/contrast-gate.test.ts`
// and `scripts/check-layering.test.mjs` (conventions.md §11: "once for conformance against the tree,
// and once against a synthetic violation proving the check fires"). It is the acceptance criterion
// "the check fails on a bad pair".
//
// The arithmetic is checked separately and harder, against the published CIEDE2000 reference data:
// a separation gate built on a subtly wrong ΔE would reject good palettes and accept bad ones with
// equal confidence, and nothing downstream would ever notice.

import { createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import {
  deltaE2000,
  measureCategoricalSeparation,
  perceptualDistance,
  simulate,
  toLab,
  VISION_TYPES,
  type Lab,
} from "../src/colorVision.js";
import { parseColor } from "../src/contrast.js";
import { CATEGORICAL_SEPARATION, type CategoricalPalette } from "../src/theme.js";

/**
 * A theme whose categorical ramp is whatever the test under way needs it to be.
 *
 * The cast is the one liberty this file takes: `PaletteOptions.categorical` requires the full ramp,
 * which is exactly the strictness the real theme wants and exactly the strictness a two-colour
 * proof does not. Confining it to this factory keeps every assertion below honest about types.
 */
function themeWith(categorical: Partial<CategoricalPalette>) {
  return createTheme({
    cssVariables: { colorSchemeSelector: "data" },
    colorSchemes: { light: { palette: { categorical: categorical as CategoricalPalette } } },
  });
}

const rgb = (value: string) => parseColor(value)!;
const PAIR = ["categorical.series1", "categorical.series2"];

describe("the gate rejects", () => {
  it("a pair that normal vision separates and deuteranopia collapses", () => {
    // The textbook failure, and the reason this gate exists at all: a brick red and an olive green
    // are 41.9 apart to normal vision — nobody would question them in a design review — and 4.7
    // apart to a deuteranope, which is to say the same colour. A palette check that measured only
    // normal vision would call this pair excellent.
    const bad = themeWith({ series1: "#b23b3b", series2: "#7a7a2e" });
    const measured = measureCategoricalSeparation(bad, PAIR, ["light"], CATEGORICAL_SEPARATION);

    const normal = measured.find((m) => m.vision === "normal");
    const deuteranopia = measured.find((m) => m.vision === "deuteranopia");

    expect(normal?.passes).toBe(true);
    expect(normal?.distance).toBeGreaterThan(40);
    expect(deuteranopia?.passes).toBe(false);
    expect(deuteranopia?.distance).toBeLessThan(CATEGORICAL_SEPARATION);
    expect(deuteranopia?.failure).toMatch(/as seen with deuteranopia/);
    // The message has to say what to do, not merely that something is wrong.
    expect(deuteranopia?.failure).toMatch(/lightness and blue–yellow survive red–green deficiency/);
  });

  it("two colours nobody could tell apart under any vision", () => {
    const bad = themeWith({ series1: "#1b4f8f", series2: "#1c5091" });
    const measured = measureCategoricalSeparation(bad, PAIR, ["light"], CATEGORICAL_SEPARATION);
    expect(measured.filter((m) => m.passes)).toEqual([]);
    expect(measured).toHaveLength(VISION_TYPES.length);
  });

  it("a role that does not exist, rather than silently skipping it", () => {
    // A typo must be louder than a missing entry, not quieter. Reporting nothing would make the
    // role list self-disabling: rename a series and the gate stops measuring it.
    const theme = themeWith({ series1: "#12417e", series2: "#8f7405" });
    const measured = measureCategoricalSeparation(
      theme,
      ["categorical.series1", "categorical.typo"],
      ["light"],
      CATEGORICAL_SEPARATION,
    );
    expect(measured.every((m) => !m.passes)).toBe(true);
    expect(measured[0].distance).toBeNull();
    expect(measured[0].failure).toMatch(/is not a colour role/);
  });

  it("a value that is not a colour at all", () => {
    const theme = themeWith({ series1: "#12417e", series2: "not-a-colour" });
    const measured = measureCategoricalSeparation(theme, PAIR, ["light"], CATEGORICAL_SEPARATION);
    expect(measured.every((m) => !m.passes)).toBe(true);
    expect(measured[0].failure).toMatch(/not a parseable colour/);
  });

  it("measures every unordered pair once, not twice and not in both orders", () => {
    const theme = themeWith({ series1: "#12417e", series2: "#8f7405", series3: "#b03259" });
    const measured = measureCategoricalSeparation(
      theme,
      ["categorical.series1", "categorical.series2", "categorical.series3"],
      ["light"],
      CATEGORICAL_SEPARATION,
    );
    expect(measured).toHaveLength(3 * VISION_TYPES.length);
  });
});

describe("the dichromacy simulation", () => {
  it("leaves normal vision alone", () => {
    const color = rgb("#b03259");
    expect(simulate(color, "normal")).toBe(color);
  });

  it("leaves a neutral exactly where it was", () => {
    // A grey has no chromatic content to lose, so every dichromacy must return it unchanged. This is
    // the structural check that catches the most likely implementation error by a mile: applying the
    // matrices to gamma-encoded bytes instead of to linear light shifts neutrals visibly, and the
    // result is a simulation of nobody's vision.
    for (const grey of ["#333333", "#808080", "#e0e0e0"]) {
      for (const vision of VISION_TYPES) {
        const shift = deltaE2000(toLab(rgb(grey)), toLab(simulate(rgb(grey), vision)));
        expect(shift, `${grey} moved under ${vision}`).toBeLessThan(0.01);
      }
    }
  });

  it("collapses the red–green axis and spares the blue–yellow one", () => {
    // The property the whole palette design rests on. Red against green all but disappears for a
    // deuteranope; blue against yellow survives, which is why the shipped ramp is built along it.
    const redGreen = perceptualDistance(rgb("#b23b3b"), rgb("#7a7a2e"), "deuteranopia");
    const blueYellow = perceptualDistance(rgb("#12417e"), rgb("#d6b820"), "deuteranopia");
    expect(redGreen).toBeLessThan(CATEGORICAL_SEPARATION);
    expect(blueYellow).toBeGreaterThan(3 * redGreen);
  });
});

describe("CIEDE2000", () => {
  const lab = (l: number, a: number, b: number): Lab => ({ l, a, b });

  it("matches the published reference data", () => {
    // Sharma, Wu & Dalal (2005), "The CIEDE2000 color-difference formula: implementation notes,
    // supplementary test data, and mathematical observations" — the dataset the formula's authors
    // published precisely so an implementation could be checked rather than believed. These rows
    // exercise the parts a simplified version drops: the hue-difference wrap (rows 7-9), the
    // near-neutral G term (row 9) and the blue-region rotation R_T (rows 1-3).
    const cases: readonly (readonly [Lab, Lab, number])[] = [
      [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
      [lab(50, 3.1571, -77.2803), lab(50, 0, -82.7485), 2.8615],
      [lab(50, 2.8361, -74.02), lab(50, 0, -82.7485), 3.4412],
      [lab(50, -1.3802, -84.2814), lab(50, 0, -82.7485), 1.0],
      [lab(50, 0, 0), lab(50, -1, 2), 2.3669],
      [lab(50, 2.49, -0.001), lab(50, -2.49, 0.0009), 7.1792],
      [lab(50, 2.5, 0), lab(50, 0, -2.5), 4.3065],
      [lab(50, 2.5, 0), lab(73, 25, -18), 27.1492],
      [lab(50, 2.5, 0), lab(61, -5, 29), 22.8977],
      [lab(50, 2.5, 0), lab(56, -27, -3), 31.903],
      [lab(50, 2.5, 0), lab(58, 24, 15), 19.4535],
      [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
      [lab(2.0776, 0.0795, -1.135), lab(0.9033, -0.0636, -0.5514), 0.9082],
    ];

    for (const [first, second, expected] of cases) {
      expect(deltaE2000(first, second), `ΔE2000 for ${JSON.stringify(first)}`).toBeCloseTo(
        expected,
        4,
      );
    }
  });

  it("is symmetric and zero on identity", () => {
    const first = lab(50, 2.5, 0);
    const second = lab(73, 25, -18);
    expect(deltaE2000(first, first)).toBe(0);
    expect(deltaE2000(first, second)).toBeCloseTo(deltaE2000(second, first), 10);
  });

  it("puts sRGB's extremes where CIELAB says they are", () => {
    expect(toLab(rgb("#ffffff")).l).toBeCloseTo(100, 4);
    expect(toLab(rgb("#000000")).l).toBeCloseTo(0, 4);
    // A neutral has no chroma, whatever its lightness.
    expect(Math.hypot(toLab(rgb("#808080")).a, toLab(rgb("#808080")).b)).toBeLessThan(0.01);
  });
});
