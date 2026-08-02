// Every colour this package renders, measured (ui#6).
//
// **This closes the one hole the port would otherwise have opened.** `packages/ui`'s contrast gate
// measures the theme's declared pairings, and `@astro-mine/view` cannot be in it: a package may not
// import a sibling, so View's overlays are invisible to that check. Moving the literals into
// `palette.ts` made them auditable; this makes them *audited*. Without it, the scene overlays would
// be the only text in the front end nobody had checked a reader could see.
//
// The maths is WCAG 2.1's relative luminance and contrast ratio, written out here rather than shared
// — for the same sibling reason. It is twenty lines, and the alternative is a colour that nobody
// measures.

import { describe, expect, it } from "vitest";

import { CONTROL, OVERLAY, PAIRINGS, type Pairing } from "./palette";

/** `#rrggbb` or `rgba(r, g, b, a)` → channels in 0–255 plus alpha. */
function parse(colour: string): { r: number; g: number; b: number; a: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(colour);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1]!.split(",").map((p) => p.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`palette.ts holds a colour this test cannot parse: ${colour}`);
}

/**
 * A translucent overlay composited over black.
 *
 * The honest worst case, and the reason this test is not simply `contrast(fg, bg)`: these overlays
 * sit on a rendered scene, and the darkest thing behind them — the body's night side, or the space
 * around it — is what makes their own background darkest and the text on them hardest to read.
 */
function overBlack({ r, g, b, a }: { r: number; g: number; b: number; a: number }) {
  return { r: r * a, g: g * a, b: b * a };
}

/** WCAG 2.1 relative luminance. */
function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(pairing: Pairing): number {
  const fg = luminance(overBlack(parse(pairing.foreground)));
  const bg = luminance(overBlack(parse(pairing.background)));
  const [lighter, darker] = fg > bg ? [fg, bg] : [bg, fg];
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 1.4.3 AA for text below 18.66px bold / 24px regular. Every overlay here is 0.75rem — small
// text, so the higher of the two thresholds is the one that applies.
const AA_NORMAL_TEXT = 4.5;

describe("the scene overlays are readable on the scene", () => {
  for (const [name, pairing] of Object.entries(PAIRINGS)) {
    it(`${name}: ${pairing.foreground} on ${pairing.background} clears WCAG AA`, () => {
      const ratio = contrast(pairing);
      expect(
        ratio,
        `${name} measures ${ratio.toFixed(2)}:1 against a ${AA_NORMAL_TEXT}:1 floor — ` +
          `these overlays carry 0.75rem text, so AA for normal text is what applies`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }
});

describe("the measured list cannot fall behind the declared one", () => {
  it("measures every overlay pairing", () => {
    // The one way past this test would be to add a colour to OVERLAY and not to PAIRINGS.
    for (const name of Object.keys(OVERLAY)) expect(Object.keys(PAIRINGS)).toContain(name);
  });

  it("measures the control colours too", () => {
    expect(PAIRINGS.control).toEqual({
      foreground: CONTROL.foreground,
      background: CONTROL.background,
    });
  });

  it("rejects a colour it cannot parse, rather than scoring it", () => {
    // A gate that silently passes what it cannot read is not a gate.
    expect(() => contrast({ foreground: "papayawhip", background: "#000000" })).toThrow(
      /cannot parse/,
    );
  });
});
