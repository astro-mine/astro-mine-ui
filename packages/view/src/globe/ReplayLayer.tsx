/**
 * `<ReplayLayer>` — a recorded episode's agents, on the globe, at the shared clock's instant
 * (RM-P1-VIEW-04).
 *
 * This is where the two halves meet, and it is deliberately almost nothing: `timeline/` says *when*,
 * `replay/` says *where each agent was then*, and `<SwarmLayer>` — unchanged in its contract — draws
 * assets at supplied poses. Replay does not get its own renderer, because "live and replay are the
 * same code" (view.md §2 principle 2) only holds if replay is a *source* feeding the ordinary scene,
 * not a parallel one.
 *
 * View still computes no poses: it reads them out of the recording and hands them over.
 */
import { useMemo } from "react";

import { posesAt } from "../replay/track";
import type { ReplayTrack } from "../replay/track";
import { useTimeline } from "../timeline/context";
import type { AssetSource } from "./assetSource";
import { SwarmLayer } from "./SwarmLayer";
import type { SwarmPlacement } from "./SwarmLayer";
import type { GlobeStatus } from "./status";
import type { JSX } from "react";

export interface ReplayLayerProps {
  /** The decoded episode. `null` while it resolves — the layer renders nothing, and does not throw. */
  readonly track: ReplayTrack | null;
  /** The geometry to draw an agent with. Homogeneous by default; `assetFor` overrides per agent. */
  readonly asset: AssetSource;
  readonly assetFor?: (agentId: string) => AssetSource;
  readonly modelBudget?: number;
  readonly modelRangeM?: number;
  readonly onStatusChange?: (status: GlobeStatus) => void;
}

export function ReplayLayer({
  track,
  asset,
  assetFor,
  modelBudget,
  modelRangeM,
  onStatusChange,
}: ReplayLayerProps): JSX.Element | null {
  const { clock } = useTimeline();

  // Rebuilt every frame the clock moves. The array is new each time, but its *membership* is not, so
  // `<SwarmLayer>` writes model matrices rather than reloading twelve glTFs (see its header).
  const placements = useMemo<readonly SwarmPlacement[]>(() => {
    if (track === null) return [];
    return [...posesAt(track, clock.tS)].map(([agentId, pose]) => ({
      id: agentId,
      source: assetFor?.(agentId) ?? asset,
      pose,
    }));
  }, [track, clock.tS, asset, assetFor]);

  if (track === null) return null;

  return (
    <SwarmLayer
      placements={placements}
      modelBudget={modelBudget}
      modelRangeM={modelRangeM}
      onStatusChange={onStatusChange}
    />
  );
}
