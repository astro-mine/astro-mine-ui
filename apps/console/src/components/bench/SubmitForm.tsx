"use client";

// Entering a policy for evaluation (ui#14; UC-G4; bench.md §5, §9).
//
// **The half of the Phase-1 flywheel the GUI never had.** These routes have been served all along
// and no user interface has ever called them: a researcher could see a ranking and not enter one.
//
// **Two ways in, and the second is the one that matters.** A direct submission names a policy
// reference; a Hub submission names a **content-addressed digest somebody else can pull**. The
// commons only works if what gets ranked is retrievable, so the Hub path is the default here and
// the direct one is the escape hatch — the opposite of the order the routes happen to be declared
// in.
//
// **Submitting is `submit-policy-we-run`.** The reader is not uploading a score; they are handing
// over a policy that this deployment will execute on held-out seeds it does not disclose
// (bench.md §9). The form says so, because a form that looks like "enter your result" invites
// exactly the entry the held-out design exists to prevent.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Digest, RunnerBadge } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState, type FormEvent } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";
import { useApiQuery } from "@/data/useApiQuery";
import { hrefWithIdentity } from "@/shell/searchParams";

import { TokenField, authorizationHeader } from "./TokenField";
import { isFixtureRunner, runnerLabel } from "./format";
import type { BenchJobRecord, Submission } from "./types";

type Route = "hub" | "direct";

/**
 * What came back, which is **not the same shape from the two routes** — and the difference is
 * behaviour rather than a typing detail.
 *
 * `POST /bench/submissions` answers a scored `Submission`: the work is done and there is a
 * scorecard to open. `POST /bench/submissions/hub` answers a `BenchJobRecord`: the artifact has to
 * be resolved from the registry and executed, so what comes back is a **job to follow**. A page
 * that rendered one receipt for both would either invent a scorecard that does not exist yet or
 * hide the job the reader needs to watch.
 */
type Accepted =
  | { readonly kind: "submission"; readonly submission: Submission }
  | { readonly kind: "job"; readonly job: BenchJobRecord };

export function SubmitForm() {
  const [route, setRoute] = useState<Route>("hub");
  const [scenario, setScenario] = useState("");
  const [reference, setReference] = useState("");
  const [author, setAuthor] = useState("");
  const [method, setMethod] = useState("");
  const [token, setToken] = useState("");

  const scenarios = useApiQuery((client, signal) => client.benchListScenarios({ signal }), []);

  const submit = useApiAction(
    async (
      client,
      body: { route: Route; header?: { authorization: string } },
    ): Promise<Accepted> =>
      body.route === "hub"
        ? {
            kind: "job",
            job: await client.benchSubmitHub({
              body: {
                scenario_id: scenario.trim(),
                hub_ref: reference.trim(),
                author: author.trim() === "" ? null : author.trim(),
                method: method.trim() === "" ? null : method.trim(),
              },
              header: body.header,
            }),
          }
        : {
            kind: "submission",
            submission: await client.benchSubmit({
              body: {
                scenario_id: scenario.trim(),
                policy_ref: reference.trim(),
                author: author.trim() === "" ? null : author.trim(),
                method: method.trim() === "" ? null : method.trim(),
              },
              header: body.header,
            }),
          },
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit.invoke({ route, header: authorizationHeader(token) });
  };

  const ready =
    submit.ready &&
    scenario.trim() !== "" &&
    reference.trim() !== "" &&
    submit.state.status !== "pending";

  return (
    <Box sx={{ mt: 3, maxWidth: 880 }}>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={3}>
          <Box>
            <ToggleButtonGroup
              value={route}
              exclusive
              size="small"
              aria-label="Where the policy comes from"
              onChange={(_event, next: Route | null) => {
                if (next !== null) setRoute(next);
              }}
            >
              <ToggleButton value="hub">From a registry digest</ToggleButton>
              <ToggleButton value="direct">Direct reference</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              {route === "hub" ? (
                <>
                  <strong>The path that matters for the commons.</strong> What gets ranked is a
                  content-addressed artifact somebody else can pull, so the result stays checkable
                  after the fact. Find one in the{" "}
                  <Link component={NextLink} href="/registry">
                    registry
                  </Link>
                  .
                </>
              ) : (
                <>
                  A direct reference, for a policy this deployment can already resolve. Nothing
                  guarantees a third party can retrieve it — prefer a registry digest where the
                  entry is meant to be reproducible by anyone.
                </>
              )}
            </Typography>
          </Box>

          <FormControl size="small" fullWidth>
            <InputLabel id="submit-scenario">Scenario</InputLabel>
            <Select
              labelId="submit-scenario"
              label="Scenario"
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              {scenarios.status === "ready"
                ? scenarios.data.map((id) => (
                    <MenuItem key={id} value={id}>
                      {id}
                    </MenuItem>
                  ))
                : null}
            </Select>
          </FormControl>
          {scenarios.status === "ready" && scenarios.data.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              This deployment publishes no scenarios, so there is nothing to submit against.
            </Typography>
          ) : null}

          <TextField
            label={route === "hub" ? "Registry reference or digest" : "Policy reference"}
            required
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            size="small"
            fullWidth
            placeholder={
              route === "hub" ? "commons/excavation-ppo@sha256:…" : "excavation-ppo:1.2.0"
            }
            helperText={
              route === "hub"
                ? "A digest pins exact bytes; a tag is a query that may answer differently later."
                : "Resolved by this deployment. Not necessarily retrievable by anyone else."
            }
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              size="small"
              fullWidth
              helperText="Shown on the leaderboard row. Optional."
            />
            <TextField
              label="Method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              size="small"
              fullWidth
              placeholder="ppo"
              helperText="How the policy was produced. Optional."
            />
          </Stack>

          <TokenField value={token} onChange={setToken} action="submission" />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 760 }}>
              <strong>You are submitting a policy, not a score.</strong> This deployment runs it
              itself, on <strong>held-out seeds it does not disclose</strong>, and scores what its
              own runner produced. Which seeds those are is part of the integrity design, and they
              are not shown here or anywhere else.
            </Typography>
            <Button type="submit" variant="contained" disabled={!ready}>
              {submit.state.status === "pending" ? "Submitting…" : "Submit for evaluation"}
            </Button>
            {submit.ready ? null : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No API is configured, so there is nothing to submit to.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      <Box sx={{ mt: 4 }}>
        {submit.state.status === "failed" ? <FailureNotice failure={submit.state.failure} /> : null}

        {submit.state.status === "done" ? <Receipt accepted={submit.state.data} /> : null}
      </Box>
    </Box>
  );
}

/**
 * The receipt, and where to follow it.
 *
 * Two arms because the two routes answer two different things — see {@link Accepted}. The Hub path
 * hands back a job, so the receipt points at the job page; the direct path hands back a scored
 * submission, so it points at the scorecard. Neither pretends to be the other.
 */
function Receipt({ accepted }: { accepted: Accepted }) {
  if (accepted.kind === "job") {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary" component="h2">
            Queued for evaluation
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The artifact has to be resolved from the registry and executed on the held-out seeds, so
            what came back is a <strong>job</strong> rather than a score. There is no scorecard yet,
            and this page does not invent one.
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
            {accepted.job.job_id} · {accepted.job.status}
          </Typography>
          {accepted.job.detail === null || accepted.job.detail === undefined ? null : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {accepted.job.detail}
            </Typography>
          )}
          <Link
            component={NextLink}
            href={hrefWithIdentity("/bench/jobs", { id: accepted.job.job_id })}
            sx={{ display: "inline-block", mt: 2 }}
          >
            Follow this job
          </Link>
        </CardContent>
      </Card>
    );
  }

  const submission = accepted.submission;
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary" component="h2">
          Accepted
        </Typography>
        <Digest value={submission.submission_id} label="Submission id" defaultExpanded />

        <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          {/* The runner is on the receipt for the same reason it is in the leaderboard row: if this
              deployment scored the entry with the reference fixture, the reader should learn that
              here rather than on discovering their result is not a measurement. */}
          <RunnerBadge
            runner={runnerLabel(submission.runner)}
            standIn={isFixtureRunner(submission.runner)}
          />
          <Typography variant="body2">integrity: {submission.integrity}</Typography>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Link
            component={NextLink}
            href={hrefWithIdentity("/bench/submission", { id: submission.submission_id })}
          >
            Open the scorecard
          </Link>
          <Link
            component={NextLink}
            href={hrefWithIdentity("/bench/leaderboard", { scenario: submission.scenario_id })}
          >
            See the leaderboard
          </Link>
        </Stack>
      </CardContent>
    </Card>
  );
}
