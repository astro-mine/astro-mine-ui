"use client";

// The application shell (ui#5; ui.md §5, §7 honesty rules 3 and 7).
//
// A persistent sidebar, a top bar, and the content region every page mounts into. This is the piece
// the rebuild turns on: **not a shell that composes plugin surfaces, but the layout of an ordinary
// multi-page application**, where adding a page is adding a route (ui.md §11).
//
// Four things live here and nowhere else, because each is a property of the *application* rather
// than of any page: the single active nav entry, focus and announcement on navigation, the keyboard
// contract, and what a reader is told when there is no backend to talk to.

import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import { DegradedState } from "@astro-mine/ui";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useRef, useState, type ReactNode } from "react";

import { RouteAnnouncer } from "./RouteAnnouncer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useNavigationShortcuts } from "./keyboard";
import { activeHref, titleFor } from "./navigation";
import { useRuntimeConfig } from "./runtimeConfig";

const DRAWER_WIDTH = 260;

/** The id the skip link targets and the content region carries. One constant, so they agree. */
export const CONTENT_ID = "content";

/**
 * What to tell a reader with no reachable API.
 *
 * Rendered **above** the page rather than instead of it, and with the navigation untouched. Three
 * reasons, and the third is the one that matters: some pages need no API at all (Help is
 * documentation, the section indexes are orientation), so replacing them would be a lie; a reader
 * who cannot see the rest of the application cannot judge whether the fix is worth making; and "it
 * stays in the navigation" is the literal wording of honesty rule 3.
 */
function ConfigurationNotice() {
  const { state } = useRuntimeConfig();
  if (state.status === "loading" || state.status === "configured") return null;

  return (
    <Box sx={{ mb: 3 }}>
      <DegradedState
        title={
          state.status === "unconfigured"
            ? "No API is configured"
            : "The API configuration cannot be used"
        }
        reason={
          <>
            {state.reason} Nothing on any page can load until this is fixed — the application is a
            static bundle, and the API endpoint is a property of the deployment rather than of the
            build.
          </>
        }
        remediation={state.remedy}
      />
    </Box>
  );
}

export interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);

  const active = activeHref(pathname);
  const title = titleFor(pathname);

  const navigate = useCallback((href: string) => router.push(href), [router]);
  useNavigationShortcuts({ navigate, searchRef });

  const closeNavigation = useCallback(() => setNavigationOpen(false), []);

  const sidebar = <Sidebar activeHref={active} onNavigate={closeNavigation} />;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TopBar
        pathname={pathname}
        contentId={CONTENT_ID}
        onOpenNavigation={() => setNavigationOpen(true)}
        searchRef={searchRef}
      />

      {/* One `nav` landmark holding both drawers, rather than one inside each. Only ever one of
          them is on screen — the other is `display: none` — and two landmarks called "Sections"
          would be two entries in a screen reader's landmark list, one of which goes nowhere. */}
      <Box
        component="nav"
        aria-label="Sections"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Below the breakpoint: a temporary drawer over the content. Deliberately **not**
            `keepMounted` — a closed modal drawer is inert and `aria-hidden`, so keeping it mounted
            buys a little open-animation smoothness at the cost of a second copy of every nav link
            in the DOM. One copy is easier to reason about and easier to assert on. */}
        <Drawer
          variant="temporary"
          open={navigationOpen}
          onClose={closeNavigation}
          // The drawer is a dialog, and a dialog must say what it is. Not "Sections", which is the
          // enclosing landmark's name — a reader hearing the same name twice for two different
          // things learns nothing from either.
          slotProps={{ paper: { "aria-label": "Site navigation" } }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          <Toolbar />
          {sidebar}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          <Toolbar />
          {sidebar}
        </Drawer>
      </Box>

      <Box
        component="main"
        id={CONTENT_ID}
        ref={contentRef}
        // Focusable but not tabbable: the shell moves focus here on every navigation, and a reader
        // pressing Tab should still go from the skip link into the page's own controls.
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3 },
          pb: 6,
          "&:focus": { outline: "none" },
        }}
      >
        {/* The bar is `position: fixed`, so the content needs its height back. */}
        <Toolbar />
        <ConfigurationNotice />
        {/* `useSearchParams` opts its subtree out of prerendering, and under `output: 'export'` the
            build fails outright without a boundary above it. One here means every page that keys
            itself on the query string — which, per ui.md §5.1, is most of them — needs no ceremony
            of its own. */}
        <Suspense fallback={null}>{children}</Suspense>
        <RouteAnnouncer pathname={pathname} title={title} contentRef={contentRef} />
      </Box>
    </Box>
  );
}
