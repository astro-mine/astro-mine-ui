"use client";

// The episode replay, loaded only when somebody asks for it (ui#13; UC-B6).
//
// **The whole point of this file is what it does NOT import.** `ReplayScene` pulls
// `@astro-mine/view`, which pulls Cesium — four megabytes of workers and web assembly — plus the
// MCAP reader and a zstd decompressor. ui#13's acceptance criterion is that *"the replay chunk is
// not in the leaderboard route's bundle, asserted against the build output"*, and the reason is a
// person: a student who opened the leaderboard to look at a number should not download a globe.
//
// So there are two boundaries, and both are load-bearing:
//
//   1. `next/dynamic` with `ssr: false`, exactly as `components/Globe.tsx` does it. Cesium touches
//      `window` at *import* time, so under `output: 'export'` a static import is a build failure
//      rather than a runtime one — which is the better place for it, and why the pattern is copied
//      rather than reinvented.
//   2. **A click.** The chunk is not fetched when the submission page loads; it is fetched when the
//      reader opens the replay. The manifest summary above it is plain JSON and costs nothing, so
//      a reader can see what the episode contains and decide.
//
// `CESIUM_BASE_URL` is set inside the loader callback, above the import, because Cesium reads that
// global as its module body runs — setting it afterwards is setting it too late.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState } from "@astro-mine/ui";
import dynamic from "next/dynamic";
import { useState } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useRuntimeConfig } from "@/shell/runtimeConfig";

import { CESIUM_BASE_URL } from "@/components/Globe";

import { replayUrl } from "./replayUrl";
import type { ViewReplay } from "./types";

const ReplayScene = dynamic(
  async () => {
    // Before the import, never after.
    (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;
    const scene = await import("./ReplayScene");
    return scene.ReplayScene;
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
        {/* A spinner is honest here in a way it is not on a data panel: this is several megabytes
            arriving over the network and there is nothing to say about it except "still coming". */}
        <CircularProgress size={24} aria-label="Loading the replay" />
      </Box>
    ),
  },
);

/** Seconds as a span a person reads. */
function span(startS: number | null, endS: number | null): string {
  if (startS === null || endS === null) return "not recorded";
  const seconds = endS - startS;
  if (seconds < 120) return `${seconds.toFixed(0)} s`;
  return `${(seconds / 60).toFixed(1)} min (${seconds.toFixed(0)} s)`;
}

/** Bytes as a size a person reads. */
function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0 }}>
        {value}
      </Typography>
    </Box>
  );
}

/** What the recording contains — plain JSON, no Cesium, always shown. */
function ReplaySummary({ manifest }: { manifest: ViewReplay }) {
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: "grid", gap: 2, gridTemplateColumns: { sm: "1fr 1fr" } }}
    >
      <Fact
        label="Agents"
        value={manifest.agents.length === 0 ? "none recorded" : manifest.agents.join(", ")}
      />
      <Fact label="Seed" value={manifest.seed === null ? "not recorded" : String(manifest.seed)} />
      <Fact
        label="Sim-time span"
        value={span(manifest.sim_time_start_s, manifest.sim_time_end_s)}
      />
      <Fact
        label="Frames"
        value={`${manifest.frame_count} (${manifest.observation_count} observations)`}
      />
      <Fact label="Size" value={size(manifest.size_bytes)} />
      <Box>
        <Typography variant="overline" color="text.secondary" component="dt">
          MCAP digest
        </Typography>
        <Box component="dd" sx={{ m: 0 }}>
          {/* The value the bytes are checked against before anything decodes them. */}
          <Digest value={manifest.mcap_digest} label="MCAP digest" defaultExpanded />
        </Box>
      </Box>
    </Box>
  );
}

export function ReplayPane({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const { state } = useRuntimeConfig();

  const manifest = useApiQuery(
    (client, signal) =>
      client.benchGetReplayManifest({ path: { submission_id: submissionId } }, { signal }),
    [submissionId],
  );

  const baseUrl = state.status === "configured" ? state.config.apiBaseUrl : null;

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Episode replay
      </Typography>

      <ApiResult
        query={manifest}
        loadingLabel="Reading the replay manifest…"
        // "No replay attached" is a state with words, not a spinner that never resolves. The API
        // answers `content_not_found` for a submission with no stored recording, and the general
        // remedy ("check the address") would be wrong: the address is right.
        remedy="No episode recording is stored for this submission. Traces follow a retention policy — full retention for top-N and disputed runs, sampled or aged out otherwise (bench.md §5) — so an older entry may have had one and no longer does."
      >
        {(data) => (
          <Stack spacing={3}>
            <ReplaySummary manifest={data} />

            {open ? (
              baseUrl === null ? (
                <EmptyState
                  title="No API is configured"
                  hint="The recording is fetched from the API, so there is nowhere to fetch it from."
                />
              ) : (
                <Box>
                  <ReplayScene
                    url={replayUrl(baseUrl, submissionId)}
                    digest={data.mcap_digest}
                    bodyFixedFrame="MOON_ME"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                    The recording is{" "}
                    <strong>
                      fetched, hashed and checked against the digest above before a single byte is
                      decoded
                    </strong>
                    ; a mismatch fails closed and decodes nothing. Agents are drawn as position
                    glyphs rather than as their geometry, because an episode log records poses and
                    names agents by id — it carries no asset reference to draw a robot from.
                  </Typography>
                </Box>
              )
            ) : (
              <Box>
                <Button variant="outlined" onClick={() => setOpen(true)}>
                  Open the 3D replay
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                  The 3D viewer is several megabytes and is{" "}
                  <strong>not downloaded until you ask for it</strong>, so opening a leaderboard
                  never costs a globe. The summary above came from the manifest and needed none of
                  it.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </ApiResult>
    </Box>
  );
}
