import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

// The four glyphs the shell needs, drawn inline (ui#5).
//
// **Still not `@mui/icons-material`.** `packages/ui`'s own icon file left this call to this issue:
// "if ui#5's shell wants the icon set for navigation, that is its decision to make in the
// application". The decision is no — the shell needs four glyphs, and that package is several
// thousand components and tens of megabytes to supply them. The one argument for it would be a
// per-nav-entry icon set, and the sidebar does not have one: eighteen entries in six labelled
// groups read better with text than with eighteen invented pictograms, none of which would mean
// anything to a first-time reader.
//
// Every glyph is `aria-hidden`, because an icon inside a control is decoration and the control
// carries the accessible name. An icon that announces itself beside its own label reads twice.
//
// `currentColor` throughout — no colour literal outside the theme, which the workspace lint rule
// enforces on the literal rather than trusting review.

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

/** Three bars — opens the navigation drawer below the breakpoint. */
export function MenuGlyph() {
  return (
    <Glyph>
      <path d="M3 5h14M3 10h14M3 15h14" />
    </Glyph>
  );
}

/** A chevron, pointing down when the group it controls is expanded. */
export function DisclosureGlyph({ open }: { open: boolean }) {
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

/** A magnifier — the global search entry point. */
export function SearchGlyph() {
  return (
    <Glyph>
      <circle cx="9" cy="9" r="5" />
      <path d="M13 13l4 4" />
    </Glyph>
  );
}

/** A slash inside a key cap — the hint that `/` focuses search. */
export function SlashKeyGlyph() {
  return (
    <Glyph>
      <rect x="3" y="4" width="14" height="12" rx="2.5" />
      <path d="M8.5 13l3-6" />
    </Glyph>
  );
}
