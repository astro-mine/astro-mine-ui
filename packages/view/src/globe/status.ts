/**
 * The scene's liveness vocabulary — "degrade, don't blank" made explicit (view.md §2 principle 5).
 *
 * Tiles arrive over flaky links. A partial or late scene is *labelled*, never silently presented as
 * complete and never replaced by a frozen or empty screen. The distinction that matters:
 *
 * - `stale` — the body and whatever terrain arrived are on screen, but something is missing or late.
 *   Keep rendering; say so.
 * - `unavailable` — no terrain at all. Still render the body, still say so. Never blank.
 */

export type GlobeStatusKind = "initializing" | "loading" | "ready" | "stale" | "unavailable";

export interface GlobeStatus {
  readonly kind: GlobeStatusKind;
  /** Human-readable explanation, shown to the operator. Never empty. */
  readonly detail: string;
}

export const INITIALIZING: GlobeStatus = { kind: "initializing", detail: "Resolving world…" };

/** Whether the scene is showing everything it was asked to show. */
export function isComplete(status: GlobeStatus): boolean {
  return status.kind === "ready";
}

/** Whether the scene is showing something, but not everything — the honest middle ground. */
export function isDegraded(status: GlobeStatus): boolean {
  return status.kind === "stale" || status.kind === "unavailable";
}
