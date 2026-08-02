/**
 * Runtime members of the closed `TimeScale` / `FrameClass` vocabularies, and their type re-exports.
 *
 * The `const` objects are **values**; each exported `type` is a one-line alias to the generated union
 * from Core's `units.schema.json` (`./generated/units`) — it declares no members of its own, so there
 * is no hand-written mirror of the vocabulary here (RM-P1-VIEW-06 AC1). The alias is only what lets a
 * runtime const and its type share a name under `isolatedModules`. `satisfies` ties each member
 * string to the generated union, so a schema change that drops or renames a member breaks this file
 * at build time — the values cannot drift from Core's vocabulary.
 */

import type { FrameClass as FrameClassType, TimeScale as TimeScaleType } from "./generated/units";

/** `ET` and `TDB` denote the same scale (SPICE ET ≡ TDB; conventions.md §5 rule 3). */
export const TimeScale = {
  /** Barycentric Dynamical Time. */
  TDB: "tdb",
  /** SPICE Ephemeris Time — identical to TDB in SPICE. */
  ET: "et",
} as const satisfies Record<string, TimeScaleType>;
export type TimeScale = TimeScaleType;

export const FrameClass = {
  /** Rotates with a body (e.g. `MOON_ME`). */
  BODY_FIXED: "body_fixed",
  /** Non-rotating (e.g. `J2000` / `ICRF`). */
  INERTIAL: "inertial",
  /** A local surface/site frame, used by Link LOS and View. */
  TOPOCENTRIC: "topocentric",
} as const satisfies Record<string, FrameClassType>;
export type FrameClass = FrameClassType;
