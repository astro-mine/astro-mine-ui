import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { ObjectiveForm } from "@/components/design/ObjectiveForm";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design/new");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * State an objective and compose the candidates (`ui#15`; UC-F1, UC-F2).
 *
 * Keyed on nothing, so no `Suspense`: everything comes from the form.
 */
export default function NewStudyPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        New study
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        State what the campaign is <em>for</em>, then compose the swarms to compare against it.{" "}
        <strong>No JSON is typed anywhere</strong>: the objective is captured through a structured
        form, validated against Core by the backend, and content-addressed — and each candidate
        picks a robot from the catalog, so it carries a real digest rather than a name.
      </Typography>

      <ObjectiveForm />
    </Box>
  );
}
