/**
 * Spherical polar-stereographic projection — the anchor world's CRS, forward and inverse.
 *
 * Worlds writes its terrain tileset with an **identity** tileset-to-body transform (a documented
 * Phase-0 simplification, `worlds/spec/_tiles.py`), so View is what places the patch on the body: it
 * inverts the projected grid origin to body-fixed lon/lat and builds an east-north-up frame there.
 * That inversion happens here.
 *
 * Closed-form and exact, because the anchor CRS projects onto a **sphere** (PROJ `+R`), not an
 * ellipsoid — Core models the Moon as a sphere (`PlanetaryCRS.reference_radius_m`). A PROJ string
 * this module cannot honour exactly (oblique aspect, ellipsoidal `+a`/`+b`, non-metre units) is
 * rejected rather than approximated: a wrong globe placement is worse than a loud failure
 * (view.md §2 principle 6).
 */

import { FramesValidationError } from "./guards";
import type { Geodetic } from "./types";

/** A parsed spherical polar-stereographic PROJ definition. All lengths in metres, angles radians. */
export interface PolarStereographic {
  /** `true` for the south aspect (`+lat_0=-90`), `false` for the north (`+lat_0=90`). */
  readonly south: boolean;
  /** Central meridian (`+lon_0`), radians. */
  readonly lon0Rad: number;
  /** Scale factor at the pole, derived from `+lat_ts`. */
  readonly k0: number;
  /** Body reference radius (`+R`), metres. */
  readonly radiusM: number;
  /** False easting / northing (`+x_0` / `+y_0`), metres. */
  readonly falseEastingM: number;
  readonly falseNorthingM: number;
}

/** A position in the projected grid, in metres. */
export interface GridPoint {
  readonly xM: number;
  readonly yM: number;
}

const DEG = Math.PI / 180;

function parseParams(proj: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const token of proj.trim().split(/\s+/)) {
    if (!token.startsWith("+")) {
      throw new FramesValidationError(`malformed PROJ string near ${JSON.stringify(token)}`);
    }
    const [key, value = ""] = token.slice(1).split("=", 2);
    params.set(key, value);
  }
  return params;
}

function numeric(params: Map<string, string>, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new FramesValidationError(`PROJ +${key} must be numeric, got ${JSON.stringify(raw)}`);
  }
  return value;
}

/**
 * Parse a `+proj=stere` PROJ string into a spherical polar-stereographic definition.
 *
 * Throws `FramesValidationError` for anything this closed form cannot represent exactly.
 */
export function parsePolarStereographic(proj: string): PolarStereographic {
  const params = parseParams(proj);

  const name = params.get("proj");
  if (name !== "stere") {
    throw new FramesValidationError(
      `unsupported projection +proj=${name ?? "(missing)"}; View resolves +proj=stere only ` +
        "(the anchor-world CRS)",
    );
  }

  const units = params.get("units");
  if (units !== undefined && units !== "m") {
    throw new FramesValidationError(`PROJ +units=${units} is not SI; expected metres (+units=m)`);
  }

  if (params.has("a") || params.has("b") || params.has("ellps") || params.has("datum")) {
    throw new FramesValidationError(
      "ellipsoidal PROJ parameters (+a/+b/+ellps/+datum) are not supported; the anchor CRS " +
        "projects onto a sphere (+R), and an ellipsoidal inverse would be silently approximate",
    );
  }

  const radiusM = numeric(params, "R", NaN);
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new FramesValidationError(
      `PROJ +R must be a positive body radius, got ${JSON.stringify(params.get("R"))}`,
    );
  }

  const lat0 = numeric(params, "lat_0", NaN);
  if (lat0 !== 90 && lat0 !== -90) {
    throw new FramesValidationError(
      `+lat_0=${params.get("lat_0") ?? "(missing)"} is not a polar aspect; View resolves the polar ` +
        "aspect (+lat_0=±90) only",
    );
  }
  const south = lat0 === -90;

  // Scale at the pole. PROJ's +lat_ts is the latitude of true scale; for the polar aspect on a
  // sphere, k0 = (1 + sin|lat_ts|) / 2, which is 1 at the pole itself.
  const latTs = numeric(params, "lat_ts", lat0);
  if (Math.abs(latTs) > 90) {
    throw new FramesValidationError(`+lat_ts=${latTs} is outside [-90, 90]`);
  }
  const k0 = (1 + Math.sin(Math.abs(latTs) * DEG)) / 2;

  return {
    south,
    lon0Rad: numeric(params, "lon_0", 0) * DEG,
    k0,
    radiusM,
    falseEastingM: numeric(params, "x_0", 0),
    falseNorthingM: numeric(params, "y_0", 0),
  };
}

/** Project body-fixed lon/lat onto the grid. Height is carried by the caller, not projected. */
export function projectToGrid(
  proj: PolarStereographic,
  longitudeRad: number,
  latitudeRad: number,
): GridPoint {
  const { south, lon0Rad, k0, radiusM, falseEastingM, falseNorthingM } = proj;
  const dLon = longitudeRad - lon0Rad;
  const halfPi = Math.PI / 2;

  // rho collapses to 0 at the projection's own pole and grows away from it.
  const rho = south
    ? 2 * radiusM * k0 * Math.tan(Math.PI / 4 + latitudeRad / 2)
    : 2 * radiusM * k0 * Math.tan(Math.PI / 4 - latitudeRad / 2);

  if (!Number.isFinite(rho) || Math.abs(latitudeRad) > halfPi + 1e-12) {
    throw new FramesValidationError(`latitude ${latitudeRad} rad is outside [-π/2, π/2]`);
  }

  return south
    ? { xM: rho * Math.sin(dLon) + falseEastingM, yM: rho * Math.cos(dLon) + falseNorthingM }
    : { xM: rho * Math.sin(dLon) + falseEastingM, yM: -rho * Math.cos(dLon) + falseNorthingM };
}

/**
 * Invert a projected grid point to body-fixed geodetic lon/lat on the reference sphere.
 *
 * `heightM` is passed through unchanged — a stereographic grid carries planimetry only; elevation
 * comes from the terrain mesh, not the projection.
 */
export function unprojectFromGrid(
  proj: PolarStereographic,
  point: GridPoint,
  heightM = 0,
): Geodetic {
  const { south, lon0Rad, k0, radiusM, falseEastingM, falseNorthingM } = proj;
  const x = point.xM - falseEastingM;
  const y = point.yM - falseNorthingM;
  const rho = Math.hypot(x, y);

  if (rho === 0) {
    // The pole itself: longitude is degenerate, so report the central meridian rather than NaN.
    return {
      longitudeRad: lon0Rad,
      latitudeRad: south ? -Math.PI / 2 : Math.PI / 2,
      heightM,
    };
  }

  const c = 2 * Math.atan(rho / (2 * radiusM * k0));
  const latitudeRad = south ? c - Math.PI / 2 : Math.PI / 2 - c;
  const longitudeRad = normalizeLongitude(lon0Rad + (south ? Math.atan2(x, y) : Math.atan2(x, -y)));

  return { longitudeRad, latitudeRad, heightM };
}

/** Wrap a longitude into `(-π, π]`. */
export function normalizeLongitude(longitudeRad: number): number {
  const twoPi = 2 * Math.PI;
  const wrapped = ((((longitudeRad + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
  // `-π` and `+π` are the same meridian; prefer `+π` so the range is half-open the usual way.
  return wrapped === -Math.PI ? Math.PI : wrapped;
}
