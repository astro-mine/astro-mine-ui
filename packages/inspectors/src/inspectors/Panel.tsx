// The shape every inspector panel shares (ui#7).
//
// Internal, and staying internal: it is a layout convention, not a capability, and exporting it
// would invite pages to render "an inspector panel" without an inspector — which is a panel with no
// resolution behind it and no way for the registry to know it exists.
//
// The heading is an `<h2>`. The page owns the `<h1>` (ui.md §5), and a panel that reached for one
// would give every artifact page two top-level headings — valid HTML, and a screen reader's outline
// with no root.

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Fragment, useId, type ReactNode } from "react";

export interface PanelProps {
  /** What a reader is looking at — the contribution's `title`. */
  readonly title: string;
  /** One line under the heading: what this panel is showing and, where it matters, what it is not. */
  readonly summary?: ReactNode;
  readonly children?: ReactNode;
}

export function Panel({ title, summary, children }: PanelProps) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      {summary === undefined ? null : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
          {summary}
        </Typography>
      )}
      {/* One place owns the vertical rhythm between a panel's blocks, so no panel has to remember
          a margin and none of them can disagree about it. */}
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

export interface ChipRowProps {
  readonly component?: "span" | "div";
  readonly children?: ReactNode;
}

/**
 * A wrapping row of chips.
 *
 * A `Box` with `sx`, not a `Stack` with `direction`/`flexWrap`: MUI 9 dropped the system props from
 * component surfaces, so `flexWrap` on a `Stack` is a type error rather than a layout that quietly
 * does nothing. `component="span"` is what makes this legal inside a `<dd>`'s `<p>`.
 */
export function ChipRow({ component = "span", children }: ChipRowProps) {
  return (
    <Box component={component} sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {children}
    </Box>
  );
}

/** One row of a fact list: a label and whatever renders its value. */
export interface Fact {
  readonly label: string;
  readonly value: ReactNode;
}

export interface FactListProps {
  readonly label: string;
  readonly facts: readonly Fact[];
}

/**
 * A labelled `<dl>` of plain facts.
 *
 * The named group is a wrapper rather than a role on the `<dl>`, and the `<dt>`/`<dd>` pairs are
 * direct children held together by a keyed `Fragment` — both for the reason
 * `@astro-mine/ui`'s `ProvenanceList` records: a role on the list overrides its native semantics and
 * a wrapping element breaks the containment, and axe reports each of those, correctly.
 */
export function FactList({ label, facts }: FactListProps) {
  return (
    <Box role="group" aria-label={label}>
      <Box
        component="dl"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(9rem, max-content) minmax(0, 1fr)" },
          columnGap: 2,
          rowGap: 1,
          m: 0,
        }}
      >
        {facts.map((fact) => (
          <Fragment key={fact.label}>
            <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
              {fact.label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0 }}>
              {fact.value}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
