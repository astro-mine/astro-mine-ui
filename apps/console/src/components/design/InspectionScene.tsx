"use client";

// The candidate, on the world, in 3D (ui#17; view.md; UC-F5).
//
// **The heavy module.** Nothing may import this statically — `InspectionPane` loads it through
// `next/dynamic` with `ssr: false`, for the same reasons `ReplayScene` is loaded that way: Cesium
// touches `window` at import time, and a route that never draws a globe must not pay for one.
//
// **The terrain is bytes Studio verified and did not author.** Resolving a world asks the backend
// to pull it and re-verify its supply chain; what arrives here is a manifest URL, and the scene
// renders what that manifest describes. This component makes no claim about the terrain beyond
// where it came from.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EntityLayer, GlobeScene, SwarmLayer } from "@astro-mine/view";

import type { UnitPlacement } from "./layout";
import type { WorldResponse } from "./types";

export interface InspectionSceneProps {
  readonly world: WorldResponse;
  /**
   * Where the world's `world.json` actually is — `world.manifest_url` resolved against the API.
   *
   * Passed in rather than read off `world`, because the response carries an **API-rooted path**
   * (`/studio/worlds/files/…`) and this application is a static export the browser serves from its
   * own origin (`ui.md` §5.1). Fetched as-is it resolves against the page and 404s, and the scene
   * then reports "terrain unavailable" — which reads as a bad world bundle rather than as a URL
   * assembled against the wrong host. The pane owns the deployment's configuration, so the pane
   * does the join; see `data/apiUrl.ts` and `ReplayPane`, which passes its URL the same way.
   */
  readonly manifestUrl: string;
  readonly placements: readonly UnitPlacement[];
  /**
   * Where each asset's geometry is, by reference — from `GET /studio/catalog/preview/{ref}`.
   *
   * A reference the map does not carry draws as a glyph and is **labelled as one** rather than
   * dropped, which is ui#17's requirement: an asset whose preview will not resolve is still a unit
   * that is there.
   */
  readonly geometry: Readonly<Record<string, string>>;
}

export function InspectionScene({
  world,
  manifestUrl,
  placements,
  geometry,
}: InspectionSceneProps) {
  return (
    <Box>
      <Box
        sx={{
          height: 480,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <GlobeScene
          world={{ manifestUrl }}
          showStatus
          showCoordinates
          style={{ width: "100%", height: "100%" }}
        >
          {/* **`SwarmLayer` needs a layer, and this is where one comes from** (ui#57). It calls
              `useEntityLayer()`, which throws unless an `<EntityLayer>` is above it — `GlobeScene`
              supplies the globe context and deliberately not this one, because a layer is the
              scoped, self-cleaning collection a host mounts and discards per swarm.

              It was missing from `ui#17` and could not fire: jsdom cannot mount Cesium, and the
              built export's Cesium chunk was not parseable JavaScript (ui#55), so this scene never
              rendered in a browser either. The moment ui#56 repaired the chunk it threw during
              render and the error boundary took the whole study page — worse than the spinner it
              replaced. The journeys lane is the only thing that can see this. */}
          <EntityLayer name="design-inspection">
            <SwarmLayer
              placements={placements.map((placement) => {
                const documentUrl = geometry[placement.assetRef];
                return {
                  id: placement.id,
                  // A SADF document when the preview resolved; otherwise a source that cannot, which
                  // `SwarmLayer` draws as a distinctly-coloured glyph and counts as unrenderable. The
                  // pane says which below rather than leaving the colour to carry it.
                  source:
                    documentUrl === undefined
                      ? { gltfUrl: "", assetId: placement.assetRef }
                      : { documentUrl },
                  pose: placement.pose,
                };
              })}
            />
          </EntityLayer>
        </GlobeScene>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Terrain from <Box component="code">{world.reference}</Box>, pulled and re-verified by the
        backend — these are bytes Studio verified and did not author.
      </Typography>
    </Box>
  );
}
