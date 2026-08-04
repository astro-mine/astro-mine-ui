"use client";

// Is it me, or is it broken? (ui#9; ui.md §7 honesty rule 3.)
//
// **This panel answers the question a reader would otherwise have to guess at**, and it does so by
// distinguishing three states that look identical from a page that only says "something went
// wrong":
//
//   not configured   nobody told this deployment where its API is. Fix: write `config.json`.
//   unreachable      an endpoint is configured and nothing answered. Fix: the API, the network, or
//                    CORS — and the browser deliberately will not say which.
//   mounted / not    the API answered and named the surfaces it serves. A surface that is absent is
//                    not broken; this deployment simply does not run it, and the pages that need it
//                    will say so rather than failing.
//
// **The three have three different fixes**, which is exactly why ui#9 makes distinguishing them an
// acceptance criterion. Collapsing any two sends somebody to do the wrong thing — most expensively,
// telling a reader to check their configuration when their configuration is fine.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DegradedState } from "@astro-mine/ui";

import { useDeployment, type Surface } from "@/data/useDeployment";
import { useRuntimeConfig } from "@/shell/runtimeConfig";

/** What each surface is for, and which part of this application stops working without it. */
const SURFACES: readonly { name: Surface; what: string; without: string }[] = [
  { name: "hub", what: "The artifact registry", without: "Registry search, artifacts, publishing" },
  {
    name: "bench",
    what: "The benchmark",
    without: "Leaderboards, scorecards, submitting, the audit trail",
  },
  { name: "studio", what: "Design studies", without: "Objectives, trade studies, campaigns" },
  { name: "cloud", what: "The compute fabric", without: "Job submission and compile previews" },
];

export function Configured() {
  const { state } = useRuntimeConfig();
  const deployment = useDeployment();

  if (state.status === "loading") {
    // Deliberately nothing. "Not configured" here is how a correctly-configured deployment blames
    // itself for a moment on every cold load.
    return null;
  }

  if (state.status !== "configured") {
    return (
      <DegradedState
        title={
          state.status === "invalid"
            ? "The API configuration cannot be used"
            : "No API is configured"
        }
        reason={state.reason}
        remediation={state.remedy}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        What is configured, right now
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This deployment is pointed at{" "}
        <Box component="code" sx={{ overflowWrap: "anywhere" }}>
          {state.config.apiBaseUrl}
        </Box>
        .
      </Typography>

      {deployment.status === "failed" ? (
        // Configured and not answering. A different problem from an absent configuration, and it
        // gets a different remedy — the browser withholds which of the three causes it is, on
        // purpose, so the page names all three rather than guessing one.
        <Alert severity="error" role="alert">
          <AlertTitle>An API is configured, and it did not answer</AlertTitle>
          <Typography variant="body2">{deployment.failure.detail}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Your configuration is not the problem — it names an endpoint. The endpoint is down,
            unreachable from this origin, or refusing this origin&rsquo;s requests, and a browser
            will not tell you which of the three.
          </Typography>
        </Alert>
      ) : null}

      {deployment.status === "ready" ? (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
            <Chip size="small" variant="outlined" label={deployment.data.component} />
            <Chip size="small" variant="outlined" label={`version ${deployment.data.version}`} />
          </Stack>

          <Stack spacing={1}>
            {SURFACES.map((surface) => {
              const mounted = deployment.data.surfaces.includes(surface.name);
              return (
                <Stack
                  key={surface.name}
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "baseline", flexWrap: "wrap" }}
                >
                  <Chip
                    size="small"
                    color={mounted ? "success" : "default"}
                    variant={mounted ? "filled" : "outlined"}
                    label={mounted ? `${surface.name} · mounted` : `${surface.name} · not mounted`}
                  />
                  <Typography variant="body2">
                    {surface.what}.{" "}
                    {mounted ? null : (
                      <Box component="span" color="text.secondary">
                        {surface.without} are unavailable here — <strong>not broken</strong>, just
                        not part of this deployment.
                      </Box>
                    )}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 760 }}>
            A surface that is not mounted is a deployment decision rather than a fault, and the
            pages that need it say so where you meet them. Everything else on this application keeps
            working.
          </Typography>
        </>
      ) : null}
    </Box>
  );
}
