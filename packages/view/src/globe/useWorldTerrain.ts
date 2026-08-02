/**
 * Loading Worlds terrain into the scene, and reporting honestly while it happens.
 *
 * Since `RM-P1-WORLDS-16` a Worlds tileset georeferences itself: its `root.transform` is an
 * east-north-up basis at the patch centroid, in the body-fixed frame. Cesium composes
 * `modelMatrix × root.transform`, so a scene that *also* anchors the tileset from the manifest would
 * place the patch **twice**. This hook therefore anchors only a tileset whose `root.transform` is
 * identity — a pre-`WORLDS-16` bundle — and otherwise leaves Cesium to honour the transform Worlds
 * published. It also turns Cesium's load events into the scene's `GlobeStatus`, so a late or partial
 * tileset is *labelled*, never silently blank.
 */

import { useEffect, useMemo, useState } from "react";
import { Cartesian3, Cesium3DTileset, Matrix4, Transforms } from "cesium";
import type { Ellipsoid, Viewer } from "cesium";

import { INITIALIZING } from "./status";
import type { GlobeStatus } from "./status";
import { resolveWorld } from "./worldSource";
import type { ResolvedWorld, WorldSource } from "./worldSource";

/** Default patience before a still-loading tileset is called out as late. */
export const DEFAULT_STALE_AFTER_MS = 15_000;

export interface WorldTerrainOptions {
  /** How long a tileset may keep loading before the scene labels it stale. */
  readonly staleAfterMs?: number;
  /**
   * Hide the smooth reference-sphere globe once terrain is on screen.
   *
   * The patch is anchored at its true mean elevation, which for the anchor world is *below* the
   * reference sphere — so the sphere would bury or slice through the terrain rather than merely
   * z-fight with it. With terrain up the sphere shows nothing useful; with terrain absent or
   * degraded, it is the body the operator still sees.
   */
  readonly hideBodyWithTerrain?: boolean;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

interface ResolveState {
  readonly world: ResolvedWorld | null;
  readonly error: Error | null;
  readonly pending: boolean;
}

/**
 * Resolve a `WorldSource` (fetching its manifest, if any) before the viewer is built.
 *
 * The ellipsoid a `Viewer` is constructed with cannot be changed afterwards, and the authoritative
 * CRS lives in the manifest — so the manifest must be in hand *first*. That ordering is why this is
 * a separate hook from `useWorldTerrain`.
 */
export function useResolvedWorld(source?: WorldSource, fetchImpl?: typeof fetch): ResolveState {
  const [state, setState] = useState<ResolveState>({
    world: null,
    error: null,
    pending: source !== undefined,
  });

  // Hosts pass an inline object literal (`world={{ manifestUrl: "…" }}`), so identity churns every
  // render; key the effect on the source's value instead.
  const sourceKey = useMemo(() => (source === undefined ? null : JSON.stringify(source)), [source]);

  // Reset during render when the world changes, not in the effect — the same "adjusting state when
  // a prop changes" React documents, and used here for the same two reasons as `useResolvedAsset`:
  // the previous world's terrain is never painted for a frame under the new world's name, and no
  // `setState` sits in an effect body for React 19 to reject.
  const [seenKey, setSeenKey] = useState(sourceKey);
  if (seenKey !== sourceKey) {
    setSeenKey(sourceKey);
    setState({ world: null, error: null, pending: sourceKey !== null });
  }

  useEffect(() => {
    if (source === undefined) return;
    let cancelled = false;

    resolveWorld(source, fetchImpl).then(
      (world) => {
        if (!cancelled) setState({ world, error: null, pending: false });
      },
      (error: unknown) => {
        if (!cancelled) setState({ world: null, error: asError(error), pending: false });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceKey is the value-identity of source
  }, [sourceKey, fetchImpl]);

  return state;
}

/**
 * Add `world`'s tileset to the scene, georeferenced, and track its load status.
 *
 * Returns `initializing` until a viewer and a world are both present; a world of `null` with no
 * pending source is a legitimate "body only" scene (the asset-preview case), not a failure.
 */
export function useWorldTerrain(
  viewer: Viewer | null,
  world: ResolvedWorld | null,
  ellipsoid: Ellipsoid | null,
  options: WorldTerrainOptions = {},
): GlobeStatus {
  const { staleAfterMs = DEFAULT_STALE_AFTER_MS, hideBodyWithTerrain = true } = options;
  const [status, setStatus] = useState<GlobeStatus>(INITIALIZING);

  useEffect(() => {
    if (viewer === null || world === null || ellipsoid === null) return;

    let cancelled = false;
    let tileset: Cesium3DTileset | undefined;
    const safely = (next: GlobeStatus) => {
      if (!cancelled) setStatus(next);
    };

    safely({ kind: "loading", detail: `Loading terrain for ${world.worldId}…` });

    const staleTimer = globalThis.setTimeout(() => {
      // Only escalate a *still-loading* scene; a ready or failed one has already spoken.
      setStatus((previous) =>
        cancelled || previous.kind !== "loading"
          ? previous
          : { kind: "stale", detail: "Terrain tiles are late — showing what has arrived." },
      );
    }, staleAfterMs);

    Cesium3DTileset.fromUrl(world.tilesetUrl).then(
      (loaded) => {
        if (cancelled || viewer.isDestroyed()) {
          loaded.destroy();
          return;
        }
        tileset = loaded;

        // A georeferenced tileset places itself. Anchoring it again here would compose our
        // `modelMatrix` with its `root.transform` and put the patch somewhere off the body entirely.
        // A legacy tileset (identity transform) still renders — degrade, don't blank — anchored from
        // the manifest's `tiles_anchor`, exactly as View did before WORLDS-16.
        if (Matrix4.equals(loaded.root.transform, Matrix4.IDENTITY)) {
          const origin = Cartesian3.fromRadians(
            world.origin.longitudeRad,
            world.origin.latitudeRad,
            world.origin.heightM,
            ellipsoid,
          );
          loaded.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin, ellipsoid);
        }

        loaded.tileFailed.addEventListener(() => {
          safely({
            kind: "stale",
            detail: "Some terrain tiles failed to load — scene is partial.",
          });
        });
        loaded.initialTilesLoaded.addEventListener(() => {
          if (cancelled || viewer.isDestroyed()) return;
          if (hideBodyWithTerrain) viewer.scene.globe.show = false;
          setStatus((previous) =>
            previous.kind === "stale"
              ? previous
              : { kind: "ready", detail: `Terrain ready — ${world.worldId}` },
          );
        });

        viewer.scene.primitives.add(loaded);
        void viewer.zoomTo(loaded);
      },
      (error: unknown) => {
        globalThis.clearTimeout(staleTimer);
        if (!cancelled && !viewer.isDestroyed()) viewer.scene.globe.show = true;
        safely({
          kind: "unavailable",
          detail: `Terrain unavailable (${asError(error).message}) — showing the bare body.`,
        });
      },
    );

    return () => {
      cancelled = true;
      globalThis.clearTimeout(staleTimer);
      if (viewer.isDestroyed()) return;
      viewer.scene.globe.show = true;
      if (tileset !== undefined) viewer.scene.primitives.remove(tileset);
    };
  }, [viewer, world, ellipsoid, staleAfterMs, hideBodyWithTerrain]);

  return status;
}
