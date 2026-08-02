"use client";

// A route that exists, with the page that fills it still to come (ui#5).
//
// The shell ships every route in the information architecture, because "every route is reachable and
// operable by keyboard alone" cannot be true of links that 404, and because a nav entry pointing at
// nothing is exactly the "missing feature" impression honesty rule 3 exists to prevent. What the
// shell does **not** ship is any page's content — that is Wave 29, one issue per area.
//
// So this is what stands in between. It says three things, deliberately: what the page will be, that
// it is not built yet, and **which issue builds it** — a reader who wants the feature can go and read
// what it is going to do rather than guessing whether it was forgotten.
//
// It uses `StandInBanner` rather than inventing a "coming soon" style, because that is precisely the
// component's job: *a stand-in must never look like the real thing*. An unbuilt page that renders a
// convincing empty table is a page a reader will file a bug against.
//
// **The identity params are read for real**, and the way they are read is the pattern the real pages
// should copy — see `IdentityReport` below.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { EmptyState, StandInBanner } from "@astro-mine/ui";
import { Suspense } from "react";

import { useIdentity } from "@/shell/searchParams";

const REPOSITORY = "https://github.com/astro-mine/astro-mine-ui";

export interface PagePlaceholderProps {
  /** The page's title — the same label the sidebar and the announcer use. */
  readonly title: string;
  /** What the page will do, from the navigation table. */
  readonly summary: string;
  /** The issue that builds it, e.g. `12`. */
  readonly issue: number;
  /**
   * The search params this page will be keyed on (ui.md §5.1).
   *
   * Empty for a page that has no subject. Given, the placeholder reports whether a subject is
   * present — which is the page's real empty state, arriving early.
   */
  readonly identity?: readonly string[];
}

const NO_IDENTITY: readonly string[] = [];

/**
 * The part that reads the query string, in a component of its own.
 *
 * **This split is the point, not a tidying.** `useSearchParams` opts its entire subtree out of
 * prerendering, so a component that calls it contributes *nothing* to the exported HTML. Called at
 * the top of a page, it costs the whole page: the heading, the prose and the banner all vanish from
 * the static export and appear only once JavaScript has run. Called down here, it costs only the
 * three lines that genuinely depend on the address.
 *
 * The boundary is local for the same reason. The root layout has one as a backstop — a page that
 * forgets its own still builds — but a page that leans on the backstop prerenders as a blank, which
 * is a silent loss rather than an error. **The real pages should copy this shape.**
 */
function IdentityReport({ identity }: { identity: readonly string[] }) {
  const params = useIdentity(identity);
  const named = Object.entries(params).filter(([, value]) => value !== null);

  if (named.length === 0) {
    return (
      <EmptyState
        title={`No ${identity.join(" or ")} in the address`}
        hint={
          <>
            This page is keyed on the query string rather than on the path, because a static export
            cannot pre-render a route whose parameters are digests and names (<code>ui.md</code>{" "}
            §5.1). Without {identity.length === 1 ? "one" : "them"} there is no subject to show —
            which is a state, not an error.
          </>
        }
      />
    );
  }

  return (
    <>
      <Typography variant="subtitle2">Read from the address</Typography>
      {named.map(([key, value]) => (
        <Typography key={key} variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {key}
          </Box>
          {" = "}
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {value}
          </Box>
        </Typography>
      ))}
    </>
  );
}

export function PagePlaceholder({
  title,
  summary,
  issue,
  identity = NO_IDENTITY,
}: PagePlaceholderProps) {
  return (
    <Box sx={{ maxWidth: 880, py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {summary}
      </Typography>

      <StandInBanner title="This page has not been built yet">
        The route, its place in the navigation and its keyboard behaviour ship with the application
        shell. The page itself lands with{" "}
        {/* A plain anchor, not `component={NextLink}`: this leaves the application, and the router
            has nothing to offer an address it does not serve. */}
        <Link href={`${REPOSITORY}/issues/${issue}`} color="inherit">
          ui#{issue}
        </Link>
        . Nothing here calls the API, and no number on this page came from anywhere.
      </StandInBanner>

      {identity.length === 0 ? null : (
        <Box sx={{ mt: 4 }}>
          <Suspense fallback={null}>
            <IdentityReport identity={identity} />
          </Suspense>
        </Box>
      )}
    </Box>
  );
}
