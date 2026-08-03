import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { InspectorGallery } from "@/components/InspectorGallery";

export const metadata: Metadata = { title: "Inspector registry smoke test" };

/**
 * Every state the artifact inspector registry can be in, rendered (ui#7).
 *
 * **A scaffold, and it says so** — the second one, following `/dev/globe`, and for the same reason.
 * `ui#7` fills `@astro-mine/inspectors` with a registry, four panels and `InspectorSlot`, and the
 * page that mounts any of them is `ui#10`. Without a route, the whole distribution's most
 * user-visible new behaviour — what a reader sees when no inspector claims their artifact, or when
 * two claim it equally — could only be asserted in jsdom and argued about in review.
 *
 * **Deliberately outside the navigation**, which makes it the second exception to `ui#5`'s rule that
 * every route has a nav entry. The exception is named in `tests/navigation.test.ts` rather than made
 * into a hole in the check, and it carries its own removal condition: **delete this route, and
 * `InspectorGallery`, when `ui#10` renders the real artifact page.** A scaffold that outlives its
 * reason is an unowned page.
 *
 * It is reachable by URL, so it is not hidden — it is unlisted, which is a different thing, and the
 * banner is what keeps an unlisted page from being mistaken for a product surface.
 */
export default function InspectorSmokePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Inspector registry smoke test
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "80ch" }}>
        Eight subjects through <code>InspectorSlot</code>: the three shipped panels, both shapes of
        no-match, and the ambiguity diagnostic. Every subject is written by hand — the registry
        cannot reach the API, so a panel renders what the page hands it. The globe is the exception
        and the point: it is the application&rsquo;s own, passed in through a slot.
      </Typography>

      <InspectorGallery />
    </Box>
  );
}
