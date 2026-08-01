// THE CONTRAST GATE (ui#3; conventions.md §11, ui.md §7 rule 7).
//
// Every pairing `theme.ts` declares, measured against WCAG 2.1 in **both** colour schemes. This is
// the lane the acceptance criterion "both modes pass an automated contrast check" names, and it is
// run in CI on its own step so a failure reads as a contrast failure rather than as "a test broke".
//
// `tests/contrast-gate.test.ts` is its companion: it proves this check can actually reject. A gate
// nobody has seen fail is a gate nobody should trust.

import { describe, expect, it } from "vitest";

import { measureContrast } from "../src/contrast.js";
import { COLOR_SCHEMES, CONTRAST_PAIRS, DECORATIVE_ROLES, PALETTES, theme } from "../src/theme.js";

const measurements = measureContrast(theme, CONTRAST_PAIRS, COLOR_SCHEMES);

describe("the theme's declared contrast pairings", () => {
  it("meet WCAG 2.1 in both colour schemes", () => {
    const failures = measurements.filter((m) => !m.passes);

    // Reported as one assembled message rather than a bare boolean: a palette revision usually
    // moves several pairings at once, and a reader needs to see all of them to choose the fix.
    expect(
      failures.map((m) => `[${m.scheme}] ${m.failure}`).join("\n"),
      `${failures.length} of ${measurements.length} pairings fall short`,
    ).toBe("");
  });

  it("measure every pairing in every scheme, with none skipped", () => {
    expect(measurements).toHaveLength(CONTRAST_PAIRS.length * COLOR_SCHEMES.length);
    expect(measurements.every((m) => m.ratio !== null)).toBe(true);
  });

  it("cover every colour role the palette declares", () => {
    // The check that keeps the gate honest as the palette grows. A role with no pairing is a role
    // nobody has promised anything about, and it would pass this suite forever by being invisible
    // to it — which is exactly how a design system starts claiming a property it has stopped
    // having. `background.*` are backdrops rather than foregrounds, and appear on the right of a
    // pairing instead.
    const covered = new Set(
      CONTRAST_PAIRS.flatMap(([foreground, background]) => [foreground, background]),
    );

    const declared: string[] = [];
    for (const [role, value] of Object.entries(PALETTES.light)) {
      if (typeof value === "string") declared.push(role);
      else for (const shade of Object.keys(value)) declared.push(`${role}.${shade}`);
    }

    // `light`/`dark` shades of a colour are hover and emphasis surfaces rather than text roles, and
    // are not held to a text floor; `DECORATIVE_ROLES` are exempt with a stated reason. Everything
    // else must appear in the table.
    const uncovered = declared.filter(
      (role) =>
        !covered.has(role) &&
        !DECORATIVE_ROLES.has(role) &&
        !role.startsWith("background.") &&
        !role.endsWith(".light") &&
        !role.endsWith(".dark"),
    );

    expect(
      uncovered,
      `colour roles with no declared contrast pairing: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });
});

describe("the report", () => {
  it("names the tightest margin, so a palette edit can be judged before it ships", () => {
    const tightest = measurements.reduce((a, b) =>
      (a.ratio ?? Infinity) < (b.ratio ?? Infinity) ? a : b,
    );
    expect(tightest.ratio).not.toBeNull();
    // Not an assertion about a number — a printed fact. The margin is what tells a reviewer whether
    // the palette has room to move.
    console.log(
      `Tightest contrast margin: ${tightest.foreground} on ${tightest.background} ` +
        `(${tightest.scheme}) at ${tightest.ratio?.toFixed(2)}:1 against a ${tightest.threshold}:1 floor.`,
    );
  });
});
