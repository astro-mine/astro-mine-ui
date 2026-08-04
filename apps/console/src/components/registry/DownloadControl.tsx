"use client";

// Asking whether these bytes may be materialized (ui#11; hub.md §2 principle 8, §9).
//
// **The route is called download and it does not download.** `POST /hub/artifacts/{name}/{version}
// /download` answers a `DownloadGrant` — a digest, a policy engine and a policy version — which is
// *permission plus the rule that granted it*, not an octet stream. That is the correct design:
// license and export-control gating are evaluated at the download boundary against the manifest's
// capability tags (conventions.md §12, charter §9.5), and what a consumer needs to record is which
// rules let the bytes in.
//
// It is also a trap for this component, and the reason it is written the way it is. A button
// labelled "Download" that produces no file is a bug report; one that produces a file the platform
// never sent would be a lie. So the control says what it does — **check the gate** — and the result
// names the policy that answered and points at the CLI for the bytes.
//
// **A refusal here is a policy answer, not a failure.** `download_denied` means the gate evaluated
// and said no, which a reader can act on; it is rendered as the refusal it is, carrying the
// deployment's own reason.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Digest } from "@astro-mine/ui";
import { useState } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";

export interface DownloadControlProps {
  readonly name: string;
  readonly version: string;
  /** Shown in the command this offers, so the reader copies something that resolves. */
  readonly reference: string;
}

export function DownloadControl({ name, version, reference }: DownloadControlProps) {
  const [requireVerified, setRequireVerified] = useState(false);

  const check = useApiAction((client, verified: boolean) =>
    client.hubDownload({
      path: { name, version },
      // `allowed_licenses: null` means "do not filter on licence here" rather than "allow none" —
      // the API reads an absent list as unconstrained, and sending `[]` would refuse everything.
      body: { grants: [], require_verified: verified, allowed_licenses: null },
    }),
  );

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Materializing the bytes
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        This deployment evaluates{" "}
        <strong>licence and export-control policy at the download boundary</strong>, against the
        capability tags in the artifact&rsquo;s manifest. The check below asks whether these bytes
        may be materialized and <strong>records which policy answered</strong> — it does not
        transfer anything. Pull the bytes with the CLI, which re-verifies the signature chain before
        Core loads the plugin.
      </Typography>

      <Box
        component="pre"
        sx={{
          m: 0,
          mb: 2,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "action.hover",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
          overflowX: "auto",
        }}
      >
        astro-mine hub pull {reference}
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
        <Button
          variant="outlined"
          disabled={!check.ready || check.state.status === "pending"}
          onClick={() => void check.invoke(requireVerified)}
        >
          {check.state.status === "pending" ? "Checking…" : "Check the download gate"}
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              checked={requireVerified}
              onChange={(event) => setRequireVerified(event.target.checked)}
            />
          }
          label="Require a verified publisher"
        />
      </Stack>

      {check.ready ? null : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No API is configured, so there is no gate to ask.
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        {check.state.status === "failed" ? <FailureNotice failure={check.state.failure} /> : null}

        {check.state.status === "done" ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary" component="h4">
                Granted
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The gate allows this artifact to be materialized. The policy that said so travels
                with the grant, so a consumer can record which rules let it in.
              </Typography>
              <Digest value={check.state.data.digest} label="Granted digest" />
              <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" component="h5">
                    Policy engine
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {check.state.data.policy_engine}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" component="h5">
                    Policy version
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {check.state.data.policy_version}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
}
