"use client";

// The studies a session has (ui#16; UC-F3).
//
// Three kinds, and the first is the one with a rule attached: **the seeded example is badged as an
// example, never passed off as the reader's own result.** It exists so there is something to look
// at before anyone has run anything — and the failure it must not cause is a reader taking its
// numbers for theirs. It carries a stand-in evaluator, so the comparison page's own provenance
// banner fires on it through the ordinary path rather than through a special case.
//
// **Launching is `POST /studio/studies`.** A trade study is minutes to hours of distributed
// simulation (studio.md §2 principle 5), so what comes back is jobs — and, when the backend ran it
// inline, the study itself. Both are reported for what they are.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState, StandInBanner } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";
import { hrefWithIdentity } from "@/shell/searchParams";

import {
  EXAMPLE_STUDY_ID,
  exampleStudy,
  readSession,
  rememberStudy,
  type DesignSession,
} from "./session";
import type { StudyResponse, TradeStudy } from "./types";

/** The seeds a launch runs over. Small on purpose: this is a design loop, not an evaluation. */
const SEEDS = [11, 12, 13];

/**
 * How many optimizer steps a launch asks for.
 *
 * `StudyRequest.max_steps` is required by the document (it carries a default of 8 server-side, but
 * the generated type still demands it). Sent explicitly rather than left to the server, so what a
 * launch from this page does is written down where somebody can read it.
 */
const MAX_STEPS = 8;

export function StudyList() {
  const [session, setSession] = useState<DesignSession>(() => readSession());

  const launch = useApiAction(async (client): Promise<StudyResponse> =>
    client.studioRunStudy({
      body: {
        objective: session.objective!.document,
        candidates: [...(session.candidates ?? [])],
        seeds: SEEDS,
        max_steps: MAX_STEPS,
      },
    }),
  );

  const canLaunch =
    launch.ready &&
    session.objective !== undefined &&
    (session.candidates?.length ?? 0) > 0 &&
    launch.state.status !== "pending";

  const onLaunch = async () => {
    const result = await launch.invoke();
    if (result.ok && result.data.study !== null && result.data.study !== undefined) {
      setSession(rememberStudy(result.data.study));
    }
  };

  const studies = session.studies ?? [];

  return (
    <Box sx={{ mt: 3 }}>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Run a study
          </Typography>

          {session.objective === undefined ? (
            <EmptyState
              title="No objective captured in this session"
              hint={
                <>
                  A trade study is run against an objective.{" "}
                  <Link component={NextLink} href="/design/new">
                    State one
                  </Link>{" "}
                  and compose the candidates to compare.
                </>
              }
            />
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Against the objective this session captured, over{" "}
                {(session.candidates ?? []).length} candidates and {SEEDS.length} seeds.
              </Typography>
              <Digest value={session.objective.digest} label="Objective digest" />
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" disabled={!canLaunch} onClick={() => void onLaunch()}>
                  {launch.state.status === "pending" ? "Launching…" : "Launch the study"}
                </Button>
              </Box>
            </>
          )}

          {launch.state.status === "failed" ? (
            <Box sx={{ mt: 2 }}>
              <FailureNotice failure={launch.state.failure} />
            </Box>
          ) : null}

          {launch.state.status === "done" && launch.state.data.study == null ? (
            // Jobs came back and no study did. That is the asynchronous path working as designed,
            // and it is not a comparison — so the page says what it has rather than showing an
            // empty one.
            <Alert severity="info" role="status" sx={{ mt: 2 }}>
              <AlertTitle>Queued — {launch.state.data.jobs.length} evaluation jobs</AlertTitle>
              <Typography variant="body2">
                The backend is running this study asynchronously, so there is no comparison yet.
                Nothing on this page will invent one; re-launch when the jobs have finished, or use
                the CLI to follow them.
              </Typography>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Typography variant="h6" component="h2" gutterBottom>
        Studies
      </Typography>

      <Stack spacing={2}>
        <StudyCard study={exampleStudy()} example />
        {studies.map((study) => (
          <StudyCard key={study.id} study={study} example={study.id === EXAMPLE_STUDY_ID} />
        ))}
      </Stack>

      {studies.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Only the example so far. Studies this session launches appear here — and, because a
            comparison is computed from the study document itself, they live as long as the tab
            does.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

function StudyCard({ study, example }: { study: TradeStudy; example: boolean }) {
  return (
    <Card variant="outlined">
      <CardContent>
        {example ? (
          // Badged where the numbers are, not in a footnote — the same rule as a fixture-scored
          // leaderboard row.
          <Box sx={{ mb: 2 }}>
            <StandInBanner title="An example, not your result">
              This study was not run by you and not run at all: it is a seeded illustration so there
              is something to look at before you have launched anything. Every number it shows came
              from a stand-in.
            </StandInBanner>
          </Box>
        ) : null}

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", mb: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontFamily: "monospace" }}>
            {study.id}
          </Typography>
          {example ? <Chip size="small" color="standIn" label="example" /> : null}
          <Chip size="small" variant="outlined" label={`evaluator ${study.evaluator}`} />
          <Chip size="small" variant="outlined" label={`backend ${study.backend}`} />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {study.pareto_front.length} on the front · {study.seeds.length} seeds
        </Typography>

        <Link component={NextLink} href={hrefWithIdentity("/design/study", { id: study.id })}>
          Open the comparison
        </Link>
      </CardContent>
    </Card>
  );
}
