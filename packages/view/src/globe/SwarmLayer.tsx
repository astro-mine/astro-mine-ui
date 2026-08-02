/**
 * `<SwarmLayer>` — a candidate swarm of Fleet assets, at supplied poses (RM-P1-VIEW-03).
 *
 * The surface Studio's comparison UI inspects a candidate swarm through (studio.md §6;
 * RM-P1-STUDIO-06). Read-mostly and static: poses come from the host, motion over time is replay
 * (RM-P1-VIEW-04), and server-side aggregation for very large swarms is Phase 2.
 *
 * **Why this is not an entity per asset.** `view.md` §8 is explicit: "a naïve Cesium entity per
 * asset collapses at swarm scale… batched/instanced primitives, LOD/clustering (glyphs at
 * distance)". Cesium exposes no public instanced-model collection, so batching here means three
 * things, in order of how much they buy:
 *
 * 1. **One glyph collection for the whole swarm.** Every placement gets a point in a single
 *    `PointPrimitiveCollection` — one draw call for the entire swarm, however large.
 * 2. **Distance LOD.** A model draws only inside `modelRangeM`; beyond it, its glyph takes over. The
 *    two `DistanceDisplayCondition`s are complementary, so an asset is always exactly one of the two.
 * 3. **Shared geometry uploads.** Distinct sources resolve once, so every member of a homogeneous
 *    swarm shares one `gltfUrl` — and Cesium's `ResourceCache` keys parsed glTF and GPU vertex
 *    buffers by URL, uploading the mesh once rather than per asset.
 *
 * Above `modelBudget` placements, the overflow renders as glyphs at every distance. That is a cap,
 * so the layer **says so** in its status rather than quietly showing fewer vehicles than the host
 * asked for. Lifting it needs the server-side aggregation view.md §8 defers to Phase 2.
 *
 * **Moving a swarm is a matrix write, not a rebuild.** A static candidate swarm changes `placements`
 * once; a replay changes it every animation frame (RM-P1-VIEW-04). Tearing down and re-fetching
 * twelve `Model`s per frame would be unusable, so when only the *poses* change — the placement ids
 * and their asset sources are unchanged — the layer updates each primitive's `modelMatrix` and each
 * glyph's `position` in place, and rebuilds only when the swarm's membership actually changes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  NearFarScalar,
  PointPrimitiveCollection,
} from "cesium";
import type { Model, PointPrimitive } from "cesium";

import { composePose, IDENTITY_POSE } from "../frames/pose";
import type { Pose } from "../frames/pose";
import { createAssetModel, poseToModelMatrix } from "./assetGeometry";
import { useEntityLayer, useGlobe } from "./context";
import { INITIALIZING } from "./status";
import type { GlobeStatus } from "./status";
import { assetSourceKey, useResolvedAssets } from "./useAssetGeometry";
import type { AssetSource } from "./assetSource";
import { DEFAULT_MINIMUM_PIXEL_SIZE } from "./AssetModel";

/** How many placements get real geometry before the rest degrade to glyphs. */
export const DEFAULT_MODEL_BUDGET = 64;
/** Camera distance, in metres, beyond which an asset draws as a glyph rather than a mesh. */
export const DEFAULT_MODEL_RANGE_M = 20_000;

/** One asset, placed. `id` is the host's handle on it — a Core agent id, or a candidate-slot name. */
export interface SwarmPlacement {
  readonly id: string;
  readonly source: AssetSource;
  readonly pose: Pose;
}

export interface SwarmLayerProps {
  readonly placements: readonly SwarmPlacement[];
  /** Placements beyond this many render as glyphs only. The layer reports the cap it applied. */
  readonly modelBudget?: number;
  readonly modelRangeM?: number;
  readonly minimumPixelSize?: number;
  readonly fetchImpl?: typeof fetch;
  readonly onStatusChange?: (status: GlobeStatus) => void;
}

function positionOf(pose: Pose): Cartesian3 {
  return new Cartesian3(pose.translationM.xM, pose.translationM.yM, pose.translationM.zM);
}

function describe(rendered: number, glyphed: number, failed: number): GlobeStatus {
  if (failed > 0) {
    return {
      kind: "stale",
      detail:
        `${failed} of ${rendered + glyphed + failed} assets have no renderable geometry — ` +
        "showing their positions only.",
    };
  }
  if (glyphed > 0) {
    return {
      kind: "stale",
      detail: `Swarm exceeds the model budget: ${rendered} rendered as geometry, ${glyphed} as glyphs.`,
    };
  }
  return { kind: "ready", detail: `Swarm ready — ${rendered} assets.` };
}

/** What the layer built for one placement, so a later pose can be written straight onto it. */
interface Placed {
  readonly glyph: PointPrimitive;
  /** The mesh's own offset within the asset, composed with every pose. */
  readonly geometryOffset: Pose;
  model: Model | null;
}

/**
 * The identity of the swarm's *membership* — which assets are on stage, not where they stand.
 * Rebuild on a change to this; write matrices on a change to anything else.
 */
function membershipKey(placements: readonly SwarmPlacement[]): string {
  // Control characters as separators: an agent id or an asset URL may hold any printable byte.
  return placements.map((p) => `${p.id}\u0000${assetSourceKey(p.source)}`).join("\u0001");
}

export function SwarmLayer({
  placements,
  modelBudget = DEFAULT_MODEL_BUDGET,
  modelRangeM = DEFAULT_MODEL_RANGE_M,
  minimumPixelSize = DEFAULT_MINIMUM_PIXEL_SIZE,
  fetchImpl,
  onStatusChange,
}: SwarmLayerProps): null {
  const { viewer } = useGlobe();
  const { primitives } = useEntityLayer();
  const [placementStatus, setPlacementStatus] = useState<GlobeStatus>(INITIALIZING);

  const sources = useMemo(() => placements.map((placement) => placement.source), [placements]);
  const { assets, errors, pending } = useResolvedAssets(sources, fetchImpl);

  /**
   * The primitives currently on stage, positionally aligned with `placements`.
   *
   * Indexed, not keyed by `placement.id`: two placements may legitimately share an id — a host
   * comparing two candidate swarms slot-for-slot — and a map would silently collapse them, leaving
   * one vehicle frozen at its initial pose while the layer reported a full swarm. Membership changes
   * rebuild everything, so the indices cannot drift.
   */
  const placedRef = useRef<Placed[]>([]);
  /** The latest placements, for a model that finishes loading after the clock has moved on. */
  const placementsRef = useRef(placements);
  // In an effect, not during render — see TimelineProvider for the reasoning. Declared before
  // the placement effect so a model finishing after the clock moved reads the current pose.
  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  const members = membershipKey(placements);

  // Resolving is derived, not stored — it is exactly `pending` from the resolver, and a copy of a
  // value is a copy that can disagree with it. Only the placement pass below, which is genuinely
  // asynchronous, keeps state.
  const status = pending ? INITIALIZING : placementStatus;

  useEffect(() => {
    if (pending) return;

    let cancelled = false;
    const placed: Placed[] = [];
    placedRef.current = placed;

    // Complementary ranges: a placement draws as geometry near, or as a glyph far — never both,
    // never neither.
    const nearCondition = new DistanceDisplayCondition(0, modelRangeM);
    const farCondition = new DistanceDisplayCondition(modelRangeM, Number.MAX_VALUE);

    const glyphs: PointPrimitiveCollection = primitives.add(new PointPrimitiveCollection());

    let rendered = 0;
    let glyphed = 0;
    let failed = 0;

    for (const [index, placement] of placements.entries()) {
      const asset = assets.get(assetSourceKey(placement.source));
      const resolvable = asset !== undefined;
      const withinBudget = resolvable && rendered < modelBudget;

      if (!resolvable) failed += 1;
      else if (!withinBudget) glyphed += 1;

      const glyph: PointPrimitive = glyphs.add({
        position: positionOf(placement.pose),
        pixelSize: 8,
        // A glyph standing in for geometry we could not load reads differently from one standing in
        // for geometry that is merely too far away to draw.
        color: resolvable ? Color.CORNFLOWERBLUE : Color.ORANGERED,
        outlineColor: Color.WHITE,
        outlineWidth: 1,
        scaleByDistance: new NearFarScalar(1.0e2, 1.5, 1.0e6, 0.5),
        // Budget overflow and unrenderable assets are the only thing marking their position, so they
        // must be visible at every distance.
        distanceDisplayCondition: withinBudget ? farCondition : undefined,
        id: placement.id,
      });

      const entry: Placed = {
        glyph,
        geometryOffset: asset?.geometryOffset ?? IDENTITY_POSE,
        model: null,
      };
      placed.push(entry);

      if (!withinBudget) continue;
      rendered += 1;

      createAssetModel(asset, {
        pose: placement.pose,
        minimumPixelSize,
        distanceDisplayCondition: nearCondition,
        id: placement.id,
      }).then(
        (model) => {
          if (cancelled || viewer.isDestroyed()) {
            model.destroy();
            return;
          }
          entry.model = model;
          // A glTF fetch outlives several animation frames. Place it where the swarm is *now*, not
          // where it was when the load began, or a replayed rover would pop in behind the clock.
          const current = placementsRef.current[index];
          if (current !== undefined) {
            model.modelMatrix = poseToModelMatrix(composePose(current.pose, entry.geometryOffset));
          }
          primitives.add(model);
        },
        () => {
          // The glyph is already on screen; the swarm degrades to it rather than blanking.
        },
      );
    }

    // The outcome of the placement pass, which is the one thing here that is not derivable: it
    // depends on how many models actually loaded, which is only known once they have.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see the note above.
    if (!cancelled) setPlacementStatus(describe(rendered, glyphed, failed));

    return () => {
      cancelled = true;
      if (viewer.isDestroyed()) return;
      for (const entry of placed) {
        if (entry.model !== null) primitives.remove(entry.model);
      }
      primitives.remove(glyphs);
    };
    // `members` is the value-identity of the placement set; a pose-only change is written in place
    // by the effect below rather than rebuilding twelve models.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewer,
    primitives,
    members,
    assets,
    errors,
    pending,
    modelBudget,
    modelRangeM,
    minimumPixelSize,
  ]);

  // Poses move every animation frame under replay. Write them onto the primitives the effect above
  // built; never rebuild them.
  useEffect(() => {
    if (viewer.isDestroyed()) return;
    for (const [index, placement] of placements.entries()) {
      const entry = placedRef.current[index];
      if (entry === undefined) continue;
      entry.glyph.position = positionOf(placement.pose);
      if (entry.model !== null) {
        entry.model.modelMatrix = poseToModelMatrix(
          composePose(placement.pose, entry.geometryOffset),
        );
      }
    }
  }, [viewer, placements, members, assets, pending]);

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  return null;
}
