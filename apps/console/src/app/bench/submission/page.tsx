import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Scorecard } from "@/components/bench/Scorecard";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/submission");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * One entry's scorecard (`ui#12`, extended by `ui#13`).
 *
 * Keyed on `?id=…` — a submission id is a digest, and `ui.md` §5.1 keeps identity in the query
 * string because a static export cannot prerender a route whose parameters are content addresses.
 */
export default function SubmissionPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Submission
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        The full scorecard for one leaderboard entry: every metric with its bound, how it was
        aggregated and over how many seeds.{" "}
        <strong>What produced the numbers is read before the numbers are</strong>, because it
        changes what they mean.
      </Typography>

      <Suspense fallback={null}>
        <Scorecard />
      </Suspense>
    </Box>
  );
}
