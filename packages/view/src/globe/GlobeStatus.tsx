/**
 * The scene's honesty badge (view.md §2 principle 5).
 *
 * Purely presentational and always mounted: an operator can tell at a glance whether they are
 * looking at a complete scene, a partial one, or a bare body. Its `data-status` attribute is also
 * the signal the Playwright lane waits on.
 */
import type { CSSProperties, JSX } from "react";

import { isDegraded } from "./status";
import type { GlobeStatus as GlobeStatusValue } from "./status";
import { OVERLAY } from "../palette";

export interface GlobeStatusProps {
  readonly status: GlobeStatusValue;
  readonly className?: string;
  readonly style?: CSSProperties;
}

const base: CSSProperties = {
  position: "absolute",
  top: "0.5rem",
  left: "0.5rem",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  font: "0.75rem system-ui, sans-serif",
  pointerEvents: "none",
  userSelect: "none",
};

const READY_STYLE: CSSProperties = {
  background: OVERLAY.ready.background,
  color: OVERLAY.ready.foreground,
};
const DEGRADED_STYLE: CSSProperties = {
  background: OVERLAY.degraded.background,
  color: OVERLAY.degraded.foreground,
};
const PENDING_STYLE: CSSProperties = {
  background: OVERLAY.pending.background,
  color: OVERLAY.pending.foreground,
};

function toneFor(status: GlobeStatusValue): CSSProperties {
  if (isDegraded(status)) return DEGRADED_STYLE;
  return status.kind === "ready" ? READY_STYLE : PENDING_STYLE;
}

/** A labelled status chip. Stale and unavailable scenes announce themselves; they never blank. */
export function GlobeStatus({ status, className, style }: GlobeStatusProps): JSX.Element {
  return (
    <div
      className={className}
      style={{ ...base, ...toneFor(status), ...style }}
      role="status"
      aria-live="polite"
      data-testid="globe-status"
      data-status={status.kind}
    >
      {status.detail}
    </div>
  );
}
