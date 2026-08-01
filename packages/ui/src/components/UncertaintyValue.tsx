import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

/**
 * A measured value shown with its uncertainty (ui#3; ui.md §2, honesty rule 2).
 *
 * **"A null bound renders as an open mark, never a zero-length error bar."** This is the rule the
 * whole design system exists to make cheap, and the one whose violation is hardest to see: `±0`
 * looks like a result. It reads as a measurement of extraordinary precision, when what actually
 * happened is that nobody measured a bound at all. Plotly's `null → 0` coercion is the concrete bug
 * this component exists to make impossible, and the previous chart library rendered the open mark
 * *by construction*. MUI X Charts does not, so from here it is enforced by this component and by
 * `tests/UncertaintyValue.test.tsx` (ui.md §7.1).
 *
 * **A measured zero is not a missing bound.** `bound={0}` is a real result — a quantity that did not
 * vary across seeds — and it renders `±0`. Only `null`/`undefined` renders the open mark. Collapsing
 * the two would destroy the distinction in the opposite direction, and it is asserted by test.
 *
 * **The value is never marked, only the bound.** The measurement is as good as any other; what is
 * missing is knowledge of its spread. Dimming the value would misreport which part is uncertain.
 *
 * Numbers are rendered as given. Rounding is the caller's decision — a design system that quietly
 * reformats a quantity is a design system that can quietly change what it says.
 */
export interface UncertaintyValueProps {
  /** The measured value. Rendered at full strength whether or not a bound is known. */
  readonly value: number;
  /**
   * The ± bound, typically a cross-seed spread. `null`/`undefined` means **no bound was measured**
   * and renders as an open mark; `0` means a bound of zero was measured and renders as `±0`.
   */
  readonly bound?: number | null;
  /**
   * The unit, e.g. `"kg"`. **Required, and `null` must be written out** for a genuinely
   * dimensionless quantity — a value with no unit is a bug upstream (conventions.md §5, ui.md §7),
   * and an optional prop would let that bug arrive here silently as a forgotten argument.
   */
  readonly unit: string | null;
}

/**
 * The open mark: an interval with outward arrowheads and no end caps.
 *
 * The shape is the message. A conventional error bar terminates in two serifs that say "it stops
 * here"; this one opens outward and says the opposite — the bound is unknown, and could be
 * anywhere. It is deliberately *not* a zero-length tick, which is what a naive `±0` would draw.
 */
function OpenMark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 28 10"
      width={28}
      height={10}
      aria-hidden="true"
      focusable="false"
      sx={{ overflow: "visible", color: "text.secondary", flexShrink: 0 }}
    >
      <line x1="4" y1="5" x2="24" y2="5" stroke="currentColor" strokeWidth="1.5" />
      <polyline
        points="7,1.5 2,5 7,8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="21,1.5 26,5 21,8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

export function UncertaintyValue({ value, bound, unit }: UncertaintyValueProps) {
  const unbounded = bound === null || bound === undefined;
  // A non-breaking space, written as an escape so it is visible in source rather than being an
  // invisible character someone later "tidies" into a plain one. A quantity must not wrap between
  // its number and its unit — "142.8" at the end of a line and "kg" at the start of the next is
  // a reading a table can produce and a reader can misread.
  const suffix = unit === null ? "" : `\u00A0${unit}`;

  return (
    <Box
      component="span"
      // The test hook the honesty assertion reads. It is a stable contract, not a styling artifact:
      // "open" and "measured" are the two things this component can say, and a page or a chart that
      // wants to assert the same property can read the same attribute.
      data-uncertainty-bound={unbounded ? "open" : "measured"}
      sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75, whiteSpace: "nowrap" }}
    >
      <Typography component="span" variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
        {suffix}
      </Typography>

      {unbounded ? (
        <Tooltip title="No uncertainty bound was measured for this value.">
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <OpenMark />
            <Typography
              component="span"
              variant="caption"
              sx={{ color: "text.secondary", fontStyle: "italic" }}
            >
              no bound
            </Typography>
          </Box>
        </Tooltip>
      ) : (
        <Typography
          component="span"
          variant="caption"
          sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
        >
          ±{bound}
          {suffix}
        </Typography>
      )}
    </Box>
  );
}
