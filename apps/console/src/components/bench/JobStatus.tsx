"use client";

// Following an evaluation (ui#14; bench.md §7).
//
// **Polled honestly.** A job that is queued says queued — not "loading", not a bar that fills at a
// rate nobody measured. `SubmissionStatus` is a six-member enum with real meanings, and each of
// them is a different thing to tell a reader:
//
//   queued    accepted, waiting for a worker. Nothing is wrong; nothing is happening yet.
//   running   resolving and executing under submit-policy-we-run.
//   scored    scored on the held-out seeds, not yet placed.
//   ranked    verified and on the board. Terminal, and the good one.
//   flagged   an integrity failure — a re-execution did not reproduce the recorded result.
//   rejected  never ran: a bad digest, a manifest/interface mismatch, or a rate-limit refusal.
//
// **Polling stops at a terminal state**, and that is expressed by passing `refreshMs: undefined`
// rather than by a timer this component clears — a page that keeps asking about a job that finished
// twenty minutes ago is a page nobody notices is wasting a request a second. It also stops when the
// reader leaves, which `useApiQuery` guarantees rather than this component remembering to.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@astro-mine/ui";
import NextLink from "next/link";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { hrefWithIdentity, useIdentity } from "@/shell/searchParams";

const IDENTITY = ["id"] as const;

/** How often to ask while a job is still moving. */
const POLL_MS = 3000;

/** The statuses after which nothing more will happen. */
const TERMINAL = new Set(["ranked", "flagged", "rejected"]);

/** What each status means, in a sentence rather than as a colour a reader has to decode. */
const MEANING: Readonly<Record<string, string>> = {
  queued: "Accepted and waiting for a worker. Nothing is wrong — nothing has started yet.",
  running: "Resolving the artifact and executing it on the held-out seeds.",
  scored: "Scored on the held-out seeds. Not yet verified or placed on the board.",
  ranked: "Verified and placed on the leaderboard.",
  flagged:
    "An integrity check failed: a sampled re-execution did not reproduce the recorded result. The entry is on the board and marked.",
  rejected:
    "Never ran. A bad digest, a manifest or interface mismatch, or a rate-limit refusal — the detail below says which.",
};

function statusColor(status: string): "default" | "success" | "warning" | "error" {
  if (status === "ranked") return "success";
  if (status === "flagged") return "warning";
  if (status === "rejected") return "error";
  return "default";
}

export function JobStatus() {
  const { id } = useIdentity(IDENTITY);

  // **One query, and the stopping condition goes to the hook rather than being computed here.**
  // The hook can see its own last answer; this page cannot see it before calling. Written the other
  // way round it would need either a render-phase `setState` or a second copy of the same query.
  //
  // There is no `clearInterval` in this file and no way to forget one: the timer stops when the
  // predicate goes false, when the address changes, and when the reader leaves.
  const job = useApiQuery(
    (client, signal) => client.benchGetJob({ path: { job_id: id! } }, { signal }),
    [id],
    {
      enabled: id !== null,
      refreshMs: POLL_MS,
      refreshWhile: (record) => !TERMINAL.has(record.status),
    },
  );

  return (
    <Box sx={{ mt: 3, maxWidth: 880 }}>
      <ApiResult
        query={job}
        loadingLabel="Reading the job…"
        idle={
          <EmptyState
            title="No job in the address"
            hint="This page is keyed on ?id=… — follow a job from the submission that started it."
          />
        }
      >
        {(data) => (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Chip label={data.status} color={statusColor(data.status)} />
              {TERMINAL.has(data.status) ? (
                <Typography variant="body2" color="text.secondary">
                  Final — no longer being polled.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" role="status">
                  Checking every {POLL_MS / 1000} seconds.
                </Typography>
              )}
            </Stack>

            <Typography variant="body1">
              {MEANING[data.status] ?? `The API reported the status “${data.status}”.`}
            </Typography>

            {data.detail === null || data.detail === "" ? null : (
              <Box>
                <Typography variant="overline" color="text.secondary" component="h2">
                  What the server said
                </Typography>
                {/* Verbatim. A failed evaluation shows the server's reason, not a generic message —
                    which is the only thing that distinguishes a bad digest from a rate limit. */}
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {data.detail}
                </Box>
              </Box>
            )}

            <Box>
              <Typography variant="overline" color="text.secondary" component="h2">
                Job
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {data.job_id}
              </Typography>
            </Box>

            {data.result_id == null ? null : (
              <Link
                component={NextLink}
                href={hrefWithIdentity("/bench/submission", { id: data.result_id ?? null })}
              >
                Open the scorecard this produced
              </Link>
            )}
          </Stack>
        )}
      </ApiResult>
    </Box>
  );
}
