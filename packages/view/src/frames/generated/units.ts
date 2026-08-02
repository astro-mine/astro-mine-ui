/**
 * GENERATED — DO NOT EDIT BY HAND.
 *
 * Source: Core's canonical units JSON Schema, vendored at src/frames/schema/units.schema.json
 * (astro-mine-core rev 27ed80d5b042c29db4103abced6adec1cfa0b4e3;
 *  $id https://schemas.astro-mine.org/core/units/v0.1/units.schema.json).
 *
 * Regenerate with `pnpm codegen:units`. See scripts/gen-units-types.mjs.
 *
 * These are the six canonical waist vocabulary types (RFC-0007 Design §1a; conventions.md §5):
 * ReferenceFrame, PlanetaryCRS, Epoch, EpochWindow, FrameClass, TimeScale. They are the single
 * source of truth for the frame/CRS/time shapes — View no longer hand-mirrors them.
 */

/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "TimeScale".
 */
export type TimeScale = "tdb" | "et";
/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "FrameClass".
 */
export type FrameClass = "body_fixed" | "inertial" | "topocentric";

/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "ReferenceFrame".
 */
export interface ReferenceFrame {
  name: string;
  frame_class: FrameClass;
  center?: string | null;
}
/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "PlanetaryCRS".
 */
export interface PlanetaryCRS {
  body: string;
  body_fixed_frame: string;
  reference_radius_m: number;
  projection?: string | null;
  datum?: string | null;
}
/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "Epoch".
 */
export interface Epoch {
  tdb_seconds: number;
  scale: TimeScale;
}
/**
 * This interface was referenced by `AstroMineUnitsFramesTimeVocabularyV01`'s JSON-Schema
 * via the `definition` "EpochWindow".
 */
export interface EpochWindow {
  start: Epoch;
  end: Epoch;
}
