/**
 * The reference embeddable widget — proves the library-consumption + props/context contract
 * (view.md §2 principle 4 "embeddable first"). It carries no View feature; the real globe,
 * geometry, timeline, and replay widgets land in RM-P1-VIEW-02..04. It is deliberately
 * command-free and dependency-light (view.md §2 principle 1).
 */
import type { CSSProperties, ReactNode, JSX } from "react";

export interface PlaceholderProps {
  /** Human-readable label shown in the frame. */
  label?: string;
  /** Optional slot content, so a host can verify child composition. */
  children?: ReactNode;
  /** Escape hatch for host styling; the component sets no global styles. */
  className?: string;
  style?: CSSProperties;
}

const frame: CSSProperties = {
  border: "1px dashed currentColor",
  borderRadius: 8,
  padding: "1rem",
  font: "0.9rem system-ui, sans-serif",
  opacity: 0.8,
};

/** A framed placeholder panel — the smallest thing that is a mountable `@astro-mine/view` widget. */
export function Placeholder({
  label = "astro-mine-view",
  children,
  className,
  style,
}: PlaceholderProps): JSX.Element {
  return (
    <div
      className={className}
      style={{ ...frame, ...style }}
      role="region"
      aria-label={label}
      data-testid="view-placeholder"
    >
      <strong>{label}</strong>
      {children}
    </div>
  );
}
