"use client";

// The public face of the commons (ui#12; UC-G5; LUNAR-UX-006; bench.md §5, §6, §9).
//
// **The page the bar "a student finds the leaderboard in one click" is set against**, which makes
// two of its properties non-negotiable and both are honesty rules rather than features.
//
// **1. The runner is in the row.** A fixture-scored entry is a deterministic stand-in that never
// ran the simulator, and its number is not a measurement of anything. The API's own schema says
// what to do about it: *"View **must** render it in the ranking row: a fixture-scored entry has to
// look fixture-scored, not merely carry a footnote"*. So the badge is a column, visible without
// opening, hovering or expanding anything.
//
// **2. The page never re-ranks.** `rank` arrives from the server and unsorted order is the server's
// order. A leaderboard that quietly re-sorts by whatever it can parse is a leaderboard showing a
// ranking nobody computed — and the reader has no way to tell it from the authoritative one. When a
// reader *asks* for a different order by clicking a column, the header says so and the rank column
// still carries the authoritative position.
//
// **Reads are account-free.** Looking at a leaderboard never prompts for a login (CX-LOCAL).

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import { BarChart, EmptyState, RunnerBadge, type BarDatum } from "@astro-mine/ui";
import NextLink from "next/link";
import { useMemo, useState } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { hrefWithIdentity, useIdentity, useSetIdentity } from "@/shell/searchParams";

import { MetricCell, MetricHeading } from "./MetricCell";
import { compareByMetric, isFixtureRunner, metricsOf, runnerLabel, scoreFor } from "./format";
import type { ViewLeaderboard, ViewLeaderboardRow } from "./types";

const IDENTITY = ["scenario"] as const;

/** How the reader asked for the table to be ordered. `null` is the server's own ranking. */
interface Ordering {
  readonly metric: string;
  readonly descending: boolean;
}

/** The scenario picker, fed by the zoo. Its own read, so a failed list does not blank the board. */
function ScenarioPicker({ selected }: { selected: string | null }) {
  const setIdentity = useSetIdentity();
  const scenarios = useApiQuery((client, signal) => client.benchListScenarios({ signal }), []);

  if (scenarios.status !== "ready" || scenarios.data.length === 0) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 260 }}>
      <InputLabel id="scenario-label">Scenario</InputLabel>
      <Select
        labelId="scenario-label"
        label="Scenario"
        value={selected ?? ""}
        onChange={(event) => setIdentity({ scenario: event.target.value }, { history: "push" })}
      >
        {scenarios.data.map((scenario) => (
          <MenuItem key={scenario} value={scenario}>
            {scenario}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/** The primary metric as a chart — one metric, so one unit, so one axis (ui.md §7.1). */
function PrimaryMetricChart({ board }: { board: ViewLeaderboard }) {
  const metric = board.primary_metric;
  if (metric === null) return null;

  const rows: BarDatum[] = board.rows.flatMap((row) => {
    const score = scoreFor(row.scores, metric);
    // A row with no value for the primary metric is left out of the chart rather than drawn at
    // zero. It is still in the table, where its dash says what happened.
    if (score === undefined || score.value === null) return [];
    return [{ label: row.submission_id.slice(0, 12), value: score.value, bound: score.dispersion }];
  });

  const unit = board.rows
    .map((row) => scoreFor(row.scores, metric)?.unit)
    .find((value) => value !== undefined && value !== "");

  return (
    <Box sx={{ my: 3 }}>
      <BarChart
        state={rows.length === 0 ? { status: "empty" } : { status: "ready", data: rows }}
        title={`${metric} — ranked entries`}
        unit={unit ?? null}
        empty={<EmptyState title="No entry has a value for the primary metric" />}
      />
    </Box>
  );
}

function LeaderboardTable({ board }: { board: ViewLeaderboard }) {
  const [ordering, setOrdering] = useState<Ordering | null>(null);
  const metrics = useMemo(() => metricsOf(board.rows), [board.rows]);

  const rows: readonly ViewLeaderboardRow[] = useMemo(() => {
    // **No ordering asked for means the server's order, untouched.** Not "sorted by rank" — the
    // received order IS the ranking, and re-deriving it from a field would be this page computing
    // a ranking of its own.
    if (ordering === null) return board.rows;
    return [...board.rows].sort((a, b) =>
      compareByMetric(
        scoreFor(a.scores, ordering.metric)?.value,
        scoreFor(b.scores, ordering.metric)?.value,
        ordering.descending,
      ),
    );
  }, [board.rows, ordering]);

  const toggle = (metric: string) =>
    setOrdering((current) =>
      current === null || current.metric !== metric
        ? { metric, descending: true }
        : current.descending
          ? { metric, descending: false }
          : // Third click returns to the authoritative order rather than cycling between two
            // orderings neither of which is the ranking.
            null,
    );

  return (
    <>
      {ordering === null ? null : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Ordered by <strong>{ordering.metric}</strong>,{" "}
          {ordering.descending ? "largest first" : "smallest first"} — this is your ordering, not
          the ranking. The <strong>Rank</strong> column still shows the authoritative position.{" "}
          <Link component="button" type="button" onClick={() => setOrdering(null)}>
            Back to the ranking
          </Link>
          .
        </Typography>
      )}

      <TableContainer sx={{ maxHeight: "70vh", overflowX: "auto" }}>
        <Table size="small" stickyHeader aria-label={`Leaderboard for ${board.scenario_id}`}>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              {/* Second column, immediately after the position — before any number, so the
                  qualifier is read before the thing it qualifies (honesty rule 5). */}
              <TableCell>Runner</TableCell>
              <TableCell>Integrity</TableCell>
              <TableCell>Submission</TableCell>
              <TableCell>Author</TableCell>
              {metrics.map((metric) => (
                <TableCell
                  key={metric}
                  sortDirection={
                    ordering?.metric === metric ? (ordering.descending ? "desc" : "asc") : false
                  }
                >
                  <TableSortLabel
                    active={ordering?.metric === metric}
                    direction={ordering?.metric === metric && !ordering.descending ? "asc" : "desc"}
                    onClick={() => toggle(metric)}
                  >
                    <MetricHeading
                      metric={metric}
                      score={board.rows.map((row) => scoreFor(row.scores, metric)).find(Boolean)}
                    />
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.submission_id} hover>
                <TableCell>{row.rank}</TableCell>
                <TableCell>
                  <RunnerBadge
                    runner={runnerLabel(row.runner)}
                    standIn={isFixtureRunner(row.runner)}
                    detail={
                      isFixtureRunner(row.runner)
                        ? "It never ran the simulator, so this number measures nothing physical."
                        : undefined
                    }
                  />
                </TableCell>
                <TableCell>
                  {row.integrity === "flagged" ? (
                    <Chip
                      size="small"
                      color="warning"
                      label="flagged"
                      aria-label="Integrity flagged: a re-execution of this run did not match its recorded result."
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {row.integrity}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    component={NextLink}
                    href={hrefWithIdentity("/bench/submission", { id: row.submission_id })}
                    sx={{ fontFamily: "monospace" }}
                  >
                    {row.submission_id.slice(0, 20)}…
                  </Link>
                </TableCell>
                <TableCell>{row.author ?? "—"}</TableCell>
                {metrics.map((metric) => (
                  <TableCell key={metric}>
                    <MetricCell score={scoreFor(row.scores, metric)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export function Leaderboard() {
  const { scenario } = useIdentity(IDENTITY);

  // **`benchLeaderboardScorecards`, not `benchLeaderboard`** — and the difference is this page's
  // whole shape. `GET /bench/leaderboard/{scenario}` answers `LeaderboardEntry[]`: the primary
  // metric only, flattened to one `primary_value`. The `/scorecards` route answers
  // `ViewLeaderboard`, where every row carries its **full** per-metric scorecard with each value's
  // direction and its cross-seed dispersion.
  //
  // ui#12 asks for "one column per metric, each rendered as uncertainty", and the first route
  // cannot supply that: it has no dispersion to render as a bound and no second metric to put in a
  // column. The API's own schema calls the second one "the shape View renders", and it is.
  const board = useApiQuery(
    (client, signal) =>
      client.benchLeaderboardScorecards({ path: { scenario_id: scenario! } }, { signal }),
    [scenario],
    { enabled: scenario !== null },
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <ScenarioPicker selected={scenario} />
      </Stack>

      <ApiResult
        query={board}
        loadingLabel="Reading the leaderboard…"
        isEmpty={(data) => data.rows.length === 0}
        idle={
          <EmptyState
            title="No scenario chosen"
            hint="Pick a scenario above, or open a leaderboard by URL with ?scenario=…"
          />
        }
        empty={
          <EmptyState
            title="Nothing has been ranked on this scenario yet"
            hint={
              <>
                An empty board is a board with no submissions, not a fault. Enter one from{" "}
                <Link component={NextLink} href="/bench/submit">
                  the submit page
                </Link>
                , or from the command line:{" "}
                <Box component="code">astro-mine bench submit --scenario {scenario ?? "…"}</Box>.
              </>
            }
          />
        }
      >
        {(data) => (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {data.rows.length} ranked {data.rows.length === 1 ? "entry" : "entries"} on{" "}
              <Box component="code">{data.scenario_id}</Box>
              {data.primary_metric === null
                ? ". This scenario declares no primary metric."
                : ", ranked by "}
              {data.primary_metric === null ? null : <strong>{data.primary_metric}</strong>}
              {data.primary_metric === null ? null : "."}
            </Typography>

            <PrimaryMetricChart board={data} />
            <LeaderboardTable board={data} />
          </>
        )}
      </ApiResult>
    </Box>
  );
}
