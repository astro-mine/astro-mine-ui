import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/**
 * A capability this surface needs and cannot reach (ui#3; ui.md §2, honesty rule 3).
 *
 * **"Degrade visibly, never blank. A missing backend is a *state*, with a reason and a remedy, and
 * it stays in the navigation."** Hiding a page whose backend is unconfigured is the tempting move
 * and the wrong one: it makes an unconfigured deployment indistinguishable from a build that never
 * had the feature, and it gives the person who could fix it nothing to act on.
 *
 * `remediation` is not optional in spirit even though it is in the type — a reason with no remedy
 * tells a reader they are stuck. It is optional only because a few states genuinely have no
 * user-side fix, and inventing one would be worse than admitting it.
 *
 * Distinct from an **error** (a request that failed — {@link AsyncState}) and from **empty** (a
 * working surface with no content yet — {@link EmptyState}). It carries its own severity colour for
 * exactly that reason: nothing has failed here, so it must not wear failure's red.
 */
export interface DegradedStateProps {
  /** What is unavailable, stated plainly — e.g. "The registry is not configured". */
  readonly title: string;
  /** Why: what this surface needs and cannot reach. */
  readonly reason: ReactNode;
  /** The concrete fix — the file to write, the setting to set, the service to start. */
  readonly remediation?: ReactNode;
}

export function DegradedState({ title, reason, remediation }: DegradedStateProps) {
  return (
    // `role="status"`, not `alert`: an alert interrupts, and this is a standing condition rather
    // than an event. It is announced when it appears and then left alone.
    <Alert severity="degraded" role="status">
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" component="p">
        {reason}
      </Typography>
      {remediation === undefined ? null : (
        <Typography variant="body2" component="p" sx={{ mt: 1, fontWeight: 600 }}>
          {remediation}
        </Typography>
      )}
    </Alert>
  );
}
