/**
 * Body-fixed coordinate conversion and display on a body's reference sphere.
 *
 * The Moon is modelled as a sphere (Core's `PlanetaryCRS.reference_radius_m`), so geodetic ↔
 * cartesian is the exact spherical pair — no ellipsoidal iteration, no WGS84 flattening.
 */

import type { Cartesian, Geodetic, PlanetaryCRS } from "./types";
import { normalizeLongitude } from "./projection";

/** Body-fixed geodetic → body-fixed cartesian, in metres. */
export function geodeticToCartesian(crs: PlanetaryCRS, geodetic: Geodetic): Cartesian {
  const r = crs.reference_radius_m + geodetic.heightM;
  const cosLat = Math.cos(geodetic.latitudeRad);
  return {
    xM: r * cosLat * Math.cos(geodetic.longitudeRad),
    yM: r * cosLat * Math.sin(geodetic.longitudeRad),
    zM: r * Math.sin(geodetic.latitudeRad),
  };
}

/** Body-fixed cartesian → body-fixed geodetic. Height is relative to the reference sphere. */
export function cartesianToGeodetic(crs: PlanetaryCRS, cartesian: Cartesian): Geodetic {
  const { xM, yM, zM } = cartesian;
  const planar = Math.hypot(xM, yM);
  const r = Math.hypot(planar, zM);
  return {
    longitudeRad: planar === 0 && zM !== 0 ? 0 : normalizeLongitude(Math.atan2(yM, xM)),
    latitudeRad: r === 0 ? 0 : Math.atan2(zM, planar),
    heightM: r - crs.reference_radius_m,
  };
}
