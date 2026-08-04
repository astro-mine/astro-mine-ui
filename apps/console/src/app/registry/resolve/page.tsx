import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import { ResolvePage } from "@/components/registry/ResolvePage";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry/resolve");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Resolve — a version spec to the one digest that satisfies it (`ui#11`; UC-G1).
 *
 * No `Suspense` here, unlike the other registry routes: this page is keyed on nothing. What it
 * resolves comes from a form rather than from the address, so it reads no search params and
 * prerenders whole.
 */
export default function RegistryResolvePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Resolve
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 880 }}>
        A name and a version specifier name a <em>set</em> of artifacts. Resolution answers with the
        single immutable digest that set comes to today — which is the thing worth pinning, because
        the specifier will answer differently as soon as something newer satisfies it.
      </Typography>

      <ResolvePage />
    </Box>
  );
}
