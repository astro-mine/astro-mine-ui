import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { Configured } from "@/components/orientation/Configured";
import { PersonaCards } from "@/components/orientation/PersonaCards";

const GUIDE = "https://github.com/astro-mine/docs/blob/main/guide";

/**
 * Home — what this is, who you are, and what is configured (`ui#9`; UC-A4).
 *
 * The gap report's J6 records the failure mode this page exists to prevent: an evaluator lands
 * somewhere, concludes *"so this is the GUI"*, and leaves. Three answers, in the order somebody
 * arriving actually needs them — what this is, which of these people you are, and whether the thing
 * in front of you is working.
 *
 * Both client components below are keyed on nothing in the address, so this route needs no
 * `Suspense` boundary and prerenders its heading and prose whole.
 */
export default function HomePage() {
  return (
    <Box sx={{ py: 4, maxWidth: 1080 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Astro-Mine
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 880 }}>
        An open platform for designing, simulating and evaluating heterogeneous robotic swarms for
        planetary exploration and in-situ resource utilization. This is its single graphical front
        door: one application over the platform&rsquo;s REST tier.
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 880 }}>
        <strong>
          Not everything the platform does has a page, and that is a decision rather than an
          omission.
        </strong>{" "}
        Authoring a robot, a world, a planner stack or a safety specification has no web edge, so it
        stays on the command line — and the cards below say so where it applies rather than sending
        you looking for a button that was never there.
      </Typography>

      <Stack spacing={5}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Who are you?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 880 }}>
            Seven people use this platform. Find yourself, then follow the row — each card goes to
            where that journey starts.
          </Typography>
          <PersonaCards />
        </Box>

        <Divider />

        <Configured />

        <Divider />

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Where to read more
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
            The user guide is the long-form answer and is maintained separately. This application
            links to it rather than restating it — a second copy of an explanation is a second copy
            to keep true.
          </Typography>
          <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
            <Link href={`${GUIDE}/getting-started.md`}>Getting started</Link>
            <Link href={`${GUIDE}/tutorials`}>The tutorials</Link>
            <Link href={`${GUIDE}/concepts`}>Concepts</Link>
            <Link href={`${GUIDE}/reference/cli.md`}>The CLI reference</Link>
            <Link component="a" href="/help">
              Concepts and the CLI, in short
            </Link>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
