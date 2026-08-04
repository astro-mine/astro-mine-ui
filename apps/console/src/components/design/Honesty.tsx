"use client";

// The three statements that go above the plots (ui#16; studio.md §2 principle 7; ui.md §7).
//
// **All three exist because the picture is identical either way.** That is the whole argument, and
// it is worth stating once rather than three times:
//
//   1. **The evaluator's provenance.** A stand-in evaluator ran no physics. The scatter it produces
//      is pixel-identical to one a simulator produced — same axes, same dots, same error bars — so
//      nothing in the image can carry the difference. It has to be words, and they have to be
//      first.
//   2. **A degenerate front.** When no candidate dominates any other, the Pareto front is
//      *everything*. Drawn, that reads as "all of these designs are optimal", which is a finding.
//      It is not one: it is a property of the scoring — usually too few metrics, or metrics that
//      do not trade off against each other — and the page says so rather than letting the picture
//      imply the flattering reading.
//   3. **Metrics with no measured bound.** An open mark says "no bound here" at one point; a
//      reader comparing candidates needs to know *which whole metrics* are unbounded before they
//      weigh anything by them, because a metric with no spread anywhere is not a tie-breaker.
//
// Above the plots, in document order, because a reader who forms a view from the picture has
// already formed it by the time a caption arrives.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StandInBanner } from "@astro-mine/ui";

import type { ComparisonView } from "./types";

/**
 * Did a stand-in produce these numbers?
 *
 * Same namespace convention as Bench's runner ids: a `fixture/…` evaluator is the deterministic
 * reference, matched on the namespace so a version bump does not silently unlabel it.
 */
export function isStandInEvaluator(evaluator: string): boolean {
  const namespace = evaluator.split("/")[0];
  return namespace === "fixture" || namespace === "stub" || namespace === "surrogate";
}

/** Metrics for which no candidate carries a measured uncertainty. */
export function unboundedMetrics(view: ComparisonView): string[] {
  return view.metrics.filter((metric) =>
    view.candidates.every((candidate) => {
      const estimate = candidate.metrics[metric];
      return estimate === undefined || estimate.uncertainty === null;
    }),
  );
}

/** Is every candidate on the front? */
export function isDegenerateFront(view: ComparisonView): boolean {
  return view.candidates.length > 1 && view.pareto_front.length === view.candidates.length;
}

export function HonestyStatements({ view }: { view: ComparisonView }) {
  const standIn = isStandInEvaluator(view.evaluator);
  const unbounded = unboundedMetrics(view);
  const degenerate = isDegenerateFront(view);

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {/* 1. Provenance, first, always — present whichever way it reads. */}
      {standIn ? (
        <StandInBanner title="A stand-in produced these numbers — no physics was run">
          The evaluator was <Box component="code">{view.evaluator}</Box>, a deterministic stand-in.
          The plots below are <strong>pixel-identical</strong> to ones a simulator would produce, so
          nothing in the picture can tell you this. Read the shape of the trade-off if it is useful;
          do not read the values as measurements.
        </StandInBanner>
      ) : (
        <Alert severity="info" role="status">
          <AlertTitle>Evaluated by {view.evaluator}</AlertTitle>
          <Typography variant="body2">
            Scored on the <Box component="code">{view.backend}</Box> backend. What produced a number
            is what makes it readable.
          </Typography>
        </Alert>
      )}

      {/* 2. A front that is everything. */}
      {degenerate ? (
        <Alert severity="warning" role="status">
          <AlertTitle>Every candidate is on the front</AlertTitle>
          <Typography variant="body2">
            No candidate dominates any other, so the Pareto front is all {view.candidates.length} of
            them.{" "}
            <strong>That is a property of the scoring, not a finding about the designs</strong> —
            usually too few metrics, or metrics that do not trade off against one another. Adding a
            metric they genuinely differ on is what makes this comparison say something.
          </Typography>
        </Alert>
      ) : null}

      {/* 3. Which metrics carry no measured bound — named, not merely marked. */}
      {unbounded.length > 0 ? (
        <Alert severity="warning" role="status">
          <AlertTitle>
            {unbounded.length === 1
              ? "One metric carries no measured bound"
              : `${unbounded.length} metrics carry no measured bound`}
          </AlertTitle>
          <Typography variant="body2">
            No candidate has a measured cross-seed spread for{" "}
            <Box component="code">{unbounded.join(", ")}</Box>. Marks on those axes are drawn open
            rather than with a zero-length bar, and{" "}
            <strong>a metric with no spread anywhere is not a tie-breaker</strong> — a difference
            you cannot bound is a difference you cannot claim.
          </Typography>
        </Alert>
      ) : null}
    </Stack>
  );
}
