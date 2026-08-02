/**
 * Rigid poses — a structural mirror of Core's `Transform` (`astro_mine.core.sadf.model.Transform`,
 * and the identical shape on the wire as `StateSample.pose`).
 *
 * View **owns no fleet state and computes no poses** (view.md §1, §2 principle 1): a host hands the
 * scene the pose an asset is at, and the scene draws it there. What lives here is the vocabulary for
 * saying so, plus one closed-form *constructor* — `poseFromGeodetic` — for the common design-time
 * case where a host is placing a candidate swarm by hand and thinks in "on the surface, at this
 * lon/lat, facing that way" rather than in body-fixed quaternions. Constructing a pose a host asked
 * for is not the same as computing where an asset is.
 *
 * Pure TypeScript, no Cesium: `globe/` turns a `Pose` into a `Matrix4`.
 */

import { geodeticToCartesian } from "./coords";
import type { Cartesian, Geodetic, PlanetaryCRS } from "./types";

/** A unit quaternion, **scalar-last** `(x, y, z, w)` — Core's `Quat`, and Cesium's order too. */
export interface Quat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/**
 * A rigid transform of an asset's root frame relative to the body-fixed frame. SI metres.
 *
 * Field names mirror Core's `Transform` (`translation_m`, `rotation_quat_xyzw`) in this repo's
 * camelCase, so a generated Core TS client can replace this type without a rename.
 */
export interface Pose {
  readonly translationM: Cartesian;
  readonly rotationQuatXyzw: Quat;
}

/** The identity rotation. */
export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * The asset body frame is **x-forward, y-left, z-up** — the URDF/SDF convention SADF inherits, and
 * the frame Fleet's exported geometry is expressed in. `headingRad` rotates the body about its own
 * `up` axis, measured from north toward east, so heading 0 faces north.
 */
export interface SurfaceAttitude {
  readonly headingRad: number;
}

function quatFromColumns(
  [xx, xy, xz]: readonly [number, number, number],
  [yx, yy, yz]: readonly [number, number, number],
  [zx, zy, zz]: readonly [number, number, number],
): Quat {
  // Shepperd's method: pivot on the largest of the four squared components so the square root is
  // never taken of a near-zero quantity. The naive `w = sqrt(1 + trace) / 2` loses all precision at
  // a 180° rotation, which for a pole-adjacent, north-facing asset is entirely reachable.
  const trace = xx + yy + zz;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return { x: (yz - zy) / s, y: (zx - xz) / s, z: (xy - yx) / s, w: s / 4 };
  }
  if (xx > yy && xx > zz) {
    const s = Math.sqrt(1 + xx - yy - zz) * 2;
    return { x: s / 4, y: (yx + xy) / s, z: (zx + xz) / s, w: (yz - zy) / s };
  }
  if (yy > zz) {
    const s = Math.sqrt(1 + yy - xx - zz) * 2;
    return { x: (yx + xy) / s, y: s / 4, z: (zy + yz) / s, w: (zx - xz) / s };
  }
  const s = Math.sqrt(1 + zz - xx - yy) * 2;
  return { x: (zx + xz) / s, y: (zy + yz) / s, z: s / 4, w: (xy - yx) / s };
}

/**
 * The rotation taking a local **east-north-up** frame at `geodetic` into the body-fixed frame.
 *
 * The basis is written in closed form rather than as `normalize(cross(z, up))`. The cross-product
 * construction degenerates as `up` approaches the pole — and the anchor world sits at latitude −89°,
 * where it is already ill-conditioned. These expressions are exact everywhere except the pole
 * itself, where longitude is meaningless anyway. (Worlds derives its tileset `root.transform` the
 * same way, for the same reason.)
 */
export function enuToBodyFixedQuat(geodetic: Geodetic): Quat {
  const sinLon = Math.sin(geodetic.longitudeRad);
  const cosLon = Math.cos(geodetic.longitudeRad);
  const sinLat = Math.sin(geodetic.latitudeRad);
  const cosLat = Math.cos(geodetic.latitudeRad);

  const east = [-sinLon, cosLon, 0] as const;
  const north = [-sinLat * cosLon, -sinLat * sinLon, cosLat] as const;
  const up = [cosLat * cosLon, cosLat * sinLon, sinLat] as const;

  return quatFromColumns(east, north, up);
}

/** Hamilton product `a ⊗ b`, scalar-last. Applying `a ⊗ b` rotates by `b` first, then `a`. */
export function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

/** Rotate a vector by a unit quaternion. */
export function rotateVector(q: Quat, v: Cartesian): Cartesian {
  const tx = 2 * (q.y * v.zM - q.z * v.yM);
  const ty = 2 * (q.z * v.xM - q.x * v.zM);
  const tz = 2 * (q.x * v.yM - q.y * v.xM);
  return {
    xM: v.xM + q.w * tx + (q.y * tz - q.z * ty),
    yM: v.yM + q.w * ty + (q.z * tx - q.x * tz),
    zM: v.zM + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/**
 * Compose two rigid transforms: the pose of `child`'s frame expressed in `parent`'s parent frame.
 *
 * This is how a SADF frame tree resolves — a geometry declared in a child frame is placed by walking
 * its `Frame.transform` chain up to the asset's `root_frame`, then applying the asset's own pose.
 */
export function composePose(parent: Pose, child: Pose): Pose {
  const rotated = rotateVector(parent.rotationQuatXyzw, child.translationM);
  return {
    translationM: {
      xM: parent.translationM.xM + rotated.xM,
      yM: parent.translationM.yM + rotated.yM,
      zM: parent.translationM.zM + rotated.zM,
    },
    rotationQuatXyzw: multiplyQuat(parent.rotationQuatXyzw, child.rotationQuatXyzw),
  };
}

/** The zero translation / identity rotation. Composing with it changes nothing. */
export const IDENTITY_POSE: Pose = {
  translationM: { xM: 0, yM: 0, zM: 0 },
  rotationQuatXyzw: IDENTITY_QUAT,
};

/**
 * The rotation taking the x-forward/y-left/z-up body frame into the east-north-up frame, for an
 * asset standing upright with the given heading.
 *
 * At heading 0 the body's forward axis is north and its left axis is west, which is right-handed
 * with up. A positive heading swings forward toward east.
 */
function bodyToEnuQuat({ headingRad }: SurfaceAttitude): Quat {
  const sin = Math.sin(headingRad);
  const cos = Math.cos(headingRad);

  const forward = [sin, cos, 0] as const;
  const left = [-cos, sin, 0] as const;
  const up = [0, 0, 1] as const;

  return quatFromColumns(forward, left, up);
}

/**
 * Place an upright asset on the body at `geodetic`, facing `attitude.headingRad`.
 *
 * `geodetic.heightM` is measured from the CRS reference sphere, the same datum a world bundle's
 * `tiles_anchor` uses — so an asset standing on the terrain patch has
 * `heightM = tiles_anchor.origin.height_m + <its height above the local mesh>`.
 */
export function poseFromGeodetic(
  crs: PlanetaryCRS,
  geodetic: Geodetic,
  attitude: SurfaceAttitude = { headingRad: 0 },
): Pose {
  return {
    translationM: geodeticToCartesian(crs, geodetic),
    rotationQuatXyzw: multiplyQuat(enuToBodyFixedQuat(geodetic), bodyToEnuQuat(attitude)),
  };
}
