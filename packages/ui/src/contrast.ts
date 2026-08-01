// The design system's accessibility gate (ui#3; conventions.md §11, ui.md §7 rule 7).
//
// "Where a package ships design tokens, the properties asserted about them are **checked, not
// claimed**: colour-contrast conformance across every theme and mode." A contrast claim nobody runs
// is a contrast claim that quietly stops being true — so this measures WCAG 2.1 contrast for every
// pairing `theme.ts` declares, in **both** colour schemes, and `tests/contrast.test.ts` fails the
// build on any shortfall.
//
// **It reads the theme object, not a table beside it.** `theme.colorSchemes[scheme].palette` holds
// the values MUI actually resolved — including anything it derived for a role we did not set. A
// parallel list of hex values would measure what we *meant* to ship; this measures what we ship.
//
// The maths is WCAG 2.1 (§1.4.3, §1.4.11) implemented from the specification: sRGB relative
// luminance with the 0.03928 linearisation break, and `(L_lighter + 0.05) / (L_darker + 0.05)`.
// No dependency — it is thirty lines of arithmetic, and a colour library would be a supply-chain
// edge for something a specification states in closed form.

import type { Theme } from "@mui/material/styles";

import { CONTRAST_THRESHOLDS, type ColorSchemeName, type ContrastLevel } from "./theme.js";

/** A colour, decomposed. `r`/`g`/`b` are 0–255; `a` is 0–1. */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse the colour notations Material UI emits: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`
 * with either comma or space separators.
 *
 * Returns `null` rather than throwing, so an unparseable value becomes a *reported* failure naming
 * the role — a thrown error here would say only that something, somewhere, was not a colour.
 */
export function parseColor(value: string): Rgba | null {
  const input = value.trim();

  if (input.startsWith("#")) {
    const hex = input.slice(1);
    const expanded =
      hex.length === 3 || hex.length === 4
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(expanded)) return null;
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
      a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const functional = input.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!functional) return null;
  const alpha = functional[4];
  return {
    r: Number(functional[1]),
    g: Number(functional[2]),
    b: Number(functional[3]),
    a:
      alpha === undefined
        ? 1
        : alpha.endsWith("%")
          ? Number(alpha.slice(0, -1)) / 100
          : Number(alpha),
  };
}

/**
 * Composite a possibly-translucent foreground over an opaque backdrop.
 *
 * Without this, a translucent foreground would be measured at its nominal colour and score far
 * better than it looks — which is precisely the pairing most likely to be too faint. MUI derives
 * several roles as `rgba(…)`, so this is the common case, not the exotic one.
 */
export function flatten(foreground: Rgba, backdrop: Rgba): Rgba {
  if (foreground.a >= 1) return foreground;
  const mix = (f: number, b: number) => f * foreground.a + b * (1 - foreground.a);
  return {
    r: mix(foreground.r, backdrop.r),
    g: mix(foreground.g, backdrop.g),
    b: mix(foreground.b, backdrop.b),
    a: 1,
  };
}

/** WCAG 2.1 relative luminance for an sRGB colour. */
export function luminance({ r, g, b }: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG 2.1 contrast ratio, 1:1 to 21:1. The foreground is composited first. */
export function contrastRatio(foreground: Rgba, backdrop: Rgba): number {
  const front = luminance(flatten(foreground, backdrop));
  const back = luminance(backdrop);
  const [lighter, darker] = front > back ? [front, back] : [back, front];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Follow a dotted path such as `text.primary` into a resolved palette. */
export function paletteValue(palette: unknown, path: string): string | undefined {
  let node: unknown = palette;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" ? node : undefined;
}

/** One measured pairing. */
export interface ContrastMeasurement {
  scheme: ColorSchemeName;
  foreground: string;
  background: string;
  level: ContrastLevel;
  threshold: number;
  /** The measured ratio, or `null` when a role could not be resolved or parsed. */
  ratio: number | null;
  passes: boolean;
  /** Present only on a failure: what went wrong, and what to do about it. */
  failure?: string;
}

export type ContrastPair = readonly [string, string, ContrastLevel];

/**
 * Measure every pairing in every scheme.
 *
 * Returns measurements rather than throwing so the caller can report *all* the failures at once. A
 * gate that stops at the first one turns a palette revision into a queue of single-fix rebuilds.
 */
export function measureContrast(
  theme: Theme,
  pairs: readonly ContrastPair[],
  schemes: readonly ColorSchemeName[],
): ContrastMeasurement[] {
  const measurements: ContrastMeasurement[] = [];

  for (const scheme of schemes) {
    const palette = theme.colorSchemes?.[scheme]?.palette;

    for (const [foreground, background, level] of pairs) {
      const threshold = CONTRAST_THRESHOLDS[level];
      const base: Omit<ContrastMeasurement, "ratio" | "passes"> = {
        scheme,
        foreground,
        background,
        level,
        threshold,
      };

      const fail = (failure: string) =>
        measurements.push({ ...base, ratio: null, passes: false, failure });

      if (palette === undefined) {
        fail(`the theme declares no \`${scheme}\` colour scheme.`);
        continue;
      }

      const rawForeground = paletteValue(palette, foreground);
      const rawBackground = paletteValue(palette, background);
      if (rawForeground === undefined) {
        fail(`\`${foreground}\` is not a colour role of the \`${scheme}\` palette.`);
        continue;
      }
      if (rawBackground === undefined) {
        fail(`\`${background}\` is not a colour role of the \`${scheme}\` palette.`);
        continue;
      }

      const parsedForeground = parseColor(rawForeground);
      const parsedBackground = parseColor(rawBackground);
      if (parsedForeground === null) {
        fail(`\`${foreground}\` is \`${rawForeground}\`, which is not a parseable colour.`);
        continue;
      }
      if (parsedBackground === null) {
        fail(`\`${background}\` is \`${rawBackground}\`, which is not a parseable colour.`);
        continue;
      }
      // A translucent backdrop has no defined contrast — what shows through is whatever happens to
      // be underneath, which this cannot know. Silently treating it as opaque would report a ratio
      // that is true of nothing on screen.
      if (parsedBackground.a < 1) {
        fail(
          `\`${background}\` is \`${rawBackground}\`, which is translucent. A backdrop must be ` +
            `opaque for its contrast to mean anything.`,
        );
        continue;
      }

      const ratio = Math.round(contrastRatio(parsedForeground, parsedBackground) * 100) / 100;
      const passes = ratio >= threshold;
      measurements.push({
        ...base,
        ratio,
        passes,
        failure: passes
          ? undefined
          : `${foreground} (${rawForeground}) on ${background} (${rawBackground}) is ` +
            `${ratio.toFixed(2)}:1, below the ${level} floor of ${threshold}:1. Darken the ` +
            `foreground or lighten the surface in \`theme.ts\` — or, if the pairing is decorative, ` +
            `remove it from CONTRAST_PAIRS with a reason.`,
      });
    }
  }

  return measurements;
}
