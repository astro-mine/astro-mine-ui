"use client";

// Compare the front (ui#16; UC-F3, UC-F4; studio.md §2 principle 1).
//
// **Studio computes nothing, and neither does this page.** The Pareto set, the bounds and the
// metric vocabulary all arrive from the API; the scatter draws what `on_pareto_front` says and the
// order shown is the order received. A front this page derived would be a front nobody can
// reproduce from the artifact, which is the opposite of what a trade study is for.
//
// **How a study is opened, and the honest limit on it.** The API serves no `GET
// /studio/studies/{id}` — a study is *made* by `POST /studio/studies` and *rendered* by
// `POST /studio/studies/comparison`, which takes the `TradeStudy` itself as its body. So the
// document a comparison is computed from has to come from somewhere the browser already has it,
// and for this tier that is the session. A link opened in a different session therefore cannot
// resolve, and this page **says so** rather than spinning: the alternative is a URL that looks
// shareable and silently is not.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  EmptyState,
  ParallelCoordinates,
  ScatterChart,
  type ParallelAxis,
  type ParallelRow,
  type ScatterPoint,
} from "@astro-mine/ui";
import { useMemo, useState } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useIdentity } from "@/shell/searchParams";

import { HonestyStatements } from "./Honesty";
import { readStudy } from "./session";
import type { ComparisonView } from "./types";

const IDENTITY = ["id"] as const;

/** The candidates as scatter points, on the two metrics the reader chose. */
function toPoints(view: ComparisonView, x: string, y: string): ScatterPoint[] {
  return view.candidates.flatMap((candidate) => {
    const xEstimate = candidate.metrics[x];
    const yEstimate = candidate.metrics[y];
    // A candidate missing either axis is left out of the *scatter* rather than placed at zero —
    // and it is still in the table below, where its absence is stated.
    if (xEstimate === undefined || yEstimate === undefined) return [];
    return [
      {
        id: candidate.candidate_id,
        label: candidate.candidate_id,
        // `uncertainty` passes straight through: `null` becomes the chart layer's open mark, and
        // defaulting it to 0 here would draw a zero-length bar asserting a precision nobody
        // measured (ui.md §7.1, asserted in the design system's own tests).
        x: { value: xEstimate.value, bound: xEstimate.uncertainty },
        y: { value: yEstimate.value, bound: yEstimate.uncertainty },
        // **The backend's, not ours.** This page runs no dominance test of its own.
        onFront: candidate.on_pareto_front,
      },
    ];
  });
}

function toRows(view: ComparisonView): ParallelRow[] {
  return view.candidates.map((candidate) => ({
    id: candidate.candidate_id,
    label: candidate.candidate_id,
    onFront: candidate.on_pareto_front,
    values: Object.fromEntries(
      view.metrics.map((metric) => [metric, candidate.metrics[metric]?.value]),
    ),
  }));
}

export interface StudyComparisonProps {
  /** Notified when the reader picks a candidate — `ui#17` and `ui#18` hang off this. */
  readonly onSelect?: (candidateId: string | null) => void;
  readonly selectedId?: string | null;
  /** Rendered under the plots. `ui#17` and `ui#18` pass their panes through here. */
  readonly children?: (view: ComparisonView, selectedId: string | null) => React.ReactNode;
}

export function StudyComparison({ onSelect, selectedId, children }: StudyComparisonProps) {
  const { id } = useIdentity(IDENTITY);
  const [ownSelection, setOwnSelection] = useState<string | null>(null);
  const selected = selectedId ?? ownSelection;

  const study = id === null ? undefined : readStudy(id);

  const comparison = useApiQuery(
    (client, signal) => client.studioComparison({ body: study! }, { signal }),
    [id],
    { enabled: study !== undefined },
  );

  const [xMetric, setXMetric] = useState<string | null>(null);
  const [yMetric, setYMetric] = useState<string | null>(null);

  const view = comparison.status === "ready" ? comparison.data : null;
  const x = xMetric ?? view?.metrics[0] ?? null;
  const y = yMetric ?? view?.metrics[1] ?? view?.metrics[0] ?? null;

  const points = useMemo(
    () => (view === null || x === null || y === null ? [] : toPoints(view, x, y)),
    [view, x, y],
  );
  const rows = useMemo(() => (view === null ? [] : toRows(view)), [view]);
  const axes = useMemo<ParallelAxis[]>(
    () =>
      view === null
        ? []
        : view.metrics.map((metric) => ({ key: metric, label: metric, unit: null })),
    [view],
  );

  const select = (candidateId: string | null) => {
    setOwnSelection(candidateId);
    onSelect?.(candidateId);
  };

  if (id === null) {
    return (
      <Box sx={{ mt: 3 }}>
        <EmptyState
          title="No study in the address"
          hint="This page is keyed on ?id=… — open one from the studies list."
        />
      </Box>
    );
  }

  if (study === undefined) {
    // The honest limit, said plainly. Not a spinner, and not "not found" — the study may well
    // exist; this browser simply has no copy of the document the comparison is computed from.
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="degraded" role="status">
          <AlertTitle>This session does not have that study</AlertTitle>
          <Typography variant="body2">
            A comparison is computed from the trade-study document itself (
            <Box component="code">POST /studio/studies/comparison</Box>), and the API serves no way
            to fetch one by id — so a study is readable in the session that ran it and not in
            another. This link will work again if you launch the study here.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <ApiResult query={comparison} loadingLabel="Computing the comparison…">
        {(data) => (
          <>
            {/* Above the plots. Always. */}
            <HonestyStatements view={data} />

            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
              <Chip label={`study ${data.study_id}`} size="small" variant="outlined" />
              <Chip
                label={`${data.candidates.length} candidates`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${data.pareto_front.length} on the front`}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
              <MetricPicker label="X axis" value={x} metrics={data.metrics} onChange={setXMetric} />
              <MetricPicker label="Y axis" value={y} metrics={data.metrics} onChange={setYMetric} />
            </Stack>

            <ScatterChart
              state={points.length === 0 ? { status: "empty" } : { status: "ready", data: points }}
              title={`${y ?? "?"} against ${x ?? "?"}`}
              xLabel={x ?? "—"}
              xUnit={null}
              yLabel={y ?? "—"}
              yUnit={null}
              selectedId={selected}
              onSelect={select}
              empty={
                <EmptyState
                  title="No candidate has values on both axes"
                  hint="Pick two metrics the evaluated candidates were both scored on."
                />
              }
            />

            <Box sx={{ mt: 4 }}>
              <ParallelCoordinates
                state={rows.length === 0 ? { status: "empty" } : { status: "ready", data: rows }}
                title="Every metric, per candidate"
                axes={axes}
                selectedId={selected}
                onSelect={select}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 760 }}>
              Front membership comes from the backend and is drawn as a distinct mark shape as well
              as a colour, so it survives a reader who cannot separate the two.{" "}
              <strong>This page runs no dominance test of its own</strong> — the order and the
              membership shown are the ones received.
            </Typography>

            {children === undefined ? null : <Box sx={{ mt: 4 }}>{children(data, selected)}</Box>}
          </>
        )}
      </ApiResult>
    </Box>
  );
}

function MetricPicker({
  label,
  value,
  metrics,
  onChange,
}: {
  label: string;
  value: string | null;
  metrics: readonly string[];
  onChange: (metric: string) => void;
}) {
  // **A slug, because `aria-labelledby` is a space-separated ID LIST.** Deriving the id straight
  // from the label gave `"X axis-label"`, which a browser reads as two references — `X` and
  // `axis-label` — neither of which exists, so the control had no accessible name at all. axe calls
  // it `aria-input-field-name`, rates it serious, and the a11y lane is a build gate; it was caught
  // there rather than by looking at it.
  const id = `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {metrics.map((metric) => (
          <MenuItem key={metric} value={metric}>
            {metric}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
