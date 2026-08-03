// One metric's value, rendered as what it actually is (ui#12; ui.md §7 honesty rule 2).
//
// **Three cases, three renderings, and collapsing any two of them is a lie about precision.**
//
//   value with a dispersion    → the number and its cross-seed bound: `0.83 ±0.04 m³`.
//   value with a null bound    → the number and an OPEN mark. A null dispersion means fewer than
//                               two applicable seeds, so no spread was measurable. Rendering it as
//                               `±0` asserts a precision nobody measured — which is the failure
//                               `UncertaintyValue`'s open mark exists to prevent, and the reason
//                               ui.md §7.1 makes it a unit test rather than a convention.
//   no value at all            → an explicit dash. `null` means the metric did not apply to this
//                               entry; a fabricated `0` would place it at one end of every sort
//                               and read as a measurement.
//
// All three go through `UncertaintyValue`, which is the design system's one renderer for a measured
// quantity; what this component adds is the third case, which is not a quantity at all.

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { UncertaintyValue } from "@astro-mine/ui";

import { aggregationPhrase, directionPhrase } from "./format";
import type { MetricScore } from "./types";

export interface MetricCellProps {
  /** The score, or `undefined` when this row carries no score for the metric at all. */
  readonly score: MetricScore | undefined;
}

/** No value: not zero, not blank, and marked so a test and a screen reader can both find it. */
function NoValue({ reason }: { reason: string }) {
  return (
    <Tooltip title={reason}>
      <Box
        component="span"
        data-metric-value="absent"
        aria-label={reason}
        sx={{ color: "text.secondary" }}
      >
        —
      </Box>
    </Tooltip>
  );
}

export function MetricCell({ score }: MetricCellProps) {
  if (score === undefined) {
    return <NoValue reason="This entry was not scored on this metric." />;
  }
  if (score.value === null) {
    return (
      <NoValue
        reason={`This metric did not apply to this entry — ${aggregationPhrase(score)} produced no value.`}
      />
    );
  }

  return (
    <Tooltip
      title={`${aggregationPhrase(score)}; ${directionPhrase(score.direction)}${
        score.dispersion === null ? "; no cross-seed bound was measurable" : ""
      }`}
    >
      <Box component="span" sx={{ display: "inline-flex" }}>
        <UncertaintyValue
          value={score.value}
          // Passed straight through. `UncertaintyValue` renders `null` as the open mark, which is
          // the whole contract; "helpfully" defaulting it to 0 here would defeat it.
          bound={score.dispersion}
          unit={score.unit === "" ? null : score.unit}
        />
      </Box>
    </Tooltip>
  );
}

/** The column header: the metric's name, with the direction that makes its values readable. */
export function MetricHeading({ metric, score }: { metric: string; score?: MetricScore }) {
  return (
    <>
      <Typography variant="inherit" component="span">
        {metric}
      </Typography>
      {score === undefined ? null : (
        <Typography variant="caption" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
          ({directionPhrase(score.direction)})
        </Typography>
      )}
    </>
  );
}
