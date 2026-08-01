// The Astro-Mine theme (ui#3; ui.md §2, D6).
//
// **One theme, two colour schemes.** MUI's `colorSchemes` carries light and dark, and that is the
// whole story — the retired design shipped three derived themes (`instrument`/`editorial`/`mission`)
// with seed-derivation, palette and contrast generators behind them. Three themes meant three times
// the contrast surface to prove and a generator layer to maintain, for a choice no user asked to
// make (ui.md §11). Light and dark only.
//
// **Every colour the application renders is declared here.** Nothing downstream writes a hex value —
// `eslint.config.mjs` rejects colour literals outside this file, because a colour written into a
// component is a colour no contrast check can see. What is not declared here is not checked, and
// what is not checked is not honest.
//
// **Roles are set explicitly rather than left to MUI's defaults.** `text.primary` on
// `background.paper` is a pairing a reader depends on; if MUI derives it, the value can move under
// us in a minor release and the gate would still be measuring whatever it derived. Declaring the
// role is what makes `tests/contrast.test.ts` an assertion about this design rather than about
// Material Design's.

import {
  createTheme,
  type PaletteColor,
  type PaletteColorOptions,
  type Theme,
} from "@mui/material/styles";

// --- the palette ------------------------------------------------------------

/**
 * Two semantic colours Material Design does not have, because the platform has two failure modes it
 * does not have. Both are honesty rules with a colour attached:
 *
 * - `standIn` — a stand-in stands in for the real thing (rule 1). Not a warning about a risk: a
 *   statement that what you are reading was not produced the way it appears to have been.
 * - `degraded` — a backend is absent or a capability unmet (rule 3). Not an error, because nothing
 *   failed; the surface is intact and simply cannot reach something. Collapsing the two would send
 *   a reader to look for a fault that is not there.
 *
 * They are declared through module augmentation (below) so they are usable wherever MUI takes a
 * palette colour, rather than being loose constants a component reaches for.
 */
declare module "@mui/material/styles" {
  interface Palette {
    standIn: PaletteColor;
    degraded: PaletteColor;
  }
  interface PaletteOptions {
    standIn?: PaletteColorOptions;
    degraded?: PaletteColorOptions;
  }

  // Opts the *types* into the CSS-variables theme. Without this, `Theme` has no `colorSchemes` or
  // `vars` — the runtime would carry them and TypeScript would deny it, and `contrast.ts` could not
  // read the palettes it measures.
  interface CssThemeVariables {
    enabled: true;
  }

  // MUI has no monospace slot, and the application is mostly digests, seeds, quantities and ids.
  // Declaring it on the theme is what keeps the stack in one place instead of in every `sx` that
  // needs it — and what keeps `code` from falling back to whatever the browser calls "monospace".
  interface TypographyVariants {
    fontFamilyMonospace: string;
  }
  interface TypographyVariantsOptions {
    fontFamilyMonospace?: string;
  }
}

// `severity` on an Alert widens through this override, so `<Alert severity="degraded">` typechecks.
declare module "@mui/material/Alert" {
  interface AlertPropsColorOverrides {
    standIn: true;
    degraded: true;
  }
}

// The same widening for Chip, which is what `RunnerBadge` labels a stand-in with.
declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    standIn: true;
    degraded: true;
  }
}

/**
 * Light. A near-white page rather than pure white, so a `paper` surface can sit *above* it without
 * a border doing all the work.
 */
const light = {
  primary: {
    main: "#1b4f8f",
    light: "#4477b8",
    dark: "#0f3565",
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#5b4b8a",
    light: "#7f6fae",
    dark: "#3d3160",
    contrastText: "#ffffff",
  },
  error: { main: "#b3261e", light: "#d4453c", dark: "#7f1a14", contrastText: "#ffffff" },
  warning: { main: "#8a5300", light: "#b06d0a", dark: "#5e3800", contrastText: "#ffffff" },
  info: { main: "#00639b", light: "#2a83bd", dark: "#00456c", contrastText: "#ffffff" },
  success: { main: "#1c6b3f", light: "#2f8d58", dark: "#0f4a29", contrastText: "#ffffff" },
  standIn: { main: "#8a5300", light: "#fdf3e2", dark: "#5e3800", contrastText: "#ffffff" },
  degraded: { main: "#5b4b8a", light: "#f0edf7", dark: "#3d3160", contrastText: "#ffffff" },
  background: { default: "#f7f8fa", paper: "#ffffff" },
  text: {
    primary: "#15181d",
    secondary: "#4a5361",
    disabled: "#767e8b",
  },
  divider: "#b9c0cc",
} as const;

/**
 * Dark. Not an inversion — a dark surface reflects less, so the same nominal contrast reads hotter,
 * and pure black with pure white is the pairing that produces halation on an OLED panel. The page
 * is a very dark slate and the body text is off-white for that reason.
 */
const dark = {
  primary: {
    main: "#9dc2f0",
    light: "#c3daf7",
    dark: "#6f9fd8",
    contrastText: "#0a1220",
  },
  secondary: {
    main: "#c2b3e8",
    light: "#dbd1f2",
    dark: "#9a88c9",
    contrastText: "#14102a",
  },
  error: { main: "#f2b8b5", light: "#f8d5d3", dark: "#c98b88", contrastText: "#2a0f0d" },
  warning: { main: "#f0c07a", light: "#f6d9ac", dark: "#c8974f", contrastText: "#2a1a00" },
  info: { main: "#96ccec", light: "#c0e0f4", dark: "#68a8cc", contrastText: "#03212f" },
  success: { main: "#8fd7ab", light: "#bde8cc", dark: "#63b384", contrastText: "#04230f" },
  standIn: { main: "#f0c07a", light: "#3a2c12", dark: "#c8974f", contrastText: "#2a1a00" },
  degraded: { main: "#c2b3e8", light: "#2a2440", dark: "#9a88c9", contrastText: "#14102a" },
  background: { default: "#101317", paper: "#181c22" },
  text: {
    primary: "#e7eaef",
    secondary: "#b0b8c4",
    disabled: "#828b98",
  },
  divider: "#4b5464",
} as const;

/**
 * The colour schemes, side by side, so a reader can compare a role across modes without scrolling
 * between two files. `tests/contrast.test.ts` walks this object; adding a role without a declared
 * pairing is invisible to the gate, which is why {@link CONTRAST_PAIRS} lives beside it.
 */
export const PALETTES = { light, dark } as const;

/** The two colour schemes this application has, and the only two it will have (D6). */
export const COLOR_SCHEMES = ["light", "dark"] as const;

export type ColorSchemeName = (typeof COLOR_SCHEMES)[number];

// --- the theme --------------------------------------------------------------

/**
 * The attribute the colour scheme is written to, named once.
 *
 * **This must match `InitColorSchemeScript`'s `attribute`,** and the two are set in different files
 * — the theme here, the script in the application's root layout. MUI's shorthand `"data"` is a trap
 * for exactly that reason: it generates `[data-light]` / `[data-dark]`, while the script's default
 * writes `data-mui-color-scheme="dark"`. Nothing objects. The types agree, the build succeeds, the
 * jsdom tests pass — and dark mode is simply dead in a browser, because the CSS is keyed to an
 * attribute nobody sets. Naming the attribute in full makes MUI generate
 * `[data-mui-color-scheme="%s"]`, which is what the script actually writes; `tests/theme.test.tsx`
 * asserts the two agree, and CI asserts it again on the emitted bytes.
 */
export const COLOR_SCHEME_ATTRIBUTE = "data-mui-color-scheme";

/**
 * The application's theme.
 *
 * `cssVariables` is what lets the mode change without repainting the React tree — and, more
 * importantly here, what lets `InitColorSchemeScript` set the scheme on `documentElement` *before*
 * first paint. A statically exported page has no server to negotiate the mode with, so without that
 * the export would paint light for everyone and flip on hydrate.
 */
export const theme: Theme = createTheme({
  cssVariables: { colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE },
  colorSchemes: {
    light: { palette: light },
    dark: { palette: dark },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Digests, seeds, units and quantities all read better tabular, and they are most of what this
    // application shows. The stack is deliberately system-only: a static bundle that fetches a font
    // has an external runtime dependency, and this one is meant to serve from anywhere (ui.md §8).
    fontFamilyMonospace:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    h1: { fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.25 },
    h2: { fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.35 },
    button: { textTransform: "none" },
  },
  components: {
    // A focus ring that survives a redesign. Keyboard reachability is a build gate (ui.md §7 rule
    // 7), and the default outline disappears against several of our surfaces.
    MuiCssBaseline: {
      styleOverrides: {
        ":focus-visible": {
          outline: "2px solid",
          outlineColor: "var(--mui-palette-primary-main)",
          outlineOffset: "2px",
        },
      },
    },
    MuiAlert: { defaultProps: { variant: "outlined" } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

// --- the contrast contract --------------------------------------------------

/** WCAG 2.1 thresholds, by what the pairing is used for. */
export const CONTRAST_THRESHOLDS = {
  /** 1.4.3 — body text. */
  aa: 4.5,
  /** 1.4.3 — large text: >= 18.66px bold, or >= 24px. */
  aaLarge: 3,
  /** 1.4.11 — non-text: borders, focus rings, chart marks. */
  ui: 3,
} as const;

export type ContrastLevel = keyof typeof CONTRAST_THRESHOLDS;

/**
 * A pairing that must hold, as `[foreground, background, level]` where each side is a dotted path
 * into a scheme's palette.
 *
 * This table is the contract. A colour role with no entry here is a role nobody has promised
 * anything about — which is why adding a role and adding its pairing are the same change, and why
 * `tests/contrast.test.ts` also asserts that every declared role is reachable from at least one
 * pairing. An unchecked token is how a design system starts claiming an accessibility property it
 * has stopped having (conventions.md §11).
 */
export const CONTRAST_PAIRS: readonly (readonly [string, string, ContrastLevel])[] = [
  // Body text, on both surfaces.
  ["text.primary", "background.default", "aa"],
  ["text.primary", "background.paper", "aa"],
  ["text.secondary", "background.default", "aa"],
  ["text.secondary", "background.paper", "aa"],
  // `text.disabled` is not held to 4.5:1 — it marks something that is *not* actionable, and forcing
  // it to body contrast would make it indistinguishable from text that is. It is still held to the
  // non-text floor so it never becomes invisible.
  ["text.disabled", "background.default", "ui"],
  ["text.disabled", "background.paper", "ui"],

  // Semantic text: a status word on a page, at body size.
  ["primary.main", "background.default", "aa"],
  ["primary.main", "background.paper", "aa"],
  ["error.main", "background.paper", "aa"],
  ["warning.main", "background.paper", "aa"],
  ["info.main", "background.paper", "aa"],
  ["success.main", "background.paper", "aa"],
  ["secondary.main", "background.paper", "aa"],

  // The honesty colours, which carry the most load-bearing words in the application.
  ["standIn.main", "background.paper", "aa"],
  ["standIn.main", "background.default", "aa"],
  ["degraded.main", "background.paper", "aa"],
  ["degraded.main", "background.default", "aa"],

  // Text on a filled surface of its own colour.
  ["primary.contrastText", "primary.main", "aa"],
  ["secondary.contrastText", "secondary.main", "aa"],
  ["error.contrastText", "error.main", "aa"],
  ["warning.contrastText", "warning.main", "aa"],
  ["info.contrastText", "info.main", "aa"],
  ["success.contrastText", "success.main", "aa"],
  ["standIn.contrastText", "standIn.main", "aa"],
  ["degraded.contrastText", "degraded.main", "aa"],

  // Non-text (1.4.11): the focus ring, which must be perceivable on both surfaces. Alert borders
  // are severity colours and are already held to the stricter text floor above, so the outlined
  // Alert this theme defaults to is covered without a separate entry.
  ["primary.main", "background.default", "ui"],
  ["primary.main", "background.paper", "ui"],
];

/**
 * Roles deliberately outside the contrast contract, and why.
 *
 * `divider` separates content; it is not a control boundary and not a graphical object required to
 * understand anything, so WCAG 1.4.11 does not reach it — the rule covers UI components and
 * meaningful graphics. Holding a hairline separator to 3:1 would draw every table row in near-black
 * and make the structure louder than the data, which is a legibility regression bought with a
 * standard that was never asking for it.
 *
 * This is a *named* exemption rather than an omission: `tests/contrast.test.ts` asserts that every
 * declared role is either in {@link CONTRAST_PAIRS} or listed here, so dropping a role out of the
 * gate is a visible edit with a reason attached, not a silent gap.
 */
export const DECORATIVE_ROLES: ReadonlySet<string> = new Set(["divider"]);
