"use client";

// Where the CLI is the answer, and why (ui#34; ui.md §5).
//
// **`ui.md` §5 claims that "nothing is GUI-unreachable by construction".** That is a real claim and
// it needs somewhere to land: a capability with no GUI has to be *discoverable from* the GUI, or
// the claim is a sentence nobody can check. This is where it lands.
//
// **Asserted against the navigation table, so the list cannot rot.** ui#34's criterion: every
// capability named here must genuinely have no page. If one of them ever gains a route, the test
// fails and the entry has to go — which is the only way a list like this survives a wave of new
// pages.

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { CLI_ONLY } from "./cliOnly";

export function CliAnswers() {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Where the command line is the answer
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 880 }}>
        These have no page, and that is a decision rather than a backlog. What bounds this
        application is what the API serves — Fleet, Worlds, Mind, Guard and Learn have no REST
        surface, and Sim speaks gRPC, which is not a web edge.{" "}
        <strong>Nothing here makes that permanent</strong>: the way to change it is a platform
        capability, then an API route, then a page.
      </Typography>

      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Capabilities with no page">
          <TableHead>
            <TableRow>
              <TableCell>Capability</TableCell>
              <TableCell>Why it has no page</TableCell>
              <TableCell>What does it</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CLI_ONLY.map((entry) => (
              <TableRow key={entry.capability}>
                <TableCell>{entry.capability}</TableCell>
                <TableCell>{entry.why}</TableCell>
                <TableCell>
                  <Box component="code" sx={{ fontSize: "0.8125rem", overflowWrap: "anywhere" }}>
                    {entry.command}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
