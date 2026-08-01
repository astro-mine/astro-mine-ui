import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";

/**
 * What produced a number, said beside the number (ui#3; ui.md §7 rules 1 and 5).
 *
 * A leaderboard row scored by a deterministic fixture and one scored by an actual simulation render
 * identically — same columns, same precision, same authority. Presenting them the same way is the
 * laundering the platform must not do, and a footnote in a drawer does not undo it. So the provenance
 * travels **in the row**, and a stand-in is labelled unmissably.
 *
 * **`standIn` is a required decision, not an inference.** This package is a leaf: it knows nothing of
 * the platform's runner-id conventions, and it must not — a design system that pattern-matches
 * `"fixture"` in a string is one that silently stops labelling the day a runner is renamed. The
 * caller knows what it fetched and says so. Making the prop required means the question is answered
 * at every call site rather than defaulted to the flattering answer.
 */
export interface RunnerBadgeProps {
  /** The runner's identifier, shown as given — it is what a reader would search for. */
  readonly runner: string;
  /**
   * Did a stand-in produce this, rather than the real thing? Required: the honest answer must be
   * supplied, never assumed.
   */
  readonly standIn: boolean;
  /** What stood in, when the caller can be specific — appended to the tooltip. */
  readonly detail?: string;
}

export function RunnerBadge({ runner, standIn, detail }: RunnerBadgeProps) {
  const explanation = standIn
    ? `Scored by ${runner} — a deterministic stand-in, not a simulation run.`
    : `Scored by runner ${runner}.`;

  return (
    <Tooltip title={detail === undefined ? explanation : `${explanation} ${detail}`}>
      <Chip
        size="small"
        // Filled and coloured for a stand-in, quiet and outlined for the real thing. The asymmetry
        // is deliberate: the case that must not be missed is the one that gets the weight.
        variant={standIn ? "filled" : "outlined"}
        color={standIn ? "standIn" : "default"}
        label={standIn ? `${runner} · stand-in` : runner}
        // The visible label already carries "stand-in", but a Chip in a dense table is often read
        // out of context; the accessible name restates the whole claim so it survives being heard
        // on its own.
        aria-label={explanation}
        sx={{ fontWeight: standIn ? 600 : 400, maxWidth: "100%" }}
      />
    </Tooltip>
  );
}
