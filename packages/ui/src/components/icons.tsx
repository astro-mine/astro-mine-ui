import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

// The handful of glyphs this package needs, drawn inline (ui#3).
//
// **Deliberately not `@mui/icons-material`.** That package is several thousand components and tens
// of megabytes on disk, and the design system needs five glyphs. Pulling it in here would put the
// weight in every consumer of `@astro-mine/ui` — including the ones that render a table of numbers
// — to save writing thirty lines of SVG. If `ui#5`'s shell wants the icon set for navigation, that
// is its decision to make in the application, and these can migrate then.
//
// Every glyph is `aria-hidden`: an icon inside a control is decoration, and the control carries the
// accessible name. An icon that announces itself alongside its own label reads twice.

function Glyph({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      sx={sx}
    >
      {children}
    </Box>
  );
}

/** Two overlapping sheets — copy to clipboard. */
export function CopyGlyph() {
  return (
    <Glyph>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4H5.5A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </Glyph>
  );
}

/** A chevron that rotates to point down when the thing it controls is open. */
export function ExpandGlyph({ open }: { open: boolean }) {
  return (
    <Glyph
      sx={{
        transform: open ? "rotate(90deg)" : "none",
        transition: (theme) => theme.transitions.create("transform", { duration: 150 }),
      }}
    >
      <path d="M8 5l5 5-5 5" />
    </Glyph>
  );
}

/** Light mode. */
export function SunGlyph() {
  return (
    <Glyph>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2.5v1.5M10 16v1.5M17.5 10H16M4 10H2.5M15.3 4.7l-1 1M5.7 14.3l-1 1M15.3 15.3l-1-1M5.7 5.7l-1-1" />
    </Glyph>
  );
}

/** Dark mode. */
export function MoonGlyph() {
  return (
    <Glyph>
      <path d="M16 11.7A6.5 6.5 0 0 1 8.3 4a6.5 6.5 0 1 0 7.7 7.7z" />
    </Glyph>
  );
}

/** Follow the operating system. */
export function SystemGlyph() {
  return (
    <Glyph>
      <rect x="2.5" y="4" width="15" height="9.5" rx="1.5" />
      <path d="M7 17h6" />
    </Glyph>
  );
}
