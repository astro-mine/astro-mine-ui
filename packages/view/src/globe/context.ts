/**
 * The embeddable scene's context contract — the seam a host mounts against and the extension point
 * sibling widgets attach to (view.md §2 principle 4, §3 "extension / plugin points").
 *
 * `useGlobe()` hands a child the live `Viewer`, the world it is rendering, and the CRS that world is
 * expressed in. `useEntityLayer()` hands it a *scoped* primitive/entity collection that unmounts
 * cleanly. Together these are what RM-P1-VIEW-03 (asset geometry) and RM-P1-VIEW-04 (replay-driven
 * poses) build on without a globe-core change.
 *
 * JSX-free on purpose: the provider components live in `GlobeScene.tsx` / `EntityLayer.tsx`, so this
 * module exports no component and the `react-refresh/only-export-components` lint rule stays happy.
 */

import { createContext, useContext } from "react";
import type { CustomDataSource, Ellipsoid, PrimitiveCollection, Viewer } from "cesium";

import type { PlanetaryCRS } from "../frames/types";
import type { GlobeStatus } from "./status";
import type { ResolvedWorld } from "./worldSource";

/** What a child of `<GlobeScene>` can see. Read-mostly: nothing here originates a fleet command. */
export interface GlobeContextValue {
  /** The live CesiumJS viewer. Never null inside the provider. */
  readonly viewer: Viewer;
  /** The body ellipsoid the scene was built with — derived from `crs`, never WGS84. */
  readonly ellipsoid: Ellipsoid;
  /** The CRS every coordinate in this scene is expressed in. */
  readonly crs: PlanetaryCRS;
  /** The resolved world, or `null` when the scene was mounted without a terrain source. */
  readonly world: ResolvedWorld | null;
  readonly status: GlobeStatus;
}

export const GlobeContext = createContext<GlobeContextValue | null>(null);

/**
 * Access the enclosing globe scene. Throws outside a `<GlobeScene>` — a widget that silently
 * rendered nothing because it was mounted in the wrong place would be worse than a stack trace.
 */
export function useGlobe(): GlobeContextValue {
  const value = useContext(GlobeContext);
  if (value === null) {
    throw new Error("useGlobe() must be called inside a <GlobeScene>");
  }
  return value;
}

/** A scoped collection pair owned by the nearest `<EntityLayer>`. */
export interface EntityLayerValue {
  /** Batched/instanced primitives — the path for many-asset swarms (view.md §8). */
  readonly primitives: PrimitiveCollection;
  /** Cesium entities, scoped to this layer so unmounting removes exactly its own. */
  readonly entities: CustomDataSource;
}

export const EntityLayerContext = createContext<EntityLayerValue | null>(null);

/** Access the enclosing entity layer. Throws outside an `<EntityLayer>`. */
export function useEntityLayer(): EntityLayerValue {
  const value = useContext(EntityLayerContext);
  if (value === null) {
    throw new Error("useEntityLayer() must be called inside an <EntityLayer>");
  }
  return value;
}
