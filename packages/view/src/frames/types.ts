/**
 * The frame/time vocabulary — Core's, not View's.
 *
 * The six waist types (`TimeScale`, `FrameClass`, `ReferenceFrame`, `PlanetaryCRS`, `Epoch`,
 * `EpochWindow`) are **generated** from Core's canonical `units.schema.json` (RM-P1-CORE-06,
 * RFC-0007 Design §1a) into `./generated/units.ts` and re-exported here. View no longer hand-mirrors
 * them, so the camelCase-vs-snake_case drift RFC-0007 §Motivation calls out is gone: the field names
 * are Core's snake_case (`frame_class`, `reference_radius_m`, `tdb_seconds`, `body_fixed_frame`).
 *
 * SPICE-shaped, dependency-light: these types *name* SPICE frames and carry TDB seconds; they never
 * resolve them (that is `astro-mine-spice`, RFC-0002). Every quantity is SI. Nothing here defaults
 * to an Earth/WGS84 value — see `guards.ts` (view.md §2 principle 6; conventions.md §5).
 */

// Re-export the four generated object types unchanged — this file adds no hand-written declaration
// for any of them (RM-P1-VIEW-06 acceptance criterion 1).
export type { Epoch, EpochWindow, PlanetaryCRS, ReferenceFrame } from "./generated/units";

// The two closed vocabularies are each a runtime value AND a type; both come from `./vocabulary`,
// where the type is a one-line alias to the generated union (kept there so a const and its type can
// share the name `TimeScale` / `FrameClass` under isolatedModules — see that file).
export { FrameClass, TimeScale } from "./vocabulary";

/**
 * Geodetic coordinates on a body's reference sphere. Angles in radians, height in metres.
 *
 * View-local display geometry, **not** part of Core's waist vocabulary (absent from
 * `units.schema.json`): the Cesium-side spherical math in `coords.ts` produces and consumes it.
 */
export interface Geodetic {
  readonly longitudeRad: number;
  readonly latitudeRad: number;
  readonly heightM: number;
}

/** A body-fixed cartesian position, in metres. View-local display geometry (see `Geodetic`). */
export interface Cartesian {
  readonly xM: number;
  readonly yM: number;
  readonly zM: number;
}
