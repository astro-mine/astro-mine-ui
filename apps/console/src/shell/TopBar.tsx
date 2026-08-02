"use client";

// The top bar: where you are, how to search, and which mode you are reading in (ui#5; ui.md §5).

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ColorModeToggle } from "@astro-mine/ui";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type RefObject } from "react";

import { MenuGlyph, SearchGlyph } from "./icons";
import { crumbsFor } from "./navigation";
import { hrefWithIdentity } from "./searchParams";

export interface TopBarProps {
  readonly pathname: string;
  /** The content region's id — what the skip link jumps to. */
  readonly contentId: string;
  /** Opens the navigation drawer. Only rendered below the breakpoint. */
  readonly onOpenNavigation: () => void;
  /** The search field, so `/` can focus it from anywhere. */
  readonly searchRef: RefObject<HTMLInputElement | null>;
}

export function TopBar({ pathname, contentId, onOpenNavigation, searchRef }: TopBarProps) {
  const router = useRouter();
  const crumbs = crumbsFor(pathname);
  const [query, setQuery] = useState("");

  // **The entry point, not the results.** Search over the catalog is the Registry browse page's
  // (ui#10), and routing there with the query in the URL is what keeps this box from becoming a
  // second search implementation that has to be kept in step with the real one.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (q === "") return;
    router.push(hrefWithIdentity("/registry", { q }));
  };

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      // Above the permanent drawer, so the bar spans the full width and the drawer sits under it.
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {/* First in the document, so it is the first thing `Tab` reaches — and inside the bar's own
          `header` landmark, because a link floating outside every landmark is content a landmark
          navigation cannot reach. Visually hidden until focused, not `display: none`, which would
          take it out of the tab order and leave it as decoration. */}
      <Link
        href={`#${contentId}`}
        sx={{
          position: "absolute",
          left: 8,
          top: -64,
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: "background.paper",
          color: "text.primary",
          border: 1,
          borderColor: "divider",
          "&:focus": { top: 8 },
        }}
      >
        Skip to content
      </Link>

      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          edge="start"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          // The permanent drawer is always on screen from `md` up, so above the breakpoint this
          // button would open something that never closed and was never shut.
          sx={{ display: { md: "none" } }}
        >
          <MenuGlyph />
        </IconButton>

        <Typography
          component={NextLink}
          href="/"
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "inherit",
            textDecoration: "none",
            whiteSpace: "nowrap",
            display: { xs: "none", sm: "block" },
          }}
        >
          Astro-Mine
        </Typography>

        <Breadcrumbs
          // MUI's own default is the lowercase spelling; naming it here keeps the landmark's name
          // stable if that default ever moves.
          aria-label="Breadcrumb"
          sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}
        >
          {crumbs.map((crumb, index) =>
            index === crumbs.length - 1 ? (
              // The last crumb is where the reader already is. Rendering it as a link would offer a
              // navigation that does nothing, so it is text — and `aria-current` is what says so.
              <Typography key={crumb.href} variant="body2" color="text.primary" aria-current="page">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.href}
                component={NextLink}
                href={crumb.href}
                variant="body2"
                color="inherit"
                underline="hover"
              >
                {crumb.label}
              </Link>
            ),
          )}
        </Breadcrumbs>

        <Box component="form" role="search" onSubmit={onSubmit} sx={{ display: "flex" }}>
          <TextField
            inputRef={searchRef}
            type="search"
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the registry"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchGlyph />
                  </InputAdornment>
                ),
              },
              // A visible label would cost the bar a row, so the accessible name is carried
              // explicitly — and on `htmlInput`, which is the `<input>` itself. On the component it
              // lands on the wrapper instead and the field ends up with **no accessible name at
              // all**, named only by a placeholder that disappears the moment anyone types.
              htmlInput: { "aria-label": "Search the registry" },
            }}
            sx={{ width: { xs: 140, sm: 220, md: 280 } }}
          />
        </Box>

        <ColorModeToggle />
      </Toolbar>
    </AppBar>
  );
}
