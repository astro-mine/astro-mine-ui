"use client";

// Submit a job, and see what a sweep expands to first (ui#19; cloud.md; api.md §2).
//
// **The compile preview is the value here.** A sweep or a workflow compiles to a concrete plan
// before anything runs, and seeing that plan is the difference between launching a thousand runs
// and finding out afterwards what they were. So the expansion is shown, **counted plainly**, and
// scrollable — a number a reader can react to before they commit compute to it.
//
// **The compile routes answer an untyped object, and this page says so.** `cloud_compile_job`,
// `cloud_compile_sweep` and `cloud_compile_workflow` are declared
// `additionalProperties: true` with no schema — `ui#19` names a typed response as a dependency and
// records it as fixed "in the API issue", which has not landed: astro-mine-api serves the same
// untyped object at HEAD and no issue is open for it. Rather than invent a shape, the preview
// renders the document as the API sent it and says that is what it is doing. `cloud_expand_sweep`
// **is** typed (`SweepExpansion`), and it carries the part the issue calls the headline value.
//
// **Nothing here computes a plan the API did not return.** No client-side grid expansion, no
// estimated counts, no "this will probably take". The page previews and submits; the scheduling is
// the platform's.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { EmptyState } from "@astro-mine/ui";
import { useState } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";
import { useApiQuery } from "@/data/useApiQuery";

import { readJsonText, type JsonText } from "./readJsonText";
import type { JobSpec, RunResult, SweepExpansion, SweepSpec } from "./types";

type Mode = "job" | "sweep";

/** A job spec a reader can start from. Deliberately minimal: an image and a command. */
const EXAMPLE_JOB = JSON.stringify(
  {
    image: { repository: "ghcr.io/astro-mine/runner", digest: "sha256:…", tag: "0.5.0" },
    command: ["astro-mine", "bench", "run"],
    env: {},
    seed: 11,
  },
  null,
  2,
);

const EXAMPLE_SWEEP = JSON.stringify(
  {
    base: {
      image: { repository: "ghcr.io/astro-mine/runner", digest: "sha256:…", tag: "0.5.0" },
      command: ["astro-mine", "bench", "run"],
    },
    method: "grid",
    grid: { seed: [11, 12, 13], fidelity: ["low", "high"] },
    seed: 0,
  },
  null,
  2,
);

/** A JSON document, pretty-printed for reading. */
function Document({ value }: { value: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        maxHeight: 360,
        overflow: "auto",
        borderRadius: 1,
        bgcolor: "action.hover",
        fontFamily: "monospace",
        fontSize: "0.8125rem",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

export function Jobs() {
  const [mode, setMode] = useState<Mode>("sweep");
  const [text, setText] = useState(EXAMPLE_SWEEP);

  // Read here rather than on submit, so a malformed document is a labelled state rather than a
  // failure at the moment of committing compute.
  const parsed: JsonText = readJsonText(text);

  const backends = useApiQuery((client, signal) => client.cloudBackends({ signal }), []);
  const noBackends = backends.status === "ready" && Object.keys(backends.data).length === 0;

  const expand = useApiAction((client, spec: SweepSpec) => client.cloudExpandSweep({ body: spec }));
  const compileSweep = useApiAction((client, spec: SweepSpec) =>
    client.cloudCompileSweep({ body: spec }),
  );
  const compileJob = useApiAction((client, spec: JobSpec) =>
    client.cloudCompileJob({ body: spec }),
  );
  const submit = useApiAction((client, spec: JobSpec) => client.cloudSubmitJob({ body: spec }));

  const usable = parsed.status === "read";

  const onModeChange = (next: Mode) => {
    setMode(next);
    setText(next === "sweep" ? EXAMPLE_SWEEP : EXAMPLE_JOB);
    expand.reset();
    compileSweep.reset();
    compileJob.reset();
    submit.reset();
  };

  return (
    <Box sx={{ mt: 3 }}>
      {noBackends ? (
        <Alert severity="degraded" role="status" sx={{ mb: 3 }}>
          <AlertTitle>This deployment has no execution backends configured</AlertTitle>
          <Typography variant="body2">
            There is nowhere for a job to run, so <strong>submitting is disabled</strong> rather
            than offered as a button that would fail. Compiling and expanding still work — they are
            previews and need no backend.
          </Typography>
        </Alert>
      ) : null}

      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        aria-label="What to preview"
        onChange={(_event, next: Mode | null) => {
          if (next !== null) onModeChange(next);
        }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="sweep">A sweep</ToggleButton>
        <ToggleButton value="job">A single job</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        label={mode === "sweep" ? "Sweep specification (JSON)" : "Job specification (JSON)"}
        value={text}
        onChange={(event) => setText(event.target.value)}
        fullWidth
        multiline
        minRows={12}
        slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: "0.8125rem" } } }}
        helperText={
          mode === "sweep"
            ? "A base job plus the grid or ranges to vary over. Expanding shows exactly what it becomes."
            : "One job: an image, a command, and what it needs."
        }
      />

      {parsed.status === "failed" ? (
        <Alert severity="error" role="alert" sx={{ mt: 2 }}>
          <AlertTitle>That is not a specification this can send</AlertTitle>
          <Typography variant="body2">{parsed.reason}</Typography>
        </Alert>
      ) : null}

      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
        {mode === "sweep" ? (
          <>
            <Button
              variant="contained"
              disabled={!usable || !expand.ready || expand.state.status === "pending"}
              onClick={() => usable && void expand.invoke(parsed.value as SweepSpec)}
            >
              {expand.state.status === "pending" ? "Expanding…" : "Expand the sweep"}
            </Button>
            <Button
              variant="outlined"
              disabled={!usable || !compileSweep.ready || compileSweep.state.status === "pending"}
              onClick={() => usable && void compileSweep.invoke(parsed.value as SweepSpec)}
            >
              Compile it
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              disabled={!usable || !compileJob.ready || compileJob.state.status === "pending"}
              onClick={() => usable && void compileJob.invoke(parsed.value as JobSpec)}
            >
              Compile it
            </Button>
            <Button
              variant="contained"
              disabled={!usable || !submit.ready || noBackends || submit.state.status === "pending"}
              onClick={() => usable && void submit.invoke(parsed.value as JobSpec)}
            >
              {submit.state.status === "pending" ? "Submitting…" : "Submit the job"}
            </Button>
          </>
        )}
      </Stack>

      <Stack spacing={3} sx={{ mt: 3 }}>
        {expand.state.status === "failed" ? <FailureNotice failure={expand.state.failure} /> : null}
        {compileSweep.state.status === "failed" ? (
          <FailureNotice failure={compileSweep.state.failure} />
        ) : null}
        {compileJob.state.status === "failed" ? (
          <FailureNotice failure={compileJob.state.failure} />
        ) : null}
        {submit.state.status === "failed" ? <FailureNotice failure={submit.state.failure} /> : null}

        {expand.state.status === "done" ? <Expansion expansion={expand.state.data} /> : null}
        {compileSweep.state.status === "done" ? (
          <CompiledPlan plan={compileSweep.state.data} what="sweep" />
        ) : null}
        {compileJob.state.status === "done" ? (
          <CompiledPlan plan={compileJob.state.data} what="job" />
        ) : null}
        {submit.state.status === "done" ? <Submitted result={submit.state.data} /> : null}
      </Stack>
    </Box>
  );
}

/** What a sweep becomes — the typed one, and the reason this page is worth having. */
function Expansion({ expansion }: { expansion: SweepExpansion }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary" component="h2">
          Expansion
        </Typography>
        {/* Counted plainly. "This is 216 jobs" is the sentence somebody needs before committing
            compute to it, and it should not have to be inferred from a scrollbar. */}
        <Typography variant="h6" component="p">
          {expansion.size} {expansion.size === 1 ? "job" : "jobs"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This is what the sweep becomes, exactly, before anything is submitted. The count and the
          jobs below are the API&rsquo;s — nothing here expanded a grid of its own.
        </Typography>
        {expansion.jobs.length === 0 ? (
          <EmptyState
            title="The sweep expands to nothing"
            hint="A grid with an empty axis produces no jobs. Nothing would run."
          />
        ) : (
          <Document value={expansion.jobs} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * A compiled plan, rendered as the untyped document it is.
 *
 * **Not dressed up.** The route declares `additionalProperties: true` and nothing else, so this
 * build cannot know which fields it has; presenting invented headings over an unknown shape would
 * be the front end asserting a contract that does not exist. The note is not an apology — it is the
 * reason a reader is looking at JSON rather than a table.
 */
function CompiledPlan({ plan, what }: { plan: unknown; what: "job" | "sweep" }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary" component="h2">
          Compiled {what}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Shown as the API returned it.{" "}
          <strong>The compile routes declare no response schema</strong> — the document is typed as
          an open object in the contract — so this page renders it verbatim rather than laying
          invented headings over a shape it cannot know. Typing those responses is an API change,
          tracked separately.
        </Typography>
        <Document value={plan} />
      </CardContent>
    </Card>
  );
}

/** What a submission produced. Names the backend that accepted it. */
function Submitted({ result }: { result: RunResult }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary" component="h2">
          Run {result.status}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Exit code {result.exit_code}. The run context is addressed at{" "}
          <Box component="code" sx={{ overflowWrap: "anywhere" }}>
            {result.run_context_address}
          </Box>
          .
        </Typography>

        {/* ui#19 out of scope, said rather than left as a gap: Cloud exposes no job-status read.
            POST /cloud/jobs returns a run result and there is no GET /cloud/jobs/{id}, so there is
            nothing to watch and this page does not pretend otherwise. */}
        <Alert severity="info" role="status" sx={{ mt: 2 }}>
          <AlertTitle>There is nothing to watch</AlertTitle>
          <Typography variant="body2">
            This is the whole result: the API answers a submission with a run record and serves no
            job-status read, so there is no progress to follow. Monitoring needs a platform
            capability and then a route before it can have a page — and inventing one in the browser
            would be a progress bar measuring nothing.
          </Typography>
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Typography variant="overline" color="text.secondary" component="h3">
            Run context
          </Typography>
          <Document value={result.run_context} />
        </Box>
      </CardContent>
    </Card>
  );
}
