/**
 * `<EntityLayer>` — a scoped, self-cleaning place to put things on the globe.
 *
 * The entity-layer scaffold this issue owes RM-P1-VIEW-03 (asset & candidate-swarm geometry) and
 * RM-P1-VIEW-04 (replay-driven poses). A child asks `useEntityLayer()` for two collections and adds
 * to whichever suits it:
 *
 * - `primitives` — a `PrimitiveCollection` for batched/instanced draws, the path a many-asset swarm
 *   must take (view.md §8: a naïve entity-per-asset collapses at swarm scale).
 * - `entities` — a `CustomDataSource` for the convenient entity API, scoped so this layer's entities
 *   unmount with it and never leak into `viewer.entities`.
 *
 * Both are torn down on unmount, which is what lets Studio mount and discard candidate swarms in a
 * comparison UI without the scene accumulating dead geometry.
 */
import { useEffect, useState } from "react";
import type { ReactNode, JSX } from "react";
import { CustomDataSource, PrimitiveCollection } from "cesium";

import { EntityLayerContext, useGlobe } from "./context";
import type { EntityLayerValue } from "./context";

export interface EntityLayerProps {
  /** Names the layer's data source, so a host can find it in Cesium's inspector. */
  readonly name?: string;
  readonly children?: ReactNode;
}

export function EntityLayer({
  name = "astro-mine-view",
  children,
}: EntityLayerProps): JSX.Element | null {
  const { viewer } = useGlobe();
  const [layer, setLayer] = useState<EntityLayerValue | null>(null);

  useEffect(() => {
    const primitives: PrimitiveCollection = viewer.scene.primitives.add(new PrimitiveCollection());
    const entities = new CustomDataSource(name);
    void viewer.dataSources.add(entities);

    // A Cesium PrimitiveCollection cannot be created during render — it attaches itself to a live
    // scene — so the handle to it can only be published after one exists. This is the "synchronise
    // with an external system" case effects are *for*, and the rule cannot tell it apart from a
    // derived value being copied into state. The cleanup below removes it from the scene, which is
    // the other half no derivation could do.
    // object that only exists once the scene has been mutated; see above.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see the note above.
    setLayer({ primitives, entities });

    return () => {
      setLayer(null);
      if (viewer.isDestroyed()) return;
      viewer.dataSources.remove(entities, true);
      viewer.scene.primitives.remove(primitives);
    };
  }, [viewer, name]);

  if (layer === null) return null;
  return <EntityLayerContext.Provider value={layer}>{children}</EntityLayerContext.Provider>;
}
