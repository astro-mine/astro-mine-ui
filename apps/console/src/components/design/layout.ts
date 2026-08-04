// Where the units go, and why that is a convention rather than a result (ui#17; UC-F5).
//
// **A `DesignCandidate` carries counts, not positions.** Its `swarm` is a list of
// `{sadf_ref, count}` — how many of which robot — and nothing anywhere in a trade study says where
// any of them stands. That is correct: a candidate is a *composition*, and where the units end up
// is what the simulator decides.
//
// Which means the 3D pane has a choice, and only one honest version of it. It can draw nothing, or
// it can arrange the units by a rule and **say that the arrangement is its own**. ui#17 takes the
// second and requires the disclosure in as many words: *"The unit positions are a design-time
// convention, not a simulated pose, and the scene is pixel-identical either way — so the pane says
// so."* Same argument as the evaluator banner one panel over: nothing in the picture can carry the
// difference between a placement somebody computed and a placement this file invented.
//
// **The rule is deterministic and boring on purpose.** A ring around the world's site, one unit per
// step, radius growing with the swarm. Deterministic so two readers looking at the same candidate
// see the same picture; boring so nobody mistakes it for an optimizer's answer.

import { geodeticToCartesian, IDENTITY_QUAT } from "@astro-mine/view";
import type { Pose } from "@astro-mine/view";

import type { DesignCandidate, WorldResponse } from "./types";

/** Metres between adjacent units on the ring. Wide enough that models do not intersect. */
const SPACING_M = 25;

/** One placed unit: the slot's handle, and which asset it is an instance of. */
export interface UnitPlacement {
  readonly id: string;
  readonly assetRef: string;
  readonly pose: Pose;
}

/** How many units a candidate declares, across every asset in its swarm. */
export function unitCount(candidate: DesignCandidate): number {
  return candidate.swarm.reduce((total, selection) => total + selection.count, 0);
}

/**
 * Arrange a candidate's units around a world's site.
 *
 * Returns an empty array when there is nothing to place — no site, or no units — because the pane
 * distinguishes those two cases in words and needs to be told which, not handed a fabricated pose.
 */
export function arrange(
  candidate: DesignCandidate,
  world: WorldResponse,
): readonly UnitPlacement[] {
  const site = world.site;
  if (site == null) return [];

  const total = unitCount(candidate);
  if (total === 0) return [];

  const crs = {
    body: site.body,
    body_fixed_frame: site.frame,
    reference_radius_m: site.reference_radius_m,
  };

  // Arc length → angle on the reference sphere, so the spacing is metres on the ground rather than
  // degrees, which would bunch up near a pole — and the anchor scenario is a polar site.
  const radiusM = Math.max(SPACING_M, (SPACING_M * total) / (2 * Math.PI));
  const angularRadius = radiusM / site.reference_radius_m;

  const placements: UnitPlacement[] = [];
  let index = 0;

  for (const selection of candidate.swarm) {
    for (let n = 0; n < selection.count; n += 1) {
      const bearing = (2 * Math.PI * index) / total;
      const latitudeRad = (site.latitude_deg * Math.PI) / 180 + angularRadius * Math.cos(bearing);
      // Longitude converges toward a pole; dividing by cos(lat) keeps the ground spacing even.
      const cosLat = Math.max(Math.cos(latitudeRad), 1e-6);
      const longitudeRad =
        (site.longitude_deg * Math.PI) / 180 + (angularRadius * Math.sin(bearing)) / cosLat;

      placements.push({
        id: `${selection.sadf_ref}#${n + 1}`,
        assetRef: selection.sadf_ref,
        pose: {
          translationM: geodeticToCartesian(crs, {
            latitudeRad,
            longitudeRad,
            heightM: site.height_m,
          }),
          // No attitude is declared anywhere either, so identity — and the disclosure covers this
          // as much as it covers the positions.
          rotationQuatXyzw: IDENTITY_QUAT,
        },
      });
      index += 1;
    }
  }

  return placements;
}

/**
 * Why there is no swarm to draw, or `null` when there is one.
 *
 * **Four cases, four fixes**, which is exactly why ui#17 asks for them separately: pick a
 * candidate, resolve a world, republish a bundle that carries an anchor, or fix a candidate that
 * declares no units. One "nothing to show" message would send three of those four readers to do
 * the wrong thing.
 */
export type NoSwarmReason = "no-candidate" | "no-world" | "no-anchor" | "no-units";

export function noSwarmReason(
  candidate: DesignCandidate | undefined,
  world: WorldResponse | undefined,
): NoSwarmReason | null {
  if (candidate === undefined) return "no-candidate";
  if (world === undefined) return "no-world";
  // A bundle with no site publishes no anchor, so there is no point on the body to place anything
  // relative to. The terrain may still draw; the swarm cannot.
  if (world.site == null) return "no-anchor";
  if (unitCount(candidate) === 0) return "no-units";
  return null;
}
