// THE COLOUR-VISION GATE (ui#4; ui.md §7.1, conventions.md §11).
//
// The categorical ramp, measured against itself: every pair, in both colour schemes, through normal
// vision and through each of the three dichromacies. This is the lane the acceptance criterion "the
// palette passes the colour-vision separation check" names, and it runs as its own CI step so a
// failure reads as what it is — a palette that has stopped distinguishing its own series — rather
// than as "a test broke".
//
// **It is not the contrast gate, and neither implies the other.** `tests/contrast.test.ts` asks
// whether a mark can be seen against the page; this asks whether two marks can be told apart. Five
// colours can each clear 3:1 against white and be indistinguishable from one another, which is the
// failure a chart legend cannot survive and a contrast check cannot see.
//
// `tests/palette-gate.test.ts` is its companion: it proves this check can reject.

import { describe, expect, it } from "vitest";

import { measureCategoricalSeparation, VISION_TYPES } from "../src/colorVision.js";
import {
  CATEGORICAL_SEPARATION,
  CATEGORICAL_SERIES,
  COLOR_SCHEMES,
  PALETTES,
  theme,
} from "../src/theme.js";

const roles = CATEGORICAL_SERIES.map((series) => `categorical.${series}`);
const measurements = measureCategoricalSeparation(
  theme,
  roles,
  COLOR_SCHEMES,
  CATEGORICAL_SEPARATION,
);

describe("the categorical palette", () => {
  it("keeps every pair of series apart, in both schemes and under every form of vision", () => {
    const failures = measurements.filter((m) => !m.passes);

    // Assembled into one message rather than a bare boolean: moving a colour usually moves several
    // pairs, and whoever is editing the palette needs to see all of them to choose the fix.
    expect(
      failures.map((m) => `[${m.scheme}/${m.vision}] ${m.failure}`).join("\n"),
      `${failures.length} of ${measurements.length} pairs fall short`,
    ).toBe("");
  });

  it("measures every pair, in every scheme, through every vision type, with none skipped", () => {
    const pairs = (CATEGORICAL_SERIES.length * (CATEGORICAL_SERIES.length - 1)) / 2;
    expect(measurements).toHaveLength(pairs * COLOR_SCHEMES.length * VISION_TYPES.length);
    expect(measurements.every((m) => m.distance !== null)).toBe(true);
  });

  it("declares the same series in both schemes", () => {
    // A ramp with five entries in light and four in dark would leave one chart series with no
    // colour in one mode — and it would typecheck, render, and be broken in half of deployments.
    for (const scheme of COLOR_SCHEMES) {
      expect(Object.keys(PALETTES[scheme].categorical).sort()).toEqual([...CATEGORICAL_SERIES]);
    }
  });

  it("reaches the palette through the theme, not through a table beside it", () => {
    // The same discipline `contrast.test.ts` holds: if this ever measures anything but the object
    // `createTheme` produced, the gate can pass while the shipped colours fail.
    for (const scheme of COLOR_SCHEMES) {
      const palette = theme.colorSchemes?.[scheme]?.palette;
      expect(palette?.categorical).toEqual(PALETTES[scheme].categorical);
    }
  });
});

describe("the report", () => {
  it("names the tightest pair, so a palette edit can be judged before it ships", () => {
    const tightest = measurements.reduce((a, b) =>
      (a.distance ?? Infinity) < (b.distance ?? Infinity) ? a : b,
    );
    expect(tightest.distance).not.toBeNull();
    // A printed fact rather than an assertion about a number. The margin over the floor is what
    // tells a reviewer whether the palette has room to move.
    console.log(
      `Tightest categorical separation: ${tightest.first} vs ${tightest.second} ` +
        `(${tightest.scheme}, ${tightest.vision}) at ΔE2000 ${tightest.distance?.toFixed(2)} ` +
        `against a floor of ${CATEGORICAL_SEPARATION}.`,
    );
  });
});
