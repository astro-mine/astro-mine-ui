"use client";

// What this deployment can run on (ui#19; cloud.md).
//
// `GET /cloud/backends` answers a map of backend name → the capabilities it offers, and it is the
// first thing worth knowing before submitting anything: a job sent to a deployment with no backend
// is a job that fails for a reason nothing on the page explained.
//
// **With none configured, that is a state with words** — the acceptance criterion, and the reason
// it is one is that an empty list is indistinguishable from a page that has not loaded.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@astro-mine/ui";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";

/** What each backend is for, where this build knows. Unknown names are listed, never hidden. */
const DESCRIBED: Readonly<Record<string, string>> = {
  local:
    "Runs in this deployment's own process. No scheduler, no queue — for a handful of short jobs.",
  ray: "A Ray cluster: distributed rollouts and training, scheduled across workers.",
  argo: "Argo Workflows on Kubernetes: long, multi-step, resumable batches.",
  k8s: "Plain Kubernetes jobs.",
};

export function Backends() {
  const backends = useApiQuery((client, signal) => client.cloudBackends({ signal }), []);

  return (
    <Box sx={{ mt: 3 }}>
      <ApiResult
        query={backends}
        loadingLabel="Reading the backends this deployment offers…"
        isEmpty={(data) => Object.keys(data).length === 0}
        empty={
          <EmptyState
            title="This deployment has no execution backends configured"
            hint={
              <>
                There is nowhere for a job to run. That is a deployment configuration rather than
                anything you did — and it is why the submit controls on the jobs page explain
                themselves instead of offering a button that would fail.
              </>
            }
          />
        }
      >
        {(data) => (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {Object.keys(data).length} {Object.keys(data).length === 1 ? "backend" : "backends"}{" "}
              configured.
            </Typography>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" aria-label="Execution backends">
                <TableHead>
                  <TableRow>
                    <TableCell>Backend</TableCell>
                    <TableCell>What it is for</TableCell>
                    <TableCell>Capabilities</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(data).map(([name, capabilities]) => (
                    <TableRow key={name}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{name}</TableCell>
                      <TableCell>
                        {DESCRIBED[name] ?? (
                          // A backend this build has never heard of is still real. Saying "unknown"
                          // is honest; omitting the row would hide a capability the deployment has.
                          <Typography variant="body2" color="text.secondary">
                            Not a backend this build has a description for — it is still offered.
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {capabilities.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            none declared
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                            {capabilities.map((capability) => (
                              <Chip
                                key={capability}
                                size="small"
                                variant="outlined"
                                label={capability}
                              />
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </ApiResult>
    </Box>
  );
}
