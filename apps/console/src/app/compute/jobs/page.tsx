import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { Jobs } from "@/components/compute/Jobs";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/compute/jobs");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Submit a job, and preview what a sweep expands to first (`ui#19`).
 *
 * Keyed on nothing, so no `Suspense`.
 */
export default function ComputeJobsPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Jobs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        A sweep compiles to a concrete plan before anything runs, and{" "}
        <strong>
          seeing that plan is the difference between launching a thousand runs and finding out
          afterwards what they were
        </strong>
        . Everything here is a preview or a submission; the scheduling is the platform&rsquo;s.
      </Typography>

      <Jobs />
    </Box>
  );
}
