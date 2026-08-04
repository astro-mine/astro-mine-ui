"use client";

// The persona router (ui#9; UC-A4; gap report §5 J6).
//
// **UC-A4 — "find the docs for my task" — has never had a GUI answer**, and J6 records the failure
// this page exists to prevent: an evaluator lands somewhere, concludes *"so this is the GUI"*, and
// leaves. Seven cards, each naming a journey and going to it.
//
// **Every card leads somewhere that exists.** That is the acceptance criterion and it is also why
// four of the seven lead to a command rather than a page: P2, P3 and P4 author things that have no
// REST surface, so there is no page to send them to, and a card that linked somewhere
// plausible-but-unbuilt would be exactly the impression the gap report describes. The honest move
// is to say so and give the command.

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import { PERSONAS } from "./personas";

export function PersonaCards() {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      {PERSONAS.map((persona) => (
        <Card key={persona.id} variant="outlined" component="article">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
              <Chip size="small" label={persona.id} />
              <Typography variant="subtitle1" component="h3">
                {persona.title}
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {persona.who}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {persona.goal}
            </Typography>

            {persona.route === null ? (
              <Box>
                {/* No page, said plainly. This is the whole reason the field is nullable. */}
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>This has no page</strong> — {persona.action}.
                </Typography>
                <Box
                  component="code"
                  sx={{ display: "block", fontSize: "0.8125rem", overflowWrap: "anywhere" }}
                >
                  {persona.command}
                </Box>
              </Box>
            ) : (
              <Link component={NextLink} href={persona.route}>
                {persona.action}
              </Link>
            )}

            <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 2 }}>
              <strong>Watch out for:</strong> {persona.watchOutFor}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
