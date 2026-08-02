/**
 * How the bare body looks when no terrain covers it.
 *
 * Cesium's `Globe.baseColor` defaults to **blue** — a sensible default for the Earth it was written
 * for, and wrong for every body Astro-Mine renders. It is the surface an operator sees whenever
 * terrain is missing, late, or unavailable (view.md §2 principle 5), which is exactly the moment a
 * blue sphere would mislead them about which world they are looking at.
 *
 * `ellipsoid.ts` stops the globe from being Earth-*shaped*. This stops it from being Earth-*coloured*.
 * Both are the same requirement (view.md §2 principle 6; conventions.md §5), and neither is caught by
 * asserting a radius.
 */

import { Color } from "cesium";
import type { Globe } from "cesium";

/**
 * A neutral, achromatic regolith grey. Deliberately dark and unsaturated: it reads as "airless body,
 * no data here" rather than as an imagery layer, and it never suggests ocean, vegetation, or sky.
 *
 * Not tuned to any specific body's albedo — a body-accurate base colour would be a `Worlds` property,
 * not a View constant.
 */
export const BODY_BASE_COLOR = new Color(0.3, 0.29, 0.28, 1.0);

/**
 * Apply View's body appearance to a Cesium globe.
 *
 * Lighting and the ground atmosphere are off: the atmosphere is an Earth artifact, and the scene has
 * no Sun ephemeris (illumination comes from Worlds, not from Cesium's Earth-centric sun position).
 */
export function applyBodyAppearance(globe: Globe): void {
  globe.baseColor = BODY_BASE_COLOR;
  globe.enableLighting = false;
  globe.showGroundAtmosphere = false;
}
