import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/**
 * Nothing here yet — said in words (ui#3; ui.md §2, honesty rule 3).
 *
 * "Title and hint, never an empty div." Three states get confused with one another constantly and
 * this is the least alarming of them: **empty** is a working surface with no content *yet*
 * ({@link EmptyState}), **degraded** is a working surface that cannot reach something it needs
 * ({@link DegradedState}), and **error** is a request that failed ({@link AsyncState}). Rendering an
 * empty result as a blank pane makes it indistinguishable from the other two, and a reader who
 * cannot tell them apart cannot tell whether to wait, to configure something, or to retry.
 *
 * It offers a way forward rather than a dead end — which is what `hint` and `action` are for.
 */
export interface EmptyStateProps {
  /** What is empty, stated plainly — e.g. "No candidate swarms yet". */
  readonly title: string;
  /** How to fill it: a next step, a CLI command, the thing that has not happened yet. */
  readonly hint?: ReactNode;
  /** An optional call to action — a button, a link. */
  readonly action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <Stack
      spacing={1}
      // `role="status"` rather than a bare div: when a fetch resolves to nothing, a screen-reader
      // user gets told so, instead of being left with a silence that reads as "still loading".
      role="status"
      sx={{
        alignItems: "center",
        textAlign: "center",
        px: 3,
        py: 5,
        color: "text.secondary",
      }}
    >
      <Typography variant="subtitle1" sx={{ color: "text.primary", fontWeight: 600 }}>
        {title}
      </Typography>
      {hint === undefined ? null : (
        <Typography variant="body2" sx={{ maxWidth: "48ch" }}>
          {hint}
        </Typography>
      )}
      {action === undefined ? null : <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}
