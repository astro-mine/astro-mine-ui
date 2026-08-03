import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { PublishPage } from "@/components/registry/PublishPage";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry/publish");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Publish — index an already-stored, signed artifact (`ui#11`; UC-G3).
 *
 * Keyed on nothing, so no `Suspense`: everything this page acts on comes from its own form.
 */
export default function RegistryPublishPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Publish
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        Publishing <strong>indexes a manifest for bytes the registry already stores</strong> — it
        uploads nothing. Admission then proves the digest exists, that its bytes are its content
        address, that the manifest offered is the one actually stored, and that the signature, SLSA
        provenance and SBOM verify. All of that happens on the server, and a failed check indexes
        nothing at all.
      </Typography>

      <PublishPage />
    </Box>
  );
}
