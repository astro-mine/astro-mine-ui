import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { Backends } from "@/components/compute/Backends";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/compute/backends");

export const metadata: Metadata = { title: ENTRY.label };

/** The execution backends this deployment offers (`ui#19`). */
export default function BackendsPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Backends
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        Where work can run, and what each backend is for. A deployment with none configured has
        nowhere to send a job — which is worth knowing before submitting one rather than after.
      </Typography>

      <Backends />
    </Box>
  );
}
