import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { RouteDirectory } from "@/components/RouteDirectory";
import { NAV_GROUPS } from "@/shell/navigation";

export const metadata: Metadata = { title: "Not found" };

/**
 * A route that is not one (ui#5).
 *
 * **"A route never blanks the page."** Under `output: 'export'` this renders to `out/404.html`, which
 * is what a static host serves for an unknown path — so it is a real page a real reader arrives at,
 * usually from a link that has rotted or a URL that lost half its query string.
 *
 * It keeps the shell, so the navigation, the search box and the colour toggle are all still there:
 * the reader is not lost, they are on a page that does not exist, and those are different problems.
 * Listing where they *could* go is the cheapest possible remedy, and this is the page where the
 * navigation table earns its keep a second time.
 */
export default function NotFound() {
  return (
    <Box sx={{ maxWidth: 880, py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        No such page
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Nothing is served at that address. If you followed a link that used to work, the page may
        have moved; if you pasted one, check that it kept its query string — this application
        carries the subject of a page in the address, so half a link is a different page.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Everything the application has is listed below and in the sidebar.
      </Typography>

      <RouteDirectory groups={NAV_GROUPS} />
    </Box>
  );
}
