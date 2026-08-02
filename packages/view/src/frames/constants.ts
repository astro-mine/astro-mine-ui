/**
 * Canonical frame/CRS constants, mirrored from Core (`astro_mine.core.units`) and Worlds
 * (`astro_mine.worlds.crs`) so View names the same frames the producers do.
 *
 * `MOON_RADIUS_M` is the single number that must agree platform-wide: Core carries it, Worlds
 * projects against it, and CesiumJS ships it as `Ellipsoid.MOON`. `globe/ellipsoid.ts` asserts that
 * agreement — a contract test, not a coincidence.
 */

import { FrameClass, TimeScale } from "./types";
import type { Epoch, PlanetaryCRS, ReferenceFrame } from "./types";

/** NAIF body names the lunar anchor scenario resolves geometry against. */
export const MOON = "MOON";
export const SUN = "SUN";
export const EARTH = "EARTH";

/** The Moon's reference radius (IAU sphere), in metres — Core's `MOON_RADIUS_M`. */
export const MOON_RADIUS_M = 1_737_400.0;

/** The Moon's body-fixed mean-Earth/polar-axis frame. */
export const MOON_BODY_FIXED: ReferenceFrame = {
  name: "MOON_ME",
  frame_class: FrameClass.BODY_FIXED,
  center: MOON,
};

/** The Earth-mean-equator/equinox-of-J2000 inertial frame. */
export const INERTIAL_J2000: ReferenceFrame = {
  name: "J2000",
  frame_class: FrameClass.INERTIAL,
  center: null,
};

/** The J2000 TDB epoch (ephemeris-time origin). */
export const J2000_EPOCH: Epoch = { tdb_seconds: 0.0, scale: TimeScale.TDB };

/**
 * The anchor-scenario CRS: lunar south-polar stereographic on the Moon sphere. Byte-identical to
 * the `projection` string Worlds writes into a world bundle's `world.json`
 * (`worlds.crs.LUNAR_SOUTH_POLAR_STEREOGRAPHIC`).
 */
export const LUNAR_SOUTH_POLAR_STEREOGRAPHIC: PlanetaryCRS = {
  body: MOON,
  body_fixed_frame: MOON_BODY_FIXED.name,
  reference_radius_m: MOON_RADIUS_M,
  projection:
    "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 " +
    `+x_0=0 +y_0=0 +R=${MOON_RADIUS_M.toFixed(1)} +units=m +no_defs`,
  datum: null,
};
