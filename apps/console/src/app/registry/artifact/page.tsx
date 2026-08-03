import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ArtifactPage } from "@/components/registry/ArtifactPage";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry/artifact");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * One artifact (`ui#10`).
 *
 * **Identity in the query string, never in the path** (`ui.md` §5.1, normative): a name is not an
 * enumerable set, so `output: 'export'` cannot prerender `/registry/artifact/[name]/[version]`.
 *
 * The `h1` is the page's, and the artifact's reference is an `h2` inside the boundary. The
 * alternative — the reference as the `h1` — would put the only heading on the page inside the
 * subtree that does not prerender, and the export would ship a route with no heading at all. This
 * way round is also the truer reading: the page is *Artifact*, and which artifact is the subject
 * named beneath it.
 */
export default function RegistryArtifactPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Artifact
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        One artifact: what identifies it, what the catalog records about it, what attestations the
        registry holds, and — where a panel exists for its kind — what is inside it.
      </Typography>

      <Suspense fallback={null}>
        <ArtifactPage />
      </Suspense>
    </Box>
  );
}
