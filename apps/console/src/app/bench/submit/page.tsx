import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { SubmitForm } from "@/components/bench/SubmitForm";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/submit");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Enter a policy for evaluation (`ui#14`; UC-G4).
 *
 * No `Suspense`: the form is keyed on nothing in the address.
 */
export default function SubmitPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Submit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        Enter a policy for evaluation. <strong>This deployment runs it</strong> — you are submitting
        a policy, not a score — on held-out seeds it does not disclose. Submitting needs a token;
        reading the leaderboard never does.
      </Typography>

      <SubmitForm />
    </Box>
  );
}
