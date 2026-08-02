/**
 * Turning a resolved Fleet asset into a Cesium primitive — the one place View's pose vocabulary
 * meets Cesium's (view.md §3; `frames/` stays renderer-free).
 *
 * **Fleet's glTF is spec-conformant, so Cesium's default axes are correct.** A SADF mesh is authored
 * in the body frame (x-forward, y-left, z-up), but glTF 2.0 fixes its own axes at +Y up, +Z forward.
 * Fleet used to serialize body-frame vertices straight into the `.glb`, producing a file that claimed
 * to be Y-up and was not; View compensated with `upAxis: Axis.Z, forwardAxis: Axis.X`, while every
 * other glTF consumer rendered the asset on its side. Since
 * [astro-mine-fleet#28](https://github.com/astro-mine/astro-mine-fleet/issues/28) the exporter
 * carries the body→glTF rotation on the mesh node — leaving vertex data identical to the sibling
 * `.usda` — so the file orients itself and View overrides nothing.
 *
 * That is still a *contract* with Fleet's exporter, not an assumption:
 * `scripts/gen-asset-fixture.py` asserts the committed glTF puts the body's `+z` on glTF `+y` with a
 * proper (non-mirroring) rotation, so a Fleet regression fails fixture regeneration rather than
 * quietly laying every rover on its side.
 */

import { Cartesian3, Matrix4, Model, Quaternion } from "cesium";
import type { DistanceDisplayCondition } from "cesium";

import { composePose } from "../frames/pose";
import type { Pose } from "../frames/pose";
import type { ResolvedAsset } from "./assetSource";

const UNIT_SCALE = new Cartesian3(1, 1, 1);

/** A body-fixed `Pose` as the `Matrix4` Cesium places a primitive with. */
export function poseToModelMatrix(pose: Pose, result?: Matrix4): Matrix4 {
  const { translationM: t, rotationQuatXyzw: q } = pose;
  return Matrix4.fromTranslationQuaternionRotationScale(
    new Cartesian3(t.xM, t.yM, t.zM),
    new Quaternion(q.x, q.y, q.z, q.w),
    UNIT_SCALE,
    result,
  );
}

export interface AssetModelOptions {
  /** Where the asset's `root_frame` sits in the body-fixed frame. Supplied by the host, never computed. */
  readonly pose: Pose;
  /** Never let a distant asset shrink below this many pixels — a swarm of invisible dots is a blank scene. */
  readonly minimumPixelSize?: number;
  /** Restrict the model to a camera-distance range, so a far asset draws as a glyph instead. */
  readonly distanceDisplayCondition?: DistanceDisplayCondition;
  /** Opaque payload attached to the primitive, for picking. */
  readonly id?: unknown;
}

/**
 * Load `asset`'s visual glTF and place it at `pose`.
 *
 * The mesh's own offset within the asset (`GeometryRef.frame`, resolved through the SADF frame tree)
 * is composed with the supplied pose here, so a mesh authored on a sensor mast lands on the mast.
 *
 * Cesium's `ResourceCache` keys parsed glTF and GPU vertex buffers by URL, so N models sharing one
 * `gltfUrl` — every member of a homogeneous swarm — upload their geometry once.
 */
export async function createAssetModel(
  asset: ResolvedAsset,
  options: AssetModelOptions,
): Promise<Model> {
  return Model.fromGltfAsync({
    url: asset.gltfUrl,
    modelMatrix: poseToModelMatrix(composePose(options.pose, asset.geometryOffset)),
    minimumPixelSize: options.minimumPixelSize,
    distanceDisplayCondition: options.distanceDisplayCondition,
    id: options.id,
    // Fleet's collision hulls are a separate GeometryRef; the visual mesh is not a picking proxy.
    allowPicking: true,
  });
}
