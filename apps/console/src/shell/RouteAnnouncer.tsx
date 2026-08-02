"use client";

// What happens when a route changes (ui#5; ui.md §7 honesty rule 7).
//
// A client-side navigation replaces the page's contents and moves nothing else. For a reader using
// a keyboard, focus stays wherever it was — usually the nav entry they just activated, halfway down
// a list of eighteen — and for a reader using a screen reader, **nothing is said at all**: no page
// load happened, so the browser announces nothing. Both are silent failures that look perfect in a
// screenshot, which is why the acceptance criterion for this file is "verified in a test, not by
// inspection".
//
// So, on every navigation: move focus to the content region, and announce the new title in a polite
// live region.
//
// **Not on first load.** The initial render is a real page load — the browser has already announced
// it, and focus belongs at the top of the document where the skip link is the first thing a `Tab`
// reaches. Focusing the content on mount would jump *past* the skip link and defeat it.

import Box from "@mui/material/Box";
import { useEffect, useRef, type RefObject } from "react";

export interface RouteAnnouncerProps {
  readonly pathname: string;
  readonly title: string;
  /** The content region — `<main tabIndex={-1}>`. */
  readonly contentRef: RefObject<HTMLElement | null>;
}

export function RouteAnnouncer({ pathname, title, contentRef }: RouteAnnouncerProps) {
  const liveRef = useRef<HTMLDivElement>(null);
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    contentRef.current?.focus();

    // Written to the DOM rather than held in React state, for two reasons. It keeps a navigation
    // from costing a second render of the whole shell to change one string nothing else reads; and
    // it keeps this out of the "set state in an effect" pattern that cascades renders. A live region
    // is announced on mutation whoever mutated it — React is not the audience, the reader is.
    const live = liveRef.current;
    if (live !== null) live.textContent = title;
  }, [pathname, title, contentRef]);

  return (
    <Box
      ref={liveRef}
      aria-live="polite"
      // `atomic`, so the region is read as one string rather than as the diff — a partial
      // announcement of a changed title is worse than the whole one.
      aria-atomic="true"
      // Visually hidden, not `display: none`: a hidden element is not announced at all.
      sx={{
        position: "absolute",
        width: 1,
        height: 1,
        p: 0,
        m: -1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    />
  );
}
