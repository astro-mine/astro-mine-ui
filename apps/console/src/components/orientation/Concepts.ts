// The concepts a reader needs before any other page makes sense (ui#34).
//
// **Each one short, each one linking out.** ui#34's criterion is that no concept is restated here
// in a form that can drift from the user guide — so what is written below is the *one sentence that
// makes the rest of this application legible*, and the guide carries the treatment. A page that
// forked the guide would be a second copy of an explanation, and the second copy is the one that
// goes stale.
//
// The five were not chosen for completeness. They are the five that, unexplained, make a specific
// page here misread: the waist explains why so much is CLI-only, content addressing explains why
// every page leads with a digest, scenarios and seeds explain what a leaderboard is a leaderboard
// *of*, and the last two explain why half the honesty banners in this application exist.

const GUIDE = "https://github.com/astro-mine/docs/blob/main/guide";

export interface Concept {
  readonly title: string;
  /** One sentence. Not a summary of the guide — the thing that stops a page being misread. */
  readonly short: string;
  /** Where this page here depends on understanding it. */
  readonly whereItBites: string;
  readonly href: string;
}

export const CONCEPTS: readonly Concept[] = [
  {
    title: "The narrow waist",
    short:
      "A thin, stable core — schemas, environment and policy interfaces, a plugin registry — with everything else a swappable plugin behind it.",
    whereItBites:
      "It is why so much of this platform has no page: a plugin is authored as files and loaded by Core, and there is nothing for a browser to POST.",
    href: `${GUIDE}/concepts/narrow-waist.md`,
  },
  {
    title: "Content addressing, and why a digest is the identity",
    short:
      "Every artifact is addressed by the hash of its bytes. A name and version is a *query* that resolves to one today and may resolve to another tomorrow.",
    whereItBites:
      "Every page here leads with the digest rather than the reference, and says so. It is what makes a result reproducible a year from now.",
    href: `${GUIDE}/concepts/content-addressing.md`,
  },
  {
    title: "Scenarios and seeds",
    short:
      "A scenario is the task, pinned to exact content by hash. Seeds are the episodes it is scored over — and a leaderboard's seeds are held out, so a submitter cannot tune to them.",
    whereItBites:
      "It is what makes a leaderboard number mean something without trusting whoever submitted it, and why a scorecard says how many seeds a value was aggregated over.",
    href: `${GUIDE}/concepts/scenarios.md`,
  },
  {
    title: "Fixture scoring versus a simulated run",
    short:
      "The reference fixture is a deterministic runner that never executes the simulator. Its numbers are stable, reproducible, and measure nothing physical.",
    whereItBites:
      "A fixture-scored leaderboard row is badged in the row itself. Presenting one with the same authority as a simulated run is the single thing this application most has to avoid.",
    href: `${GUIDE}/concepts/determinism-and-provenance.md`,
  },
  {
    title: "What a stand-in is",
    short:
      "Anywhere the platform can produce a plausible answer without doing the work — a fixture runner, a stand-in evaluator, a seeded example — it is called a stand-in and labelled where the number is.",
    whereItBites:
      "Every banner in this application that says 'no physics was run' is this. The picture is identical either way, which is exactly why it has to be words.",
    href: `${GUIDE}/concepts/uncertainty.md`,
  },
];

export const GUIDE_BASE = GUIDE;
