import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CampaignPage } from "@/components/design/CampaignPage";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design/campaign");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * A published campaign (`ui#18`; UC-F6), keyed on `?ref=…`.
 *
 * The route it reads has been served all along and nothing in any user interface has ever called
 * it. What it returns is the artifact Ops consumes unchanged, so what a reviewer can check here is
 * what they can check before the hand-off.
 */
export default function CampaignRoutePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Campaign
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        A published campaign is <strong>signed and content-addressed</strong>, and its value is its
        lineage: which objective, which candidate, which world and which evaluator produced the
        choice. Campaigns are immutable — a change is a new version.
      </Typography>

      <Suspense fallback={null}>
        <CampaignPage />
      </Suspense>
    </Box>
  );
}
