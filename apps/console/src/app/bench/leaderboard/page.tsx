import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Leaderboard } from "@/components/bench/Leaderboard";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/leaderboard");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The leaderboard (`ui#12`; UC-G5; LUNAR-UX-006).
 *
 * The heading and the standing explanation prerender; only the board itself is keyed on the
 * address. See `app/registry/page.tsx` for why that split is load-bearing.
 */
export default function LeaderboardPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Leaderboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        Rankings for one scenario, scored on held-out seeds. Every row says{" "}
        <strong>what produced its numbers</strong>: an entry scored by the reference fixture never
        ran the simulator, and is badged in the row rather than in a footnote. Reading a leaderboard
        needs no account.
      </Typography>

      <Suspense fallback={null}>
        <Leaderboard />
      </Suspense>
    </Box>
  );
}
