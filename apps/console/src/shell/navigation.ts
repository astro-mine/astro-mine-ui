// The navigation table (ui#5; ui.md §5).
//
// **One table, five consumers.** The sidebar, the breadcrumbs, the live-region announcement, the
// keyboard chords and the tests all read from this file. The retired shell derived each of those
// from a different place — the surface registry, the route table, the router's own match — and they
// drifted: a route could be reachable and unannounced, or announced under a title no nav entry
// used. A single table makes "every route has a title, an entry and a breadcrumb" true by
// construction rather than something somebody has to check.
//
// **Every group leads with its own section index**, which is what makes the longest-match rule in
// `activeHref` load-bearing rather than decorative: `/registry` and `/registry/artifact` are both
// entries, and a plain prefix test lights up both.
//
// **This file names no component and calls no API.** It is data, so a test can assert over it
// (`tests/navigation.test.ts`) and the route inventory can be checked against the filesystem
// without rendering anything.

/** A destination: one route, one sidebar entry, one breadcrumb leaf. */
export interface NavEntry {
  /**
   * The route, with no trailing slash. `next.config.ts` sets `trailingSlash`, so the browser's
   * pathname carries one and this does not — every comparison goes through
   * {@link normalizePathname}.
   */
  readonly href: string;
  /**
   * The sidebar label, the breadcrumb leaf, and what the live region announces.
   *
   * One string for all three, so they cannot disagree — the retired shell had a route title, a nav
   * label and an announced title as three separate fields, and pages existed where all three
   * differed.
   */
  readonly label: string;
  /** What the page is for. Rendered by the section index pages, and as the entry's description. */
  readonly summary: string;
  /**
   * The keyboard chord that jumps here, as pressed: `["g", "l"]`.
   *
   * Only high-traffic destinations carry one. A chord per entry would be eighteen chords to learn
   * and eighteen chances to shadow something the browser wanted, for entries a reader visits once.
   */
  readonly chord?: readonly [string, string];
}

/**
 * A sidebar group.
 *
 * The group label is a heading, never a link — a group's own page is its **first entry**, which is
 * why every group here has a section index at the top.
 */
export interface NavGroup {
  readonly label: string;
  readonly entries: readonly NavEntry[];
}

/**
 * The information architecture, as `ui.md` §5 states it.
 *
 * The summaries are the doc's own descriptors wherever it has one, because a second wording is a
 * second thing to keep in step. Where a section was refined after §5 was written — Compute's
 * backends became a page of its own in `ui#19` — the table follows the issue that builds it.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Home",
    entries: [
      {
        href: "/",
        label: "Home",
        summary: "What this is, who you are, and what is configured.",
        chord: ["g", "h"],
      },
    ],
  },
  {
    label: "Registry",
    entries: [
      {
        href: "/registry",
        label: "Browse",
        summary: "Search the commons for artifacts — worlds, assets, policies, campaigns.",
        chord: ["g", "r"],
      },
      {
        href: "/registry/artifact",
        label: "Artifact",
        summary: "One artifact: its identity, facets, attestations and inspector.",
      },
      {
        href: "/registry/resolve",
        label: "Resolve",
        summary: "Turn a name and a version spec into the one digest that satisfies it.",
      },
      {
        href: "/registry/publish",
        label: "Publish",
        summary: "Index an already-stored, signed artifact, and read the admission verdict.",
      },
    ],
  },
  {
    label: "Benchmark",
    entries: [
      {
        href: "/bench",
        label: "Scenarios",
        summary: "What the benchmark measures, on which scenarios, and how a run is scored.",
      },
      {
        href: "/bench/leaderboard",
        label: "Leaderboard",
        summary: "Rankings for a scenario, with the primary metric and its uncertainty.",
        chord: ["g", "l"],
      },
      {
        href: "/bench/submission",
        label: "Submission",
        summary: "One entry's scorecard: every metric, its provenance, and the episode replay.",
      },
      {
        href: "/bench/submit",
        label: "Submit",
        summary: "Enter a policy for evaluation, directly or from a registry digest.",
      },
      {
        // "Evaluation jobs", not "Jobs", because Compute has jobs too. Two links with the same
        // accessible name and different destinations are ambiguous to anyone reading a list of
        // links out of context, which is how a screen reader offers them.
        href: "/bench/jobs",
        label: "Evaluation jobs",
        summary: "Evaluation status for a submission.",
      },
      {
        href: "/bench/audit",
        label: "Audit",
        summary:
          "The steward's trail: what was admitted, flagged or retracted, and on whose authority.",
      },
    ],
  },
  {
    label: "Design",
    entries: [
      {
        href: "/design",
        label: "Studies",
        summary: "The design studies this session has launched or opened.",
        chord: ["g", "d"],
      },
      {
        href: "/design/new",
        label: "New study",
        summary: "State an objective and compose the candidate swarms to compare.",
      },
      {
        href: "/design/study",
        label: "Study",
        summary: "Compare the front, inspect a candidate in 3D, and publish the one you choose.",
      },
      {
        href: "/design/campaign",
        label: "Campaign",
        summary: "A published campaign: its objective, phases, lineage and digest.",
      },
    ],
  },
  {
    label: "Compute",
    entries: [
      {
        href: "/compute",
        label: "Overview",
        summary: "What this deployment can run, and how work is submitted to it.",
        chord: ["g", "c"],
      },
      {
        href: "/compute/jobs",
        label: "Jobs",
        summary: "Submit a job, and preview what a sweep or workflow compiles to before it runs.",
      },
      {
        href: "/compute/backends",
        label: "Backends",
        summary: "The execution backends this deployment offers, and what each is for.",
      },
    ],
  },
  {
    label: "Help",
    entries: [
      {
        href: "/help",
        label: "Help",
        summary: "Concepts, the personas, and where the CLI is the answer.",
        chord: ["g", "?"],
      },
    ],
  },
];

/** Every entry, flattened, in sidebar order. */
export const NAV_ENTRIES: readonly NavEntry[] = NAV_GROUPS.flatMap((group) => group.entries);

/**
 * The pathname in the form this table is written in — no trailing slash, except for the root.
 *
 * `trailingSlash: true` means a browser reports `/registry/artifact/` while the table says
 * `/registry/artifact`, and a router stub in a test reports whichever the test author typed. Every
 * comparison below goes through here so none of them has to care.
 */
export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * The single active nav href for a location: **the longest entry href the pathname matches**, exact
 * or as a path prefix. `undefined` when nothing matches.
 *
 * Longest-match-wins is the point, and the retired shell shipped the bug it prevents: a plain
 * `startsWith` marks `/registry` active alongside `/registry/artifact`, so a reader sees two
 * highlighted entries and cannot tell which page they are on.
 *
 * Two details that look like fussiness and are not. The `+ "/"` stops `/bench` matching
 * `/benchmark`, which is a different section. And **`/` is matched only exactly** — as a prefix it
 * would match every path in the application, so an unknown route would light Home up rather than
 * lighting nothing.
 */
export function activeHref(pathname: string): string | undefined {
  const path = normalizePathname(pathname);
  return NAV_ENTRIES.map((entry) => entry.href)
    .filter((href) => path === href || (href !== "/" && path.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];
}

/** The entry for an exact route, if the route is one. */
export function entryFor(pathname: string): NavEntry | undefined {
  const path = normalizePathname(pathname);
  return NAV_ENTRIES.find((entry) => entry.href === path);
}

/**
 * The entry for a route, or a thrown error.
 *
 * Every route file calls this to get its own title and summary, so a page whose path is not in the
 * table fails **at build time** rather than shipping with a heading nobody wrote and a nav entry
 * that never highlights. That is the whole reason the pages read from the table instead of
 * restating their own titles.
 */
export function requireEntry(href: string): NavEntry {
  const entry = entryFor(href);
  if (entry === undefined) {
    throw new Error(
      `No navigation entry for "${href}". A route must be in NAV_GROUPS: the sidebar, the ` +
        `breadcrumbs and the live-region announcement all read from it, and a route that is not ` +
        `there is a page a reader can reach and cannot navigate back out of.`,
    );
  }
  return entry;
}

/** The group an exact route belongs to. */
export function groupFor(pathname: string): NavGroup | undefined {
  const path = normalizePathname(pathname);
  return NAV_GROUPS.find((group) => group.entries.some((entry) => entry.href === path));
}

/** The entries beneath a section index — its children, for the section pages to list. */
export function childrenOf(href: string): readonly NavEntry[] {
  return NAV_ENTRIES.filter((entry) => entry.href !== href && entry.href.startsWith(href + "/"));
}

/**
 * The page's title: the active entry's label, or the application's name.
 *
 * The fallback is for `not-found` and the error boundary — routes a reader can genuinely arrive at,
 * and which therefore need something to announce. Announcing nothing would leave a screen-reader
 * user with no signal that anything moved at all.
 */
export function titleFor(pathname: string): string {
  const active = activeHref(pathname);
  return (active === undefined ? undefined : entryFor(active)?.label) ?? "Astro-Mine";
}

/** One step of a breadcrumb trail. Every step is a real route. */
export interface Crumb {
  readonly label: string;
  readonly href: string;
}

/**
 * The breadcrumb trail for a route, derived from the table rather than from the path.
 *
 * Deriving from the path means title-casing segments, which is the same answer right up until a
 * label differs from its slug — `/bench` is "Scenarios", `/design/new` is "New study". Reading the
 * table means every label is written once.
 *
 * **The middle step names the section and links to its index.** So `/bench/leaderboard` reads
 * *Home / Benchmark / Leaderboard* and the middle step goes to `/bench`. The section step uses the
 * **group's** name rather than the index page's own nav label, because a breadcrumb answers "where
 * am I" and the answer is Benchmark; the sidebar answers "which page" and the answer there is
 * Scenarios. Every href in the trail is a route that exists — the trail never links into nothing.
 */
export function crumbsFor(pathname: string): readonly Crumb[] {
  const home: Crumb = { label: "Home", href: "/" };
  const active = activeHref(pathname);
  if (active === undefined || active === "/") return [home];

  const crumbs: Crumb[] = [home];
  const group = NAV_GROUPS.find((g) => g.entries.some((e) => e.href === active));
  const index = group?.entries[0];
  if (group !== undefined && index !== undefined) {
    crumbs.push({ label: group.label, href: index.href });
  }

  const entry = NAV_ENTRIES.find((e) => e.href === active);
  // Skipped when the active route *is* the section index — "Benchmark / Scenarios" would read as
  // two levels where there is one.
  if (entry !== undefined && entry.href !== index?.href) {
    crumbs.push({ label: entry.label, href: entry.href });
  }

  return crumbs;
}

/** The chords, as `"g l"` → href. */
export const CHORDS: ReadonlyMap<string, string> = new Map(
  NAV_ENTRIES.flatMap((entry) =>
    entry.chord === undefined ? [] : [[entry.chord.join(" "), entry.href] as const],
  ),
);
