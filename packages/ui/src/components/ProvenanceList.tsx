import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Fragment, type ReactNode } from "react";

import { Digest } from "./Digest.js";
import { EmptyState } from "./EmptyState.js";

/**
 * One line of lineage: what a number came from.
 *
 * A discriminated union rather than a `value` that might be a digest, because the two render
 * differently and a caller that has a content address should not have to remember to wrap it. If it
 * is an address, say so and it becomes a {@link Digest} — abbreviated, expandable, copyable.
 */
export type ProvenanceEntry = { readonly label: string } & (
  | { readonly value: ReactNode; readonly digest?: never }
  | { readonly digest: string; readonly value?: never }
);

/**
 * Where a number came from, above where the number is read (ui#3; ui.md §7 rule 5).
 *
 * **"Provenance before interpretation. What produced a number is read before the number is."** A
 * scorecard whose lineage lives behind a tab is a scorecard whose lineage is not read — the reader
 * has already formed a view by the time they get there. So this is a component rather than a layout
 * convention: putting it above the result is one line, and there is nothing to remember.
 *
 * **An absent lineage is stated, not omitted.** A submission scored on the in-line path genuinely
 * has no stored reproducibility bundle, and rendering nothing would let it pass for one that does.
 * That is the same laundering {@link RunnerBadge} exists to prevent, one level up.
 */
export interface ProvenanceListProps {
  /** The lineage, in the order it should be read — most identifying first. */
  readonly entries: readonly ProvenanceEntry[];
  /** An accessible name for the group, when a page shows more than one. */
  readonly label?: string;
  /** Shown when `entries` is empty — say what is missing and why, if the caller knows. */
  readonly emptyHint?: ReactNode;
}

export function ProvenanceList({ entries, label = "Provenance", emptyHint }: ProvenanceListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No provenance recorded"
        hint={emptyHint ?? "Nothing here records what produced this result."}
      />
    );
  }

  return (
    // The named group is a wrapper rather than a role on the `<dl>` itself. Putting `role="group"`
    // on the list would *override* its native semantics, and the `<dt>`/`<dd>` inside would no
    // longer be contained by anything that makes them a term and a definition — axe reports exactly
    // that, and it is right to. The list stays a list; the wrapper carries the name.
    <Box role="group" aria-label={label}>
      <Box
        component="dl"
        sx={{
          display: "grid",
          // The label column sizes to its content but never runs away with the row; `minmax(0, 1fr)`
          // on the value column is what stops a long digest from overflowing the grid instead of
          // wrapping inside it.
          gridTemplateColumns: { xs: "1fr", sm: "minmax(8rem, max-content) minmax(0, 1fr)" },
          columnGap: 2,
          rowGap: 1,
          m: 0,
        }}
      >
        {/* `dt` and `dd` are direct children of the `dl`, with a keyed Fragment holding the pair
            together. A wrapping element would be valid HTML but would break the grid — and axe
            treats a `div` between the list and its items as breaking the containment too. */}
        {entries.map((entry) => (
          <Fragment key={entry.label}>
            <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
              {entry.label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0 }}>
              {entry.digest === undefined ? entry.value : <Digest value={entry.digest} />}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
