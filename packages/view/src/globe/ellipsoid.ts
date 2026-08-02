/**
 * Binding a planetary CRS to Cesium's ellipsoid — the one place "no implicit WGS84" is enforced
 * against the renderer (view.md §2 principle 6; conventions.md §5).
 *
 * Cesium's `Ellipsoid.default` is WGS84 out of the box, and almost every Cesium API that takes an
 * optional ellipsoid silently falls back to it: `Cartesian3.fromRadians`, `Transforms`, the default
 * `Globe`, the map projection. Setting it from the world's own `PlanetaryCRS` before a `Viewer` is
 * constructed is therefore not a nicety — it is the difference between a lunar scene and an Earth
 * scene wearing lunar terrain.
 */

import { Ellipsoid } from "cesium";

import { MOON_RADIUS_M } from "../frames/constants";
import type { PlanetaryCRS } from "../frames/types";

/**
 * Build the Cesium `Ellipsoid` for a planetary CRS.
 *
 * Core models a body as a sphere (`PlanetaryCRS.reference_radius_m` is the PROJ `+R`), so all three
 * semi-axes are the reference radius.
 */
export function bodyEllipsoid(crs: PlanetaryCRS): Ellipsoid {
  const r = crs.reference_radius_m;
  return new Ellipsoid(r, r, r);
}

/**
 * Make `crs` the ellipsoid every ellipsoid-defaulting Cesium API will use.
 *
 * MUST be called before constructing a `Viewer`, `Globe`, or map projection — Cesium captures
 * `Ellipsoid.default` at construction time. Returns the ellipsoid it installed.
 */
export function configureBodyEllipsoid(crs: PlanetaryCRS): Ellipsoid {
  const ellipsoid = bodyEllipsoid(crs);
  Ellipsoid.default = ellipsoid;
  return ellipsoid;
}

/**
 * Assert that Cesium's built-in lunar radius still agrees with Core's `MOON_RADIUS_M`.
 *
 * A contract check, not a coincidence: Core, Worlds' PROJ `+R`, and `Cesium.Ellipsoid.MOON` all
 * carry the Moon's radius independently. If a Cesium upgrade ever redefines it, terrain placed via
 * Core's radius would drift against a globe drawn with Cesium's, and the seam is silent. Called once
 * from the scene, and asserted directly in the test suite.
 */
export function assertLunarRadiusAgreement(): void {
  const cesiumRadius = Ellipsoid.MOON.maximumRadius;
  if (cesiumRadius !== MOON_RADIUS_M) {
    throw new Error(
      `lunar radius disagreement: Cesium's Ellipsoid.MOON is ${cesiumRadius} m but Core's ` +
        `MOON_RADIUS_M is ${MOON_RADIUS_M} m. Terrain and globe would be drawn on different bodies.`,
    );
  }
}
