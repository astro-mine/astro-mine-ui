"use client";

// A published campaign, opened (ui#18; UC-F6).
//
// **Nothing in any user interface has ever called this route.** `GET /studio/campaigns/{reference}`
// has been served all along, and the artifact it returns is the hand-off Ops consumes unchanged
// (studio.md §2 principle 9) — so what a reviewer can see of it is what they can check before it
// is handed over.
//
// **Lineage is the content.** A campaign is not interesting because it names a swarm; it is
// interesting because it records *which objective*, *which candidate*, *which world* and *which
// evaluator* produced the choice. Those are laid out as facts with their hashes rather than
// summarised, because a reviewer's question is "can I reproduce the reasoning", not "what is it
// called".

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState, RunnerBadge } from "@astro-mine/ui";
import NextLink from "next/link";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useIdentity } from "@/shell/searchParams";

import { isStandInEvaluator } from "./Honesty";
import { artifactHrefFor } from "./campaignLinks";
import type { Campaign } from "./types";

const IDENTITY = ["ref"] as const;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        {value}
      </Box>
    </Box>
  );
}

function Lineage({ campaign }: { campaign: Campaign }) {
  const chosen = campaign.chosen;
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gap: 2 }}>
      <Fact
        label="Objective"
        value={<Digest value={campaign.objective_hash} label="Objective hash" defaultExpanded />}
      />
      <Fact
        label="Evaluator"
        value={
          campaign.evaluator == null ? (
            <Typography variant="body2" color="text.secondary">
              not recorded
            </Typography>
          ) : (
            // The same badge the leaderboard uses, for the same reason: if a stand-in chose this
            // design, a reviewer should read that before the design.
            <RunnerBadge
              runner={campaign.evaluator}
              standIn={isStandInEvaluator(campaign.evaluator)}
            />
          )
        }
      />
      <Fact
        label="World it was checked against"
        value={
          campaign.world_ref == null ? (
            <Typography variant="body2" color="text.secondary">
              None recorded — the design was published without a world resolved, so which terrain it
              was inspected on is not part of this artifact.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {campaign.world_ref}
            </Typography>
          )
        }
      />
      <Fact
        label="Trade study"
        value={
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {campaign.trade_study_ref ?? "not recorded"}
          </Typography>
        }
      />
      <Fact
        label="Chosen candidate"
        value={
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {chosen.candidate.id} · seed {chosen.seed} ·{" "}
            {chosen.score.passed ? "passed" : "did not pass"} the objective
          </Typography>
        }
      />
    </Box>
  );
}

function Swarm({ campaign }: { campaign: Campaign }) {
  const swarm = campaign.chosen.candidate.swarm;
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        The swarm
      </Typography>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="The chosen candidate's swarm">
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell>Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {swarm.map((selection) => (
              <TableRow key={selection.sadf_ref}>
                <TableCell sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
                  {selection.sadf_ref}
                </TableCell>
                <TableCell>{selection.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function Phases({ campaign }: { campaign: Campaign }) {
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Phases
      </Typography>
      {campaign.phases.length === 0 ? (
        <EmptyState
          title="This campaign declares no phases"
          hint="A single-phase campaign is the ordinary case at this tier; the phase model is the Phase-3 mission track."
        />
      ) : (
        <Stack spacing={1}>
          {campaign.phases.map((phase) => (
            <Typography key={phase.id} variant="body2">
              <strong>{phase.name}</strong>{" "}
              <Box component="code" sx={{ ml: 1 }}>
                {phase.id}
              </Box>
              {phase.duration_s == null ? null : ` · ${phase.duration_s} s`}
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export function CampaignPage() {
  const { ref } = useIdentity(IDENTITY);

  const campaign = useApiQuery(
    (client, signal) => client.studioPullCampaign({ path: { reference: ref! } }, { signal }),
    [ref],
    { enabled: ref !== null },
  );

  return (
    <Box sx={{ mt: 3 }}>
      <ApiResult
        query={campaign}
        loadingLabel="Reading the campaign…"
        idle={
          <EmptyState
            title="No campaign in the address"
            hint="This page is keyed on ?ref=… — open one from the study that published it, or from the registry."
          />
        }
      >
        {(data) => (
          <Stack spacing={4}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ overflowWrap: "anywhere" }}>
                {data.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {data.id}
              </Typography>
              <Link
                component={NextLink}
                href={artifactHrefFor(data.name)}
                sx={{ display: "inline-block", mt: 1 }}
              >
                Find it in the registry
              </Link>
            </Box>

            <Divider />
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                Lineage
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
                What produced this choice. A campaign is the artifact Ops consumes unchanged, so
                what a reviewer can check here is what they can check before it is handed over.
              </Typography>
              <Lineage campaign={data} />
            </Box>

            <Divider />
            <Swarm campaign={data} />

            <Divider />
            <Phases campaign={data} />
          </Stack>
        )}
      </ApiResult>
    </Box>
  );
}
