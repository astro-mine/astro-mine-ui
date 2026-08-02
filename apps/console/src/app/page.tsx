import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { StandInBanner } from "@astro-mine/ui";

import { EntryCards } from "@/components/EntryCards";
import { NAV_GROUPS } from "@/shell/navigation";

// Where a reader can go and get somewhere. Home is its own group, and Help has no content yet —
// neither belongs in a list of places to start. Each card names the *section* and describes it with
// the section index's own summary, so the wording has one source.
const STARTING_POINTS = NAV_GROUPS.filter(
  (group) => group.label !== "Home" && group.label !== "Help",
).flatMap((group) => {
  const index = group.entries[0];
  return index === undefined
    ? []
    : [{ href: index.href, label: group.label, summary: index.summary }];
});

/**
 * Home.
 *
 * `ui#9` replaces this with the persona router and the "what is configured" panel it describes. What
 * stands in until then does the honest version of the same job — what this is, and where the parts
 * of it are — rather than a blank pane or a dashboard of numbers nobody measured.
 */
export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 880, py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Astro-Mine
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        An open platform for designing, simulating and evaluating heterogeneous robotic swarms for
        planetary exploration and in-situ resource utilization. This is its single graphical front
        door: one application over the platform&rsquo;s REST tier.
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Not everything the platform does has a page, and that is a decision rather than an omission.
        Authoring an asset, a world, a planner stack or a safety specification has no web edge, so
        it stays on the command line — and the pages that exist say so where it matters, rather than
        leaving a reader hunting for a button that was never there.
      </Typography>

      <StandInBanner title="The persona router has not been built yet">
        <Link href="https://github.com/astro-mine/astro-mine-ui/issues/9" color="inherit">
          ui#9
        </Link>{" "}
        replaces this page with the seven personas as entry points, and a panel that reports what
        this deployment actually has configured. Until then, the sections below are the whole map.
      </StandInBanner>

      <Typography variant="h6" component="h2" sx={{ mt: 4, mb: 1.5 }}>
        Where to start
      </Typography>

      <EntryCards entries={STARTING_POINTS} />
    </Box>
  );
}
