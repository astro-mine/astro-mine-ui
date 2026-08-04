"use client";

// Choose a world, and inspect a candidate on it (ui#17; UC-F5, UC-C4; studio.md §6).
//
// **Terrain is reachable from a control.** ui#17's first acceptance criterion, and it is a
// criterion because the retired console required editing a URL parameter to change worlds — which
// is a capability that exists and that nobody can find. The worlds this deployment has come from
// `GET /studio/catalog/worlds`; resolving one asks the backend to pull it and re-verify its supply
// chain.
//
// **Four "no swarm" cases, four explanations**, because their fixes are four different things —
// see `layout.ts`. One "nothing to show" would send three readers out of four to do the wrong
// thing.
//
// **The layout disclosure is not optional.** A candidate declares counts, never positions, so the
// arrangement drawn is this application's own convention. The scene is pixel-identical either way,
// which is precisely why it has to be words — the same rule as the evaluator banner one panel over.
//
// **The 3D pane is code-split** and absent from every route that does not draw one, asserted in the
// build lane beside the replay assertion.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState, StandInBanner } from "@astro-mine/ui";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { CESIUM_BASE_URL } from "@/components/Globe";

import { arrange, noSwarmReason, unitCount, type NoSwarmReason } from "./layout";
import type { DesignCandidate, WorldResponse } from "./types";

const InspectionScene = dynamic(
  async () => {
    // Before the import, never after — Cesium reads this global as its module body runs.
    (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;
    const scene = await import("./InspectionScene");
    return scene.InspectionScene;
  },
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          color: "text.secondary",
        }}
      >
        <CircularProgress size={24} aria-label="Loading the 3D pane" />
      </Box>
    ),
  },
);

/** What to say for each of the four no-swarm cases. Different fixes, different words. */
const NO_SWARM: Readonly<Record<NoSwarmReason, { title: string; body: string }>> = {
  "no-candidate": {
    title: "No candidate selected",
    body: "Pick a candidate from the comparison above and its swarm is placed on the terrain below.",
  },
  "no-world": {
    title: "No world resolved",
    body: "Choose a world from the control above. Resolving one asks the backend to pull it and re-verify its supply chain before anything is drawn.",
  },
  "no-anchor": {
    title: "This world bundle publishes no site anchor",
    body: "The bundle carries terrain but names no point on the body to place anything relative to, so there is nowhere to put a swarm. The terrain still draws. Republishing the bundle with its `tiles_anchor` is the fix — this is a property of the world, not of the candidate.",
  },
  "no-units": {
    title: "This candidate declares no units",
    body: "Its swarm is empty, so there is nothing to place. A candidate with no units will also score nothing, which reads as a poor design and is not one.",
  },
};

export interface InspectionPaneProps {
  /** The candidate the comparison has selected, if any. */
  readonly candidate?: DesignCandidate;
  /** Notified when a world resolves — `ui#18` records it on the published campaign. */
  readonly onWorldResolved?: (world: WorldResponse | undefined) => void;
}

export function InspectionPane({ candidate, onWorldResolved }: InspectionPaneProps) {
  const [reference, setReference] = useState("");

  const worlds = useApiQuery((client, signal) => client.studioListWorlds({ signal }), []);

  const resolved = useApiQuery(
    (client, signal) => client.studioResolveWorld({ path: { reference } }, { signal }),
    [reference],
    { enabled: reference !== "" },
  );

  const world = resolved.status === "ready" ? resolved.data : undefined;

  // `ui#18` records which terrain the design was checked on, so the resolved world is reported
  // upward. An effect rather than a render-time call: notifying a parent during render is a state
  // update in somebody else's component mid-render, which React rejects.
  useEffect(() => {
    onWorldResolved?.(world);
  }, [world, onWorldResolved]);

  const placements = useMemo(
    () => (candidate === undefined || world === undefined ? [] : arrange(candidate, world)),
    [candidate, world],
  );

  const references = useMemo(
    () => [...new Set(placements.map((placement) => placement.assetRef))],
    [placements],
  );

  const reason = noSwarmReason(candidate, world);

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        World and 3D inspection
      </Typography>

      <ApiResult
        query={worlds}
        loadingLabel="Listing the worlds this deployment has…"
        empty={
          <EmptyState
            title="This deployment publishes no worlds"
            hint="There is no terrain to inspect a candidate against. Publish a world bundle, or point this deployment at a registry that has one."
          />
        }
        remedy="The world catalog is one of the routes that fails without the deployment's registry wiring — the reason above is the backend's own."
      >
        {(entries) => (
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel id="world-picker-label">World</InputLabel>
            <Select
              labelId="world-picker-label"
              label="World"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            >
              {entries.map((entry) => (
                <MenuItem key={entry.reference} value={entry.reference}>
                  {entry.reference}
                  {entry.body == null ? "" : ` · ${entry.body}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </ApiResult>

      {resolved.status === "failed" ? (
        <Box sx={{ my: 2 }}>
          {/* The backend's own reason. The world and preview routes are among those that fail when
              a deployment lacks its registry wiring, and that is a different problem from a world
              that does not exist. */}
          <Alert severity="degraded" role="status">
            <AlertTitle>That world could not be resolved</AlertTitle>
            <Typography variant="body2">{resolved.failure.detail}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Resolving pulls the bundle and re-verifies it, so this fails when the deployment has
              no registry wiring as well as when the world is genuinely absent — the reason above is
              the backend&rsquo;s and says which.
            </Typography>
          </Alert>
        </Box>
      ) : null}

      {world === undefined ? null : (
        <Stack direction="row" spacing={2} sx={{ my: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Chip size="small" variant="outlined" label={world.world_id} />
          <Digest value={world.digest} label="World digest" />
        </Stack>
      )}

      {reason !== null ? (
        <Box sx={{ my: 2 }}>
          <EmptyState title={NO_SWARM[reason].title} hint={NO_SWARM[reason].body} />
        </Box>
      ) : null}

      {world === undefined ? null : (
        <Box sx={{ mt: 2 }}>
          {reason === null ? (
            <Box sx={{ mb: 2 }}>
              {/* Whenever a swarm is drawn. Not a tooltip, not a caption under the canvas. */}
              <StandInBanner title="These positions are a design-time convention, not a simulated pose">
                A candidate declares <strong>how many of which robot</strong> and never where any of
                them stands, so the arrangement below is this application&rsquo;s own: a
                deterministic ring around the world&rsquo;s site, at identity attitude. The scene is
                pixel-identical to one showing simulated poses. Read it as a composition —{" "}
                {candidate === undefined ? 0 : unitCount(candidate)} units on this terrain — not as
                a layout anybody computed.
              </StandInBanner>
            </Box>
          ) : null}

          <GeometryFor references={references}>
            {(geometry, missing) => (
              <>
                <InspectionScene world={world} placements={placements} geometry={geometry} />
                {missing.length === 0 ? null : (
                  <Alert severity="warning" role="status" sx={{ mt: 2 }}>
                    <AlertTitle>
                      {missing.length === 1
                        ? "One asset has no resolvable geometry"
                        : `${missing.length} assets have no resolvable geometry`}
                    </AlertTitle>
                    <Typography variant="body2">
                      <Box component="code">{missing.join(", ")}</Box> could not be previewed, so
                      those units are drawn as <strong>glyphs and labelled as glyphs</strong> rather
                      than dropped. They are still in the swarm and still counted; only their shape
                      is missing.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </GeometryFor>
        </Box>
      )}
    </Box>
  );
}

/**
 * Resolve each distinct asset's geometry document, and report which would not resolve.
 *
 * One request per distinct reference rather than per unit: a swarm is usually a handful of *kinds*
 * placed many times.
 */
function GeometryFor({
  references,
  children,
}: {
  references: readonly string[];
  children: (geometry: Record<string, string>, missing: string[]) => React.ReactNode;
}) {
  const previews = useApiQuery(
    async (client, signal) => {
      const results = await Promise.all(
        references.map(async (reference) => {
          try {
            const preview = await client.studioPreviewAsset({ path: { reference } }, { signal });
            return [reference, preview.document_url] as const;
          } catch {
            // A preview that will not resolve is a glyph and a label, not a failed pane. Swallowed
            // here on purpose: the *pane* must survive one asset the catalog cannot preview.
            return [reference, null] as const;
          }
        }),
      );
      return results;
    },
    [references.join("|")],
    { enabled: references.length > 0 },
  );

  if (previews.status !== "ready") return <>{children({}, [])}</>;

  const geometry: Record<string, string> = {};
  const missing: string[] = [];
  for (const [reference, url] of previews.data) {
    if (url === null) missing.push(reference);
    else geometry[reference] = url;
  }
  return <>{children(geometry, missing)}</>;
}
