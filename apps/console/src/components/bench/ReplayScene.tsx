"use client";

// The 3D episode replay (ui#13; view.md; UC-B6).
//
// **This module is the heavy one, and nothing may import it statically.** It pulls
// `@astro-mine/view`, which pulls Cesium — four megabytes of workers and web assembly — plus the
// MCAP reader and a zstd decompressor. `ReplayPane` is the only thing that loads it, through
// `next/dynamic` with `ssr: false`, and that is what keeps a student who opened the leaderboard
// from downloading a globe they never asked to see. ui#13 makes it an acceptance criterion and the
// build lane asserts it against the export.
//
// **The bytes are verified before they are decoded.** `openReplay({ url, digest })` fetches the
// recording, hashes it, compares against the digest the manifest gave, and **throws instead of
// returning a readable** when they differ. A recording that is not the recording you asked for is
// worse than none — a replay is evidence, and evidence that silently came from somewhere else is
// the failure this ordering exists to prevent. Passing the manifest's digest is this component's
// whole contribution to that; the checking is the library's.
//
// **The scrubber reads the episode's own epoch.** `ReplayTrack.startEpoch` carries the recording's
// TDB epoch when it has one, and `epochAt` derives any later instant from it exactly, because TDB
// is a uniform SI-second scale with no leap seconds. A wall-clock readout on a lunar episode would
// be a number that looks authoritative and means nothing.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DegradedState } from "@astro-mine/ui";
import {
  GlobeScene,
  ReplayLayer,
  TimelineProvider,
  TimelineScrubber,
  epochAt,
  useReplay,
  useTimeline,
} from "@astro-mine/view";

/** The scrubber, bound to the track's own epoch rather than to anything local. */
function Scrubber({ track }: { track: Parameters<typeof epochAt>[0] | null }) {
  const { clock } = useTimeline();
  // `epochAt` is exact rather than approximate — TDB has no leap seconds — and `null` when the
  // recording carried no epoch, in which case the scrubber shows sim time alone. It never
  // substitutes a wall clock.
  const epoch = track === null ? null : epochAt(track, clock.tS);
  return <TimelineScrubber epoch={epoch} />;
}

export interface ReplaySceneProps {
  /** Where the MCAP is. Built from the operation table — see `replayUrl.ts`. */
  readonly url: string;
  /** The manifest's content hash. **Verified before decode**; without it there is no check. */
  readonly digest: string;
  /** The body-fixed frame the poses are placed in. */
  readonly bodyFixedFrame: string;
}

export function ReplayScene({ url, digest, bodyFixedFrame }: ReplaySceneProps) {
  const { track, status } = useReplay({ url, digest }, bodyFixedFrame);

  // `unavailable` is `GlobeStatus`'s "nothing to show, and here is why" arm — there is no
  // `failed`. `useReplay` puts the library's own sentence in `detail`, which for a content-hash
  // mismatch names both digests; that is the only thing that tells a corrupted download from a
  // wrong pin, so it is rendered rather than replaced.
  if (status.kind === "unavailable") {
    return (
      <DegradedState
        title="The replay could not be opened"
        reason={status.detail}
        remediation="Nothing was decoded. A content-hash mismatch means the bytes served are not the bytes this submission recorded — that is a storage or integrity problem, not a display one."
      />
    );
  }

  return (
    <TimelineProvider window={track === null ? null : { startS: track.startS, endS: track.endS }}>
      <Box
        sx={{
          height: 480,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <GlobeScene showStatus showCoordinates style={{ width: "100%", height: "100%" }}>
          {/* **Glyphs, not robot geometry, and that is what the data supports.** An episode log
              records *poses*: `ReplayAgentTrack` carries an agent id, a frame and samples, and the
              replay manifest names agents by id with no asset reference. There is therefore no
              SADF document to draw a rover from, and inventing one would put geometry on screen
              that no part of this recording chose.

              `modelBudget={0}` is how that is expressed through `SwarmLayer`'s existing vocabulary:
              every placement renders as a position glyph at every distance and **no model is
              created**, so the `gltfUrl` below is never fetched (`SwarmLayer` skips
              `createAssetModel` for anything out of budget). The alternative — passing a source
              that fails to resolve — would report "assets have no renderable geometry", which
              reads as a load failure when nothing was ever attempted. */}
          <ReplayLayer
            track={track}
            asset={{ gltfUrl: "", assetId: "episode pose (no geometry in an episode log)" }}
            modelBudget={0}
          />
        </GlobeScene>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Scrubber track={track} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {status.detail}
      </Typography>
    </TimelineProvider>
  );
}
