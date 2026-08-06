"use client";

// The globe a world artifact renders (ui#51; ui.md §6, §7 rules 1 and 3).
//
// **This is the half of the inspector contract that was missing.** `ui.md` §6 opens with "a `world`
// artifact renders a globe … resolved without the registry page knowing what a world is", and the
// resolution half has always worked: `/registry/artifact` picks `WorldInspector` for a
// `world_provider`. But a panel is *handed* a globe and does not summon one
// (`packages/inspectors/src/model.ts`) — `@astro-mine/view` publishes one entry that re-exports its
// Cesium module, so a panel importing it would put four megabytes in the graph of every page that
// renders an artifact row. The composition root owns the mount. It was not filling the slot, so the
// panel rendered "no globe was supplied" where the globe belongs.
//
// **Behind a control, deliberately, and it is the same reasoning the page's download gate uses.**
// Resolving a world is not a read: `GET /studio/worlds/{reference}` asks the backend to pull the
// bundle out of Hub and re-verify its supply chain before a byte is trusted, and
// `HubWorldMaterializer` says in its own comments that a world bundle is multi-GB. A reader who
// opened this page to copy a digest must not cause that. So the invitation states the cost, and
// the pull happens when somebody asks for it — the shape `ReplayPane` already uses for the other
// heavy viewer, and what `ui#17` made a criterion in as many words.
//
// **A panel cannot fetch, which is why this component is here rather than there.**
// `@astro-mine/inspectors` may not import `@astro-mine/api-client` at all (`ui.md` §3, enforced by
// `check-layering.mjs`), so the request, the runtime configuration and the mount are all the
// application's. What crosses the boundary is one mounted React node.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { Globe } from "@/components/Globe";
import { apiUrl } from "@/data/apiUrl";
import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useRuntimeConfig } from "@/shell/runtimeConfig";

export interface WorldTerrainProps {
  /** The artifact's own `namespace/name:version` — what Studio materializes a world by. */
  readonly reference: string;
}

/** Centred in the panel's frame, which is a fixed-height box the inspector owns. */
const centred = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1.5,
  p: 3,
  textAlign: "center",
} as const;

export function WorldTerrain({ reference }: WorldTerrainProps) {
  const [asked, setAsked] = useState(false);
  const { state } = useRuntimeConfig();

  const world = useApiQuery(
    (client, signal) => client.studioResolveWorld({ path: { reference } }, { signal }),
    [reference],
    // Nothing is pulled until somebody asks. `enabled` rather than a conditional hook, so the
    // request's abort-on-unmount still belongs to this component.
    { enabled: asked },
  );

  const baseUrl = state.status === "configured" ? state.config.apiBaseUrl : null;

  if (!asked) {
    return (
      <Box sx={centred}>
        <Button variant="outlined" onClick={() => setAsked(true)}>
          Draw the terrain
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          Drawing this world asks the backend to{" "}
          <strong>pull the bundle and re-verify its supply chain</strong>, and a world bundle can be
          gigabytes. The 3D viewer is several megabytes more and is not downloaded until you ask for
          it — so opening an artifact never costs a globe.
        </Typography>
      </Box>
    );
  }

  return (
    <ApiResult
      query={world}
      loadingLabel="Pulling and verifying the world bundle…"
      // The general remedy — "check the address" — would be wrong here: the address is this
      // artifact, and it exists. What can be absent is the deployment's terrain wiring.
      remedy="Terrain is served by the Studio surface, which needs this deployment's registry wiring to pull a bundle at all. The reason above is the backend's own and says which case this is."
    >
      {(resolved) => (
        // `baseUrl` is non-null here: `useApiQuery` answers `unconfigured` rather than `ready` when
        // there is no client, and `ApiResult` renders that arm above this callback.
        <Globe
          world={{ manifestUrl: apiUrl(baseUrl!, resolved.manifest_url) }}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </ApiResult>
  );
}
