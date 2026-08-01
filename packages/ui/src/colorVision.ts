// The categorical palette's separation gate (ui#4; ui.md §7.1, conventions.md §11).
//
// A chart says "these are different things" with colour. Contrast against the *background* is not
// that claim — two series can each clear 3:1 against the page and still be the same colour as one
// another to a reader with colour-vision deficiency, which is roughly one man in twelve. So this
// measures the other property: how far apart the categorical colours are **from each other**, as
// seen through normal vision and through each of the three dichromacies.
//
// It is built exactly like `contrast.ts`, and for the same reason: a palette property nobody runs is
// a palette property that quietly stops being true. `tests/palette.test.ts` measures the shipped
// theme; `tests/palette-gate.test.ts` proves the measurement can reject.
//
// **The maths is published, closed-form, and implemented here rather than installed.**
//
//   - Dichromacy simulation: Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model
//     for Simulation of Color Vision Deficiency", IEEE TVCG 15(6). Their severity-1.0 matrices,
//     applied in **linear** RGB — applying them to gamma-encoded values is the common mistake and it
//     produces colours nobody has.
//   - Perceptual distance: CIEDE2000 (CIE 142-2001 / ISO 11664-6), via CIELAB under D65.
//
// Euclidean distance in sRGB would be cheaper and would be measuring nothing: sRGB is not
// perceptually uniform, so the same numeric gap is a glaring difference among blues and invisible
// among greens. CIEDE2000 is the standard answer, it is about eighty lines, and a colour library
// would be a supply-chain edge for something a specification states in closed form.

import type { Theme } from "@mui/material/styles";

import { parseColor, type Rgba } from "./contrast.js";
import type { ColorSchemeName } from "./theme.js";

// --- colour spaces ----------------------------------------------------------

/** sRGB transfer function, inverted: 0–255 gamma-encoded channel to 0–1 linear light. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** The forward sRGB transfer function, back to a 0–255 channel. */
function fromLinear(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  const encoded = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return encoded * 255;
}

/** Linear sRGB to CIE XYZ, D65 (IEC 61966-2-1). */
const RGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
] as const;

/** The D65 white point the sRGB primaries above are defined against. */
const D65 = { x: 0.95047, y: 1.0, z: 1.08883 } as const;

/** A colour in CIELAB. `l` is 0–100; `a` and `b` are unbounded but practically ±128. */
export interface Lab {
  l: number;
  a: number;
  b: number;
}

/**
 * Convert an opaque sRGB colour to CIELAB under D65.
 *
 * Alpha is ignored rather than composited: this measures how far apart two *palette entries* are,
 * and every categorical colour is opaque by construction. A translucent series colour would be a
 * different bug, caught by the contrast gate, which does composite.
 */
export function toLab({ r, g, b }: Rgba): Lab {
  const linear = [toLinear(r), toLinear(g), toLinear(b)] as const;
  const [x, y, z] = RGB_TO_XYZ.map(
    (row) => row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2],
  ) as [number, number, number];

  // The CIE piecewise function, with the ε = (6/29)³ break written as the fraction it is rather
  // than as the rounded 0.008856 that circulates — the rounded form puts a visible kink in the
  // curve for very dark colours, which is where a dark scheme's palette lives.
  const delta = 6 / 29;
  const f = (t: number) => (t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta ** 2) + 4 / 29);

  const fx = f(x / D65.x);
  const fy = f(y / D65.y);
  const fz = f(z / D65.z);

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// --- dichromacy -------------------------------------------------------------

/** The forms of colour vision this palette is measured through. */
export const VISION_TYPES = ["normal", "protanopia", "deuteranopia", "tritanopia"] as const;

export type VisionType = (typeof VISION_TYPES)[number];

/**
 * Machado et al. (2009), severity 1.0 — the dichromatic limit of each anomaly.
 *
 * Measured at full severity on purpose. An anomalous trichromat sees *more* separation than this, so
 * a palette that survives the limit survives every milder case; tuning to a partial severity would
 * be choosing which readers the chart is honest with.
 */
const CVD_MATRICES: Record<Exclude<VisionType, "normal">, readonly (readonly number[])[]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/**
 * What a colour looks like to a dichromat.
 *
 * The transform is applied in **linear** light and the result is re-encoded, because the matrices
 * model the response of cone cells to physical radiance. Applying them to gamma-encoded bytes — the
 * shortcut most snippets take — is not a smaller error; it returns colours no eye produces, and it
 * flatters the palette in exactly the dark-and-saturated region where the risk is.
 */
export function simulate(color: Rgba, vision: VisionType): Rgba {
  if (vision === "normal") return color;
  const matrix = CVD_MATRICES[vision];
  const linear = [toLinear(color.r), toLinear(color.g), toLinear(color.b)] as const;
  const [r, g, b] = matrix.map(
    (row) => row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2],
  ) as [number, number, number];
  return { r: fromLinear(r), g: fromLinear(g), b: fromLinear(b), a: color.a };
}

// --- perceptual distance ----------------------------------------------------

const DEG = Math.PI / 180;

/** Degrees, normalized to [0, 360). */
function degrees(radians: number): number {
  const d = radians / DEG;
  return d < 0 ? d + 360 : d;
}

/**
 * CIEDE2000 colour difference, with the parametric factors k_L = k_C = k_H = 1.
 *
 * Implemented from the specification, including the two parts everybody's simplified version drops
 * and both of which matter here: the **G** term that inflates chroma near the neutral axis (without
 * it, two near-grey colours read as further apart than they are), and the **R_T** rotation term,
 * which is what stops two blues from scoring as a large difference.
 *
 * Roughly: 1.0 is the just-noticeable difference for adjacent patches under ideal viewing; separate
 * marks on a chart need considerably more, which is what {@link CATEGORICAL_SEPARATION} sets.
 */
export function deltaE2000(first: Lab, second: Lab): number {
  const chroma1 = Math.hypot(first.a, first.b);
  const chroma2 = Math.hypot(second.a, second.b);
  const chromaMean = (chroma1 + chroma2) / 2;

  const g = 0.5 * (1 - Math.sqrt(chromaMean ** 7 / (chromaMean ** 7 + 25 ** 7)));
  const a1 = (1 + g) * first.a;
  const a2 = (1 + g) * second.a;

  const c1 = Math.hypot(a1, first.b);
  const c2 = Math.hypot(a2, second.b);
  // A neutral colour has no hue; atan2(0, 0) is 0 by definition here rather than by accident.
  const h1 = a1 === 0 && first.b === 0 ? 0 : degrees(Math.atan2(first.b, a1));
  const h2 = a2 === 0 && second.b === 0 ? 0 : degrees(Math.atan2(second.b, a2));

  const deltaL = second.l - first.l;
  const deltaC = c2 - c1;

  let deltah: number;
  if (c1 * c2 === 0) {
    deltah = 0;
  } else if (Math.abs(h2 - h1) <= 180) {
    deltah = h2 - h1;
  } else {
    deltah = h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 + 360;
  }
  const deltaH = 2 * Math.sqrt(c1 * c2) * Math.sin((deltah / 2) * DEG);

  const lMean = (first.l + second.l) / 2;
  const cMean = (c1 + c2) / 2;

  let hMean: number;
  if (c1 * c2 === 0) {
    hMean = h1 + h2;
  } else if (Math.abs(h1 - h2) <= 180) {
    hMean = (h1 + h2) / 2;
  } else {
    hMean = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos((hMean - 30) * DEG) +
    0.24 * Math.cos(2 * hMean * DEG) +
    0.32 * Math.cos((3 * hMean + 6) * DEG) -
    0.2 * Math.cos((4 * hMean - 63) * DEG);

  const sL = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sC = 1 + 0.045 * cMean;
  const sH = 1 + 0.015 * cMean * t;

  const deltaTheta = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7));
  const rT = -Math.sin(2 * deltaTheta * DEG) * rC;

  return Math.sqrt(
    (deltaL / sL) ** 2 +
      (deltaC / sC) ** 2 +
      (deltaH / sH) ** 2 +
      rT * (deltaC / sC) * (deltaH / sH),
  );
}

/**
 * Convenience: the distance between two sRGB colours as seen through a given vision type.
 */
export function perceptualDistance(first: Rgba, second: Rgba, vision: VisionType): number {
  return deltaE2000(toLab(simulate(first, vision)), toLab(simulate(second, vision)));
}

// --- the gate ---------------------------------------------------------------

/** One measured pair, in one scheme, through one form of vision. */
export interface SeparationMeasurement {
  scheme: ColorSchemeName;
  vision: VisionType;
  /** The two palette roles, as dotted paths — e.g. `categorical.series1`. */
  first: string;
  second: string;
  threshold: number;
  /** ΔE2000, or `null` when a role could not be resolved or parsed. */
  distance: number | null;
  passes: boolean;
  /** Present only on a failure: what went wrong, and what to do about it. */
  failure?: string;
}

/** Follow a dotted path into a resolved palette. Kept local so the shape can be an array or object. */
function role(palette: unknown, path: string): string | undefined {
  let node: unknown = palette;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Measure every unordered pair of the given roles, in every scheme, through every vision type.
 *
 * Returns measurements rather than throwing, for the same reason `measureContrast` does: a palette
 * revision usually moves several pairs at once, and a gate that stops at the first failure turns one
 * edit into a queue of single-fix rebuilds.
 */
export function measureCategoricalSeparation(
  theme: Theme,
  roles: readonly string[],
  schemes: readonly ColorSchemeName[],
  threshold: number,
): SeparationMeasurement[] {
  const measurements: SeparationMeasurement[] = [];

  for (const scheme of schemes) {
    const palette = theme.colorSchemes?.[scheme]?.palette;

    for (let i = 0; i < roles.length; i += 1) {
      for (let j = i + 1; j < roles.length; j += 1) {
        const first = roles[i];
        const second = roles[j];

        for (const vision of VISION_TYPES) {
          const base = { scheme, vision, first, second, threshold };
          const fail = (failure: string) =>
            measurements.push({ ...base, distance: null, passes: false, failure });

          if (palette === undefined) {
            fail(`the theme declares no \`${scheme}\` colour scheme.`);
            continue;
          }

          const rawFirst = role(palette, first);
          const rawSecond = role(palette, second);
          if (rawFirst === undefined || rawSecond === undefined) {
            const missing = rawFirst === undefined ? first : second;
            fail(`\`${missing}\` is not a colour role of the \`${scheme}\` palette.`);
            continue;
          }

          const parsedFirst = parseColor(rawFirst);
          const parsedSecond = parseColor(rawSecond);
          if (parsedFirst === null || parsedSecond === null) {
            const [name, value] =
              parsedFirst === null ? [first, rawFirst] : [second, rawSecond as string];
            fail(`\`${name}\` is \`${value}\`, which is not a parseable colour.`);
            continue;
          }

          const distance =
            Math.round(perceptualDistance(parsedFirst, parsedSecond, vision) * 100) / 100;
          const passes = distance >= threshold;
          measurements.push({
            ...base,
            distance,
            passes,
            failure: passes
              ? undefined
              : `${first} (${rawFirst}) and ${second} (${rawSecond}) are ${distance.toFixed(2)} ` +
                `apart in ΔE2000 as seen with ${vision}, below the ${threshold} floor. To a reader ` +
                `with that vision the two series are the same colour. Move one of them in ` +
                `\`theme.ts\` — lightness and blue–yellow survive red–green deficiency; hue alone ` +
                `does not — or shorten the ramp.`,
          });
        }
      }
    }
  }

  return measurements;
}
