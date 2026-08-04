import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { BrowseRegistry } from "@/components/registry/BrowseRegistry";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Registry — search over the commons (`ui#10`; UC-G2).
 *
 * **The heading and the standing prose live here, above the boundary, and that is the pattern
 * rather than a detail.** `useSearchParams` opts its whole subtree out of prerendering, so
 * everything inside the `Suspense` below contributes nothing to the exported HTML. Put the title
 * inside it and the static export ships a page with no heading — which the build lane rejects
 * outright ("Every route prerenders its own content"), because a route that paints blank until
 * hydration is the failure that check exists to catch.
 *
 * So the split is: what is true of the page regardless of the address is prerendered; only the
 * search itself, which genuinely depends on the query string, waits for JavaScript.
 */
export default function RegistryPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registry
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 880 }}>
        Everything the platform can run is stored as a <strong>content-addressed artifact</strong> —
        a world, a robot, a policy, a published campaign. Search is open:{" "}
        <strong>reading needs no account</strong>, and nothing here will ask you for one.
      </Typography>

      <Suspense fallback={null}>
        <BrowseRegistry />
      </Suspense>
    </Box>
  );
}
