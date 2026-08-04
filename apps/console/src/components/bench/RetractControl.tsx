"use client";

// Withdrawing an entry from the board (ui#14; charter §9.4).
//
// **A consequential action, presented as one.** ui#14 says it in as many words: *"Retract — a
// confirmed, consequential action, presented as one. Never a bare icon button."* Yanking and
// deprecation are auditable governance actions, and a retraction changes what the commons says
// about somebody's work. A bin icon in the corner of a row is how that gets done by accident.
//
// So: a named button, a dialog that **names what is being retracted**, a reason the trail will
// record, and a confirmation that is a deliberate second act rather than a reflex.

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";

import { TokenField, authorizationHeader } from "./TokenField";

export interface RetractControlProps {
  readonly submissionId: string;
  /** What the entry is, so the dialog can name it rather than saying "this item". */
  readonly policyRef: string;
  readonly scenarioId: string;
  /** Called after a retraction succeeds, so the page can re-read what changed. */
  readonly onRetracted?: () => void;
}

export function RetractControl({
  submissionId,
  policyRef,
  scenarioId,
  onRetracted,
}: RetractControlProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [reason, setReason] = useState("");

  const retract = useApiAction((client, header: { authorization: string } | undefined) =>
    client.benchRetractSubmission({ path: { submission_id: submissionId }, header }),
  );

  const confirm = async () => {
    // `ok`, not "did it resolve to something". This route answers with no body, so a *successful*
    // retraction resolves to `undefined` — see `ApiActionResult`.
    const result = await retract.invoke(authorizationHeader(token));
    if (result.ok) {
      setOpen(false);
      onRetracted?.();
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        color="warning"
        disabled={!retract.ready}
        onClick={() => setOpen(true)}
      >
        Retract this submission
      </Button>
      {retract.ready ? null : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No API is configured, so there is nothing to retract from.
        </Typography>
      )}

      {retract.state.status === "done" ? (
        <Alert severity="success" role="status" sx={{ mt: 2 }}>
          Retracted. The board no longer carries this entry, and the audit trail records who
          retracted it and why.
        </Alert>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="retract-title">
        <DialogTitle id="retract-title">Retract this submission?</DialogTitle>
        <DialogContent>
          {/* Naming the subject is the point of the dialog. "Are you sure?" over an unnamed thing
              is a question nobody can answer correctly. */}
          <DialogContentText component="div">
            This removes <strong>{policyRef}</strong> from the <strong>{scenarioId}</strong>{" "}
            leaderboard.
            <Box
              component="code"
              sx={{ display: "block", mt: 1, fontSize: "0.8125rem", overflowWrap: "anywhere" }}
            >
              {submissionId}
            </Box>
          </DialogContentText>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Retraction is an <strong>auditable governance action</strong>: it is recorded in the
            trail with the authority it was taken under. It is not a way to hide a result.
          </Typography>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
              helperText="Recorded on the audit event. Say why, for whoever reads the trail later."
            />
            <TokenField value={token} onChange={setToken} action="retraction" />
          </Stack>

          {retract.state.status === "failed" ? (
            <Box sx={{ mt: 2 }}>
              <FailureNotice failure={retract.state.failure} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={retract.state.status === "pending"}
            onClick={() => void confirm()}
          >
            {retract.state.status === "pending" ? "Retracting…" : "Retract"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
