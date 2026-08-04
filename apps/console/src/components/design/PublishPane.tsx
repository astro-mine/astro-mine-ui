"use client";

// Publish the chosen design (ui#18; UC-F6; studio.md §2 principle 9).
//
// **The backend authors the campaign, and this page must not.** `PublishCampaignRequest` carries an
// optional `campaign` field, and the temptation is to fill it in — the page has the objective, the
// candidate and the world, so it could assemble one. It must not, and the reason is the point of
// the artifact: a campaign's value is its **lineage**, and a lineage the browser wrote is a lineage
// the browser vouches for. What is sent is the objective, the chosen candidate, a name, a version
// and the world it was inspected against; what comes back is a signed, content-addressed artifact
// Studio composed and stands behind. `campaign` is left `null` deliberately, and there is a test
// that says so.
//
// **The world is recorded, so a reviewer need not infer it.** ui#18 asks for this explicitly: which
// terrain a design was checked against is part of what makes the check meaningful, and "the one
// that was probably open at the time" is not a record.
//
// **The control reflects availability before it is clicked.** `GET /healthz` names the mounted
// surfaces, so a deployment without Studio disables the control with a reason rather than
// presenting a button that fails. That is a pre-check and not a promise — a mounted Studio can
// still refuse for want of registry wiring, and that refusal is rendered as the backend wrote it.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";
import { hasSurface, useDeployment } from "@/data/useDeployment";

import { artifactHrefFor } from "./campaignLinks";
import type { ComparisonView, DesignCandidate, ObjectiveDocument, WorldResponse } from "./types";

export interface PublishPaneProps {
  readonly view: ComparisonView;
  /** The objective this session captured. Sent as-is; the page never rewrites it. */
  readonly objective?: ObjectiveDocument;
  /** The candidate documents this session composed, by id. */
  readonly candidates: readonly DesignCandidate[];
  /** The world the design was inspected against, if one was resolved. */
  readonly world?: WorldResponse;
}

export function PublishPane({ view, objective, candidates, world }: PublishPaneProps) {
  const [chosenId, setChosenId] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("0.1.0");

  const deployment = useDeployment();
  const studioMounted = hasSurface(deployment, "studio");

  const publish = useApiAction(
    (client, body: Parameters<typeof client.studioPublishCampaign>[0]["body"]) =>
      client.studioPublishCampaign({ body }),
  );

  /**
   * Front members first, and badged.
   *
   * Not filtered to the front — a designer may deliberately publish a dominated candidate, and a
   * page that hid the others would be making that call for them. Offered first, marked, and the
   * rest still reachable.
   */
  const ordered = [...view.candidates].sort(
    (a, b) => Number(b.on_pareto_front) - Number(a.on_pareto_front),
  );

  const chosen = candidates.find((candidate) => candidate.id === chosenId);

  const onPublish = () => {
    if (objective === undefined || chosen === undefined) return;
    void publish.invoke({
      name: name.trim(),
      version: version.trim(),
      objective,
      chosen: {
        candidate: chosen,
        // The score and seed the backend already recorded for this candidate; sent back as the
        // choice's evidence rather than re-derived.
        score: {
          aggregate: view.candidates.find((c) => c.candidate_id === chosenId)?.aggregate ?? 0,
          metric_scores: {},
          objective_hash: view.objective_hash,
          passed: view.candidates.find((c) => c.candidate_id === chosenId)?.passed ?? false,
        },
        seed: view.candidates.find((c) => c.candidate_id === chosenId)?.seed ?? 0,
        world_ref: world?.reference ?? "",
        provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
      },
      // **Recorded, so a reviewer can tell which terrain it was checked on** rather than inferring.
      world_ref: world?.reference ?? null,
      // **Left null on purpose.** The backend composes the Campaign; a document assembled here
      // would be a lineage this browser wrote. Asserted by test.
      campaign: null,
      phases: [],
    });
  };

  const ready =
    publish.ready &&
    studioMounted !== false &&
    objective !== undefined &&
    chosen !== undefined &&
    name.trim() !== "" &&
    version.trim() !== "" &&
    publish.state.status !== "pending";

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Publish this design
      </Typography>

      {studioMounted === false ? (
        <Alert severity="degraded" role="status" sx={{ mb: 2 }}>
          <AlertTitle>This deployment does not mount Studio</AlertTitle>
          <Typography variant="body2">
            Publishing a campaign needs the Studio surface, and <Box component="code">/healthz</Box>{" "}
            reports it is not mounted here. The control below is disabled rather than offering a
            button that would fail on click.
          </Typography>
        </Alert>
      ) : null}

      {objective === undefined ? (
        <EmptyState
          title="No objective in this session"
          hint="A campaign is published against the objective the design was made for. Capture one on the new-study page and re-run the study here."
        />
      ) : (
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="chosen-label">Candidate</InputLabel>
            <Select
              labelId="chosen-label"
              label="Candidate"
              value={chosenId}
              onChange={(event) => setChosenId(event.target.value)}
            >
              {ordered.map((candidate) => (
                <MenuItem key={candidate.candidate_id} value={candidate.candidate_id}>
                  {candidate.candidate_id}
                  {candidate.on_pareto_front ? " · on the front" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {chosenId !== "" && chosen === undefined ? (
            <Alert severity="warning" role="status">
              <AlertTitle>This session has no document for that candidate</AlertTitle>
              <Typography variant="body2">
                The comparison names it, but the swarm it is made of was composed in another
                session. Publishing sends the candidate document itself, so it has to be one this
                browser holds.
              </Typography>
            </Alert>
          ) : null}

          <TextField
            label="Campaign name"
            size="small"
            fullWidth
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Version"
            size="small"
            fullWidth
            required
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {world === undefined ? (
                <>
                  <strong>No world is resolved</strong>, so the published campaign will record none.
                  Resolve one above if a reviewer should be able to tell which terrain this design
                  was checked against.
                </>
              ) : (
                <>
                  The world <Box component="code">{world.reference}</Box> is recorded on the
                  campaign, so a reviewer can tell which terrain this was checked on rather than
                  inferring it.
                </>
              )}
            </Typography>
            <Button variant="contained" disabled={!ready} onClick={onPublish}>
              {publish.state.status === "pending" ? "Publishing…" : "Publish the campaign"}
            </Button>
          </Box>
        </Stack>
      )}

      <Box sx={{ mt: 3 }}>
        {publish.state.status === "failed" ? (
          <FailureNotice failure={publish.state.failure} />
        ) : null}

        {publish.state.status === "done" ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary" component="h4">
                Published
              </Typography>
              {/* The reference AND the digest — a reference is a query and the digest is what a
                  reviewer pins. */}
              <Typography variant="h6" component="p" sx={{ overflowWrap: "anywhere" }}>
                {publish.state.data.reference}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Digest value={publish.state.data.digest} label="Campaign digest" defaultExpanded />
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                <Chip size="small" variant="outlined" label={publish.state.data.kind} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`content ${publish.state.data.content_digest.slice(0, 20)}…`}
                />
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
                <Link component={NextLink} href={artifactHrefFor(publish.state.data.reference)}>
                  Open it in the registry
                </Link>
                <Link
                  component={NextLink}
                  href={`/design/campaign?ref=${encodeURIComponent(publish.state.data.reference)}`}
                >
                  Open the campaign
                </Link>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
}
