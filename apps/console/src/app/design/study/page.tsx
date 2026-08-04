import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { StudyComparison } from "@/components/design/StudyComparison";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design/study");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Compare the front (`ui#16`; UC-F3, UC-F4).
 *
 * Keyed on `?id=…`. The three honesty statements render above the plots — see `Honesty.tsx` for
 * why all three exist, which is that the picture is identical either way.
 */
export default function StudyPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Study
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        The evaluated candidates, the Pareto front, and every metric they were scored on.{" "}
        <strong>The front is the backend&rsquo;s</strong> — this page computes nothing and re-ranks
        nothing.
      </Typography>

      <Suspense fallback={null}>
        <StudyComparison />
      </Suspense>
    </Box>
  );
}
