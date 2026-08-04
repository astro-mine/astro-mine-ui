"use client";

// One entry's full scorecard (ui#12; bench.md §5; ui.md §7 honesty rule 5).
//
// **Provenance before interpretation, structurally.** The runner and the integrity verdict are the
// first thing on the page, above every number — not because they are more important in the abstract
// but because they change what the numbers *mean*. A fixture-scored 0.83 and a simulated 0.83 are
// the same three characters and different claims, and a reader who meets the number first has
// already formed a view by the time the caveat arrives.
//
// **Every metric with its bound, its aggregation, its seed count and its direction.** The
// leaderboard shows a column; this shows the whole record, because "0.83 m³" is not interpretable
// without knowing it is the median over nine held-out seeds and that higher is better.
//
// `ui#13` adds the provenance bundle and the episode replay beneath this.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState, RunnerBadge, StandInBanner } from "@astro-mine/ui";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useIdentity } from "@/shell/searchParams";

import { MetricCell } from "./MetricCell";
import { aggregationPhrase, directionPhrase, isFixtureRunner, runnerLabel } from "./format";
import type { Submission } from "./types";

const IDENTITY = ["id"] as const;

/** What produced these numbers — rendered before any of them. */
export function ProvenanceHeader({ submission }: { submission: Submission }) {
  const standIn = isFixtureRunner(submission.runner);

  return (
    <Stack spacing={2}>
      {standIn ? (
        // Not a chip in a corner. The whole scorecard is affected by this, so it gets the banner
        // whose entire job is "a stand-in must never look like the real thing".
        <StandInBanner title="These numbers came from a stand-in, not a simulation">
          The reference fixture (<Box component="code">{submission.runner}</Box>) is a deterministic
          runner that <strong>never executed the simulator</strong>. Its scores are stable and
          reproducible, and they measure nothing physical — they exist so the evaluation pipeline
          can be exercised without Sim. Do not read them as a result.
        </StandInBanner>
      ) : null}

      {submission.integrity === "flagged" ? (
        <StandInBanner title="This entry is flagged">
          A sampled re-execution of this run <strong>did not reproduce its recorded result</strong>{" "}
          (bench.md §9). The scores below are what was submitted; they are not corroborated.
        </StandInBanner>
      ) : null}

      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <RunnerBadge runner={runnerLabel(submission.runner)} standIn={standIn} />
        <Chip
          size="small"
          variant="outlined"
          color={submission.integrity === "flagged" ? "warning" : "default"}
          label={`integrity: ${submission.integrity}`}
        />
        {submission.method === null ? null : (
          <Chip size="small" variant="outlined" label={`method: ${submission.method}`} />
        )}
        {submission.source === null ? null : (
          <Chip size="small" variant="outlined" label={`source: ${submission.source}`} />
        )}
      </Stack>
    </Stack>
  );
}

/** The identity of the thing being scored, and of the scoring. */
function Identity({ submission }: { submission: Submission }) {
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Identity
      </Typography>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="overline" color="text.secondary" component="h4">
            Submission
          </Typography>
          {/* The submission id IS a digest — of (scenario, policy_ref, scorecard_hash) — so it is
              rendered as one rather than as an opaque string. */}
          <Digest value={submission.submission_id} label="Submission id" defaultExpanded />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" component="h4">
            Policy
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
            {submission.policy_ref}
          </Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" component="h4">
            Scorecard hash
          </Typography>
          <Digest value={submission.scorecard_hash} label="Scorecard hash" />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" component="h4">
            Scenario
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {submission.scenario_id}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

/** Every metric, with everything needed to read it. */
function Scores({ submission }: { submission: Submission }) {
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Scores on the held-out seeds
      </Typography>

      {submission.scores.length === 0 ? (
        <EmptyState
          title="This submission carries no scores"
          hint="It was recorded but never scored — an evaluation that did not complete leaves the entry without a scorecard."
        />
      ) : (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label="Every metric on this scorecard">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Aggregation</TableCell>
                <TableCell>Seeds</TableCell>
                <TableCell>Better</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submission.scores.map((score) => (
                <TableRow key={score.metric}>
                  <TableCell sx={{ fontFamily: "monospace" }}>{score.metric}</TableCell>
                  <TableCell>
                    <MetricCell score={score} />
                  </TableCell>
                  <TableCell>{score.aggregation}</TableCell>
                  <TableCell>{score.n}</TableCell>
                  <TableCell>{directionPhrase(score.direction)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 720 }}>
        Each value is an aggregate over the held-out seeds — {}
        {submission.scores[0] === undefined
          ? "none were recorded"
          : aggregationPhrase(submission.scores[0])}{" "}
        for the first row. A value with a <strong>±</strong> carries a measured cross-seed spread;
        one with an <strong>open mark</strong> had fewer than two applicable seeds, so no spread
        could be measured; a <strong>dash</strong> means the metric did not apply at all.
      </Typography>
    </Box>
  );
}

export interface ScorecardProps {
  /** Rendered under the scores. `ui#13` passes the provenance and replay panels through here. */
  readonly children?: (submission: Submission) => React.ReactNode;
}

export function Scorecard({ children }: ScorecardProps) {
  const { id } = useIdentity(IDENTITY);

  const submission = useApiQuery(
    (client, signal) => client.benchGetSubmission({ path: { submission_id: id! } }, { signal }),
    [id],
    { enabled: id !== null },
  );

  return (
    <Box sx={{ mt: 3 }}>
      <ApiResult
        query={submission}
        loadingLabel="Reading the scorecard…"
        idle={
          <EmptyState
            title="No submission in the address"
            hint="This page is keyed on ?id=… — open one from a leaderboard row."
          />
        }
      >
        {(data) => (
          <Stack spacing={4}>
            {/* First, above everything. What produced a number changes what it means. */}
            <ProvenanceHeader submission={data} />
            <Divider />
            <Identity submission={data} />
            <Divider />
            <Scores submission={data} />
            {children === undefined ? null : children(data)}
          </Stack>
        )}
      </ApiResult>
    </Box>
  );
}
