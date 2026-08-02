import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { StandInBanner } from "@astro-mine/ui";
import type { Metadata } from "next";

import { Globe } from "@/components/Globe";

export const metadata: Metadata = { title: "Globe smoke test" };

/**
 * The globe, mounted in the built export (ui#6).
 *
 * **A scaffold, and it says so.** `ui#6`'s acceptance criterion is that a globe renders *in the
 * static export, not only in development*, and nothing else in the application mounts one yet — the
 * replay pane is `ui#13` and the candidate inspection is `ui#17`, both Wave 29. Without a route
 * there is nothing to render, and the criterion could only be asserted by argument.
 *
 * **It is deliberately outside the navigation**, which makes it the one exception to the rule
 * `ui#5` established — every route has a nav entry, asserted by test. The exception is named in
 * `tests/navigation.test.ts` rather than made into a hole in the check, and it carries its own
 * removal condition: **delete this route when `ui#17` mounts a globe in a real page.** At that point
 * a page a user actually visits proves the same property, and a scaffold that outlives its reason is
 * just an unowned page.
 *
 * It is reachable by URL, so it is not hidden — it is unlisted, which is a different thing, and the
 * banner is what keeps an unlisted page from being mistaken for a product surface.
 */
export default function GlobeSmokePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Globe smoke test
      </Typography>

      <StandInBanner title="A development scaffold, not a page">
        This route exists to prove that Cesium mounts inside the static export. It is not in the
        navigation, nothing links to it, and it is deleted when ui#17 renders a globe in a real
        page.
      </StandInBanner>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
        A body-only scene on the anchor body, with no world bundle resolved — the terrain path needs
        a published world, which is ui#17&rsquo;s. If the sphere below renders and the page did not
        fail to build, Cesium is client-only, its assets are served from this deployment, and
        nothing was fetched from a CDN.
      </Typography>

      <Box sx={{ height: 480, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Globe showStatus showCoordinates style={{ width: "100%", height: "100%" }} />
      </Box>
    </Box>
  );
}
