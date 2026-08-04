import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { StudyList } from "@/components/design/StudyList";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design");

export const metadata: Metadata = { title: ENTRY.label };

/** The studies this session has, and the control that launches one (`ui#16`; UC-F3). */
export default function DesignPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Studies
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        A trade study evaluates candidate swarms against an objective and reports which of them are
        not dominated by any other. The seeded example is <strong>an example</strong> — it was not
        run by you, and every number in it came from a stand-in.
      </Typography>

      <StudyList />
    </Box>
  );
}
