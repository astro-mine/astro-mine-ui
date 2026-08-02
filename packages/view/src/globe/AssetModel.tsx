/**
 * `<AssetModel>` — one Fleet asset's glTF geometry, placed at a supplied pose (RM-P1-VIEW-03).
 *
 * Read-mostly: the pose comes from the host, and the geometry comes from the asset's SADF document.
 * This component owns neither (view.md §2 principle 1). Motion over time is replay's job, not this
 * component's (RM-P1-VIEW-04).
 *
 * Degrade, don't blank (view.md §2 principle 5): an asset whose document is unreachable, or whose
 * mesh fails to load, still marks its position — as a labelled glyph — rather than vanishing from a
 * scene the operator is using to count vehicles.
 *
 * Renders no DOM. It adds a primitive to the enclosing `<EntityLayer>` and removes it on unmount.
 */
import { useEffect, useState } from "react";
import { Cartesian3, Color, HeadingPitchRange, Matrix4, NearFarScalar } from "cesium";
import type { DistanceDisplayCondition, Model } from "cesium";

import { IDENTITY_POSE } from "../frames/pose";
import type { Pose } from "../frames/pose";
import { createAssetModel } from "./assetGeometry";
import { useEntityLayer, useGlobe } from "./context";
import { INITIALIZING } from "./status";
import type { GlobeStatus } from "./status";
import { useResolvedAsset } from "./useAssetGeometry";
import type { AssetSource } from "./assetSource";

/** Never let an asset shrink below this on screen: a swarm of sub-pixel rovers is a blank globe. */
export const DEFAULT_MINIMUM_PIXEL_SIZE = 24;

/** The camera framing a preview uses: three-quarter view, slightly above the horizon. */
const PREVIEW_VIEW = new HeadingPitchRange(-Math.PI / 4, -0.35, 0);

export interface AssetModelProps {
  /** The Fleet asset to render — normally `{ documentUrl }` pointing at a SADF document. */
  readonly source: AssetSource;
  /** Where the asset's root frame sits in the body-fixed frame. Defaults to the body centre. */
  readonly pose?: Pose;
  readonly minimumPixelSize?: number;
  readonly distanceDisplayCondition?: DistanceDisplayCondition;
  /** Frame the camera on the model once it loads. The asset-preview widget's behaviour. */
  readonly frameCamera?: boolean;
  /** Injectable `fetch`, for tests and for hosts that proxy the document. */
  readonly fetchImpl?: typeof fetch;
  readonly onStatusChange?: (status: GlobeStatus) => void;
}

export function AssetModel({
  source,
  pose = IDENTITY_POSE,
  minimumPixelSize = DEFAULT_MINIMUM_PIXEL_SIZE,
  distanceDisplayCondition,
  frameCamera = false,
  fetchImpl,
  onStatusChange,
}: AssetModelProps): null {
  const { viewer } = useGlobe();
  const { primitives, entities } = useEntityLayer();
  const { asset, error, pending } = useResolvedAsset(source, fetchImpl);
  const [loadStatus, setLoadStatus] = useState<GlobeStatus>(INITIALIZING);

  // Resolving and unavailable are *derived*, not stored: both are a pure function of what the
  // resolver returned, and storing a value you can compute is how the two get out of step.
  const resolverStatus: GlobeStatus | null = pending
    ? INITIALIZING
    : error !== null || asset === null
      ? {
          kind: "unavailable",
          detail: `Asset unavailable (${error?.message ?? "not resolved"}) — showing its position only.`,
        }
      : null;

  // The derived answer wins while the resolver is still working or has failed; the stored
  // one only speaks once there is an asset to load geometry for.
  const status = resolverStatus ?? loadStatus;

  useEffect(() => {
    if (pending || error !== null || asset === null) return;

    let cancelled = false;
    let model: Model | undefined;
    const safely = (next: GlobeStatus) => {
      if (!cancelled) setLoadStatus(next);
    };

    safely({ kind: "loading", detail: `Loading geometry for ${asset.name}…` });

    createAssetModel(asset, { pose, minimumPixelSize, distanceDisplayCondition, id: asset }).then(
      (loaded) => {
        if (cancelled || viewer.isDestroyed()) {
          loaded.destroy();
          return;
        }
        model = loaded;

        loaded.readyEvent.addEventListener(() => {
          if (cancelled || viewer.isDestroyed()) return;
          if (frameCamera) {
            viewer.camera.viewBoundingSphere(loaded.boundingSphere, PREVIEW_VIEW);
            // `viewBoundingSphere` leaves the camera locked to the model's reference frame; a
            // preview the user can orbit needs it released.
            viewer.camera.lookAtTransform(Matrix4.IDENTITY);
          }
          safely({ kind: "ready", detail: `${asset.name} — geometry ready` });
        });
        loaded.errorEvent.addEventListener((cause: unknown) => {
          safely({
            kind: "unavailable",
            detail: `Geometry failed to render (${String(cause)}) — showing its position only.`,
          });
        });

        primitives.add(loaded);
      },
      (cause: unknown) => {
        safely({
          kind: "unavailable",
          detail: `Geometry unavailable (${String(cause)}) — showing its position only.`,
        });
      },
    );

    return () => {
      cancelled = true;
      if (viewer.isDestroyed()) return;
      if (model !== undefined) primitives.remove(model);
    };
  }, [
    viewer,
    primitives,
    asset,
    error,
    pending,
    pose,
    minimumPixelSize,
    distanceDisplayCondition,
    frameCamera,
  ]);

  // The glyph that keeps a failed asset on the map. Scoped to this layer's data source, so it
  // unmounts with the component and never leaks into `viewer.entities`.
  useEffect(() => {
    if (status.kind !== "unavailable") return;

    const entity = entities.entities.add({
      position: new Cartesian3(pose.translationM.xM, pose.translationM.yM, pose.translationM.zM),
      point: {
        pixelSize: 10,
        color: Color.ORANGERED,
        outlineColor: Color.WHITE,
        outlineWidth: 1,
        scaleByDistance: new NearFarScalar(1.0e2, 1.4, 1.0e5, 0.6),
      },
    });
    return () => {
      if (!viewer.isDestroyed()) entities.entities.remove(entity);
    };
  }, [viewer, entities, status.kind, pose]);

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  return null;
}
