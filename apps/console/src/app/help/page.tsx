import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { CliAnswers } from "@/components/orientation/CliAnswers";
import { CONCEPTS, GUIDE_BASE } from "@/components/orientation/Concepts";
import { PERSONAS } from "@/components/orientation/personas";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/help");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Help — concepts, the personas, and where the CLI is the answer (`ui#34`; UC-A4).
 *
 * **This page calls no API route, and that is a requirement rather than a coincidence.** It is
 * documentation, and it has to work in exactly the state a first-time reader arrives in: no
 * `config.json`, no endpoint, nothing configured (CX-LOCAL). So there is no client component here,
 * no `Suspense`, and no data hook — the whole page prerenders into the static export.
 *
 * **The personas here are orientation, not a router.** `ui#9`'s home page routes a persona into a
 * journey; this explains what the seven *are*. Both read `components/orientation/personas.ts`, so
 * the two cannot diverge — which `ui#34` asks for in as many words.
 */
export default function HelpPage() {
  return (
    <Box sx={{ py: 4, maxWidth: 1080 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Help
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 880 }}>
        The concepts a reader needs before any other page makes sense, who this platform is for, and
        which capabilities live on the command line rather than here. Everything below links to the
        user guide rather than restating it — a second copy of an explanation is the copy that goes
        stale.
      </Typography>

      <Stack spacing={5}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Concepts
          </Typography>
          <Stack spacing={2}>
            {CONCEPTS.map((concept) => (
              <Card key={concept.title} variant="outlined" component="article">
                <CardContent>
                  <Typography variant="subtitle1" component="h3" gutterBottom>
                    {concept.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {concept.short}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Where it bites here:</strong> {concept.whereItBites}
                  </Typography>
                  <Link href={concept.href}>Read the full treatment</Link>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Who this is for
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 880 }}>
            Seven personas, and which part of the platform serves each. This is orientation — the{" "}
            <Link href="/">home page</Link> routes each of them into where their journey starts.
          </Typography>
          <Stack spacing={1.5}>
            {PERSONAS.map((persona) => (
              <Stack
                key={persona.id}
                direction="row"
                spacing={2}
                sx={{ alignItems: "baseline", flexWrap: "wrap" }}
              >
                <Chip size="small" label={persona.id} />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 280 }}>
                  <strong>{persona.title}</strong> — {persona.who} {persona.goal}
                  {persona.route === null ? (
                    <Box component="span" color="text.secondary">
                      {" "}
                      Served by the command line, not by a page.
                    </Box>
                  ) : null}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Divider />

        <CliAnswers />

        <Divider />

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Where to go next
          </Typography>
          <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
            <Link href={`${GUIDE_BASE}/getting-started.md`}>Getting started</Link>
            <Link href={`${GUIDE_BASE}/tutorials`}>The eight tutorials</Link>
            <Link href={`${GUIDE_BASE}/reference/cli.md`}>The CLI reference</Link>
            <Link href={`${GUIDE_BASE}/reference/file-formats.md`}>File formats</Link>
            <Link href={`${GUIDE_BASE}/reference/personas.md`}>Personas, in full</Link>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
