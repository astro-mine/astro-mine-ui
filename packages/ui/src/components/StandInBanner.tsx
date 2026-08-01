import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/**
 * What you are reading was not produced the way it looks (ui#3; ui.md §2, honesty rule 1).
 *
 * **"A stand-in must never look like the real thing."** This is the most load-bearing component in
 * the design system. A fixture-scored leaderboard row, a stand-in evaluator's Pareto front and a
 * surrogate's prediction are all numbers that render exactly like measured ones — the laundering is
 * silent and total unless something says otherwise, in place.
 *
 * So: **above the content it qualifies, never below it, and never a footnote.** A reader who scrolls
 * past the banner has still seen it; a reader who stops before the footnote has not. The `title` is
 * the claim in a few words, because that is the part that gets read.
 *
 * It carries its own severity rather than reusing `warning`, which means "something might go wrong".
 * Nothing is going wrong here. Something is standing in.
 */
export interface StandInBannerProps {
  /** What the stand-in is, in a few words — e.g. "Scored by a fixture, not by the simulator". */
  readonly title: string;
  /** What was stood in for, and what follows from that — the consequence a reader must know. */
  readonly children?: ReactNode;
}

export function StandInBanner({ title, children }: StandInBannerProps) {
  return (
    <Alert
      severity="standIn"
      // `note`, not `status`: this is a persistent qualification of the content, not an event that
      // just occurred. It is part of what the page says, and it is read in place.
      role="note"
      // Filled rather than the theme's outlined default — the one component in the kit that is
      // allowed to be loud, because the failure mode it prevents is being overlooked.
      variant="filled"
      sx={{ fontWeight: 500 }}
    >
      <AlertTitle>{title}</AlertTitle>
      {children === undefined ? null : (
        <Typography variant="body2" component="div">
          {children}
        </Typography>
      )}
    </Alert>
  );
}
