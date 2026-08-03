import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { JobStatus } from "@/components/bench/JobStatus";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/jobs");

export const metadata: Metadata = { title: ENTRY.label };

/** Evaluation status for one job (`ui#14`), keyed on `?id=…`. */
export default function BenchJobsPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Evaluation jobs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        Where one evaluation has got to. A queued job says queued and a failed one says why, in the
        server&rsquo;s own words — and once it reaches a state nothing can follow, this page stops
        asking.
      </Typography>

      <Suspense fallback={null}>
        <JobStatus />
      </Suspense>
    </Box>
  );
}
