"use client";

// The steward's view (ui#14; UC-G7; bench.md §9; charter §9.4).
//
// **A leaderboard could be operated only through `curl` until this page existed.** What was
// admitted, what was flagged, what was retracted, and on whose authority — the trail has been
// served all along and nothing has ever called it.
//
// **A read, and open like every other read.** `authorization` is an *optional* header on
// `GET /bench/audit`, so this page never prompts: an unauthenticated reader sees the trail their
// deployment chooses to show them, and a steward with a token sees whatever more it grants. That
// is ui#14's criterion — *"an unauthenticated user can read the leaderboard and the audit trail
// without ever being prompted"* — and it is why the token control here is an optional disclosure
// rather than a gate in front of the table.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
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
import TextField from "@mui/material/TextField";
import { EmptyState } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { hrefWithIdentity, useIdentity, useSetIdentity } from "@/shell/searchParams";

import { TokenField, authorizationHeader } from "./TokenField";

const IDENTITY = ["decision", "action", "submission_id"] as const;

/** Every value the API's `AuditDecision` enum can carry. */
const DECISIONS = ["allow", "deny", "verified", "rejected"] as const;

function decisionColor(decision: string): "default" | "success" | "warning" | "error" {
  if (decision === "allow" || decision === "verified") return "success";
  if (decision === "deny") return "warning";
  if (decision === "rejected") return "error";
  return "default";
}

/**
 * An ISO instant, rendered as one.
 *
 * **`toISOString`, not a locale format**, and the same reasoning as the replay scrubber: an audit
 * trail is evidence, and evidence read in the reader's own time zone is evidence two people
 * describe differently. UTC, spelled out.
 */
function occurredAt(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : `${parsed.toISOString().replace("T", " ")}`;
}

export function AuditTrail() {
  const params = useIdentity(IDENTITY);
  const setIdentity = useSetIdentity();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const trail = useApiQuery(
    (client, signal) =>
      client.benchAuditTrail(
        {
          query: {
            decision: params.decision as never,
            action: params.action,
            submission_id: params.submission_id,
            limit: 100,
          },
          header: authorizationHeader(token),
        },
        { signal },
      ),
    [params.decision, params.action, params.submission_id, token],
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="decision-label">Decision</InputLabel>
          <Select
            labelId="decision-label"
            label="Decision"
            value={params.decision ?? ""}
            onChange={(event) => setIdentity({ decision: event.target.value || null })}
          >
            <MenuItem value="">
              <em>Any</em>
            </MenuItem>
            {DECISIONS.map((decision) => (
              <MenuItem key={decision} value={decision}>
                {decision}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Action"
          size="small"
          value={params.action ?? ""}
          onChange={(event) => setIdentity({ action: event.target.value || null })}
        />
        <TextField
          label="Submission"
          size="small"
          value={params.submission_id ?? ""}
          onChange={(event) => setIdentity({ submission_id: event.target.value || null })}
        />
      </Stack>

      {/* Behind a disclosure, not in front of the table. The trail is readable without one, and a
          credential field a reader meets first reads as a wall. */}
      <Box sx={{ mb: 3 }}>
        <Link component="button" type="button" onClick={() => setShowToken((on) => !on)}>
          {showToken ? "Hide the token field" : "I have a steward token"}
        </Link>
        {/* `unmountOnExit`: a collapsed MUI `Collapse` keeps its children mounted, which would leave a
            password field in the DOM — tab-reachable, autofillable, and findable by a test asserting
            that nothing prompts for a credential. Closed means absent. */}
        <Collapse in={showToken} unmountOnExit>
          <Box sx={{ mt: 2, maxWidth: 560 }}>
            <TokenField value={token} onChange={setToken} action="read" />
          </Box>
        </Collapse>
      </Box>

      <ApiResult
        query={trail}
        loadingLabel="Reading the audit trail…"
        empty={
          <EmptyState
            title="No audit events match"
            hint="Either nothing has been admitted, flagged or retracted on this deployment, or the filters above exclude it."
          />
        }
      >
        {(events) => (
          <TableContainer sx={{ maxHeight: "70vh", overflowX: "auto" }}>
            <Table size="small" stickyHeader aria-label="Audit trail">
              <TableHead>
                <TableRow>
                  <TableCell>When (UTC)</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Decision</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Issuer</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Submission</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.event_id} hover>
                    <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {occurredAt(event.occurred_at)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{event.action}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={event.decision}
                        color={decisionColor(event.decision)}
                      />
                    </TableCell>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>{event.resource || "—"}</TableCell>
                    <TableCell>{event.subject ?? "—"}</TableCell>
                    {/* On whose authority — the column that makes this a governance record rather
                        than a log. */}
                    <TableCell>{event.issuer ?? "—"}</TableCell>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>{event.reason || "—"}</TableCell>
                    <TableCell>
                      {event.submission_id == null ? (
                        "—"
                      ) : (
                        <Link
                          component={NextLink}
                          href={hrefWithIdentity("/bench/submission", {
                            id: event.submission_id ?? null,
                          })}
                          sx={{ fontFamily: "monospace" }}
                        >
                          {event.submission_id.slice(0, 16)}…
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ApiResult>
    </Box>
  );
}
