/**
 * SI unit formatting and coordinate display.
 *
 * Every rendered quantity carries its unit and every rendered position names its frame — an operator
 * must never have to guess which body, frame, or unit a number is in (view.md §2 principle 6).
 * Values are SI internally; only the *display* string may use a scaled prefix, and it always says so.
 */

import type { Geodetic, PlanetaryCRS, ReferenceFrame } from "./types";

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Format a length in metres, promoting to kilometres above 10 km so a globe-scale readout stays
 * legible. The unit symbol is always present.
 */
export function formatLength(metres: number, fractionDigits = 1): string {
  if (!Number.isFinite(metres)) return "— m";
  return Math.abs(metres) >= 10_000
    ? `${(metres / 1000).toFixed(fractionDigits)} km`
    : `${metres.toFixed(fractionDigits)} m`;
}

/** Format an angle given in radians as degrees. Radians are SI; degrees are for humans. */
export function formatAngle(radians: number, fractionDigits = 4): string {
  if (!Number.isFinite(radians)) return "—°";
  return `${(radians * RAD_TO_DEG).toFixed(fractionDigits)}°`;
}

/** Format a latitude in radians with a N/S hemisphere suffix. */
export function formatLatitude(radians: number, fractionDigits = 4): string {
  if (!Number.isFinite(radians)) return "—°";
  const degrees = radians * RAD_TO_DEG;
  return `${Math.abs(degrees).toFixed(fractionDigits)}° ${degrees < 0 ? "S" : "N"}`;
}

/** Format a longitude in radians with an E/W hemisphere suffix. */
export function formatLongitude(radians: number, fractionDigits = 4): string {
  if (!Number.isFinite(radians)) return "—°";
  const degrees = radians * RAD_TO_DEG;
  return `${Math.abs(degrees).toFixed(fractionDigits)}° ${degrees < 0 ? "W" : "E"}`;
}

/** Format a signed height above the reference sphere, with an explicit sign. */
export function formatHeight(metres: number, fractionDigits = 1): string {
  if (!Number.isFinite(metres)) return "— m";
  const sign = metres < 0 ? "" : "+";
  return `${sign}${formatLength(metres, fractionDigits)}`;
}

/**
 * The canonical coordinate readout: position, then the frame it is expressed in. The frame suffix is
 * not decoration — it is the thing that makes the numbers meaningful.
 *
 * e.g. `89.9012° S, 12.3456° E, +1234.5 m (MOON_ME)`
 */
export function formatCoordinate(
  geodetic: Geodetic,
  frame: ReferenceFrame | PlanetaryCRS | string,
): string {
  const frameName =
    typeof frame === "string" ? frame : "name" in frame ? frame.name : frame.body_fixed_frame;
  return (
    `${formatLatitude(geodetic.latitudeRad)}, ${formatLongitude(geodetic.longitudeRad)}, ` +
    `${formatHeight(geodetic.heightM)} (${frameName})`
  );
}
