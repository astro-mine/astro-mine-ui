import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuditTrail } from "@/components/bench/AuditTrail";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/audit");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The steward's trail (`ui#14`; UC-G7).
 *
 * A read, and open like every other read: `authorization` is optional on `GET /bench/audit`, so
 * this page never prompts. A steward with a token sees whatever more the deployment grants them.
 */
export default function AuditPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Audit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        What was admitted, flagged or retracted, and <strong>on whose authority</strong>. Yank and
        deprecation are auditable governance actions rather than quiet edits, and this is where they
        are answerable. Reading needs no account.
      </Typography>

      <Suspense fallback={null}>
        <AuditTrail />
      </Suspense>
    </Box>
  );
}
