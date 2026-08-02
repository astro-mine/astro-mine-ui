/**
 * `frames/` — CRS/SPICE-time helpers, unit formatting, coordinate display (RM-P1-VIEW-02).
 *
 * Pure TypeScript with **no Cesium import**, so it runs in the Vitest/jsdom lane and a host can use
 * the vocabulary without a renderer. `globe/` is the only place these types meet Cesium.
 *
 * There is no implicit Earth/WGS84 anywhere: a frame, a CRS, and a time scale are explicit or they
 * are rejected (view.md §2 principle 6; conventions.md §5).
 */

export { FrameClass, TimeScale } from "./types";
export type {
  Cartesian,
  Epoch,
  EpochWindow,
  Geodetic,
  PlanetaryCRS,
  ReferenceFrame,
} from "./types";

export {
  EARTH,
  INERTIAL_J2000,
  J2000_EPOCH,
  LUNAR_SOUTH_POLAR_STEREOGRAPHIC,
  MOON,
  MOON_BODY_FIXED,
  MOON_RADIUS_M,
  SUN,
} from "./constants";

export {
  FramesValidationError,
  isEarthCrs,
  requireCrs,
  requireFrame,
  validateCrsAtWaist,
} from "./guards";

export {
  normalizeLongitude,
  parsePolarStereographic,
  projectToGrid,
  unprojectFromGrid,
} from "./projection";
export type { GridPoint, PolarStereographic } from "./projection";

export { cartesianToGeodetic, geodeticToCartesian } from "./coords";

export {
  composePose,
  enuToBodyFixedQuat,
  IDENTITY_POSE,
  IDENTITY_QUAT,
  multiplyQuat,
  poseFromGeodetic,
  rotateVector,
} from "./pose";
export type { Pose, Quat, SurfaceAttitude } from "./pose";

export {
  formatAngle,
  formatCoordinate,
  formatHeight,
  formatLatitude,
  formatLength,
  formatLongitude,
} from "./units";

export {
  epochFromTdbSeconds,
  formatEpoch,
  formatEphemerisSeconds,
  requireEpoch,
  requireEpochWindow,
} from "./time";
