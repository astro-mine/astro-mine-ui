// @astro-mine/ui — the Astro-Mine design system (ui#3; ui.md §2).
//
// Two things live here and nothing else: **the theme** (light and dark, D6) and **the honesty kit**
// — the components that exist because the platform found ways to mislead a reader. Material UI
// supplies the ordinary primitives the retired design system hand-built (Button, Input, Select,
// Table, Tabs, Dialog, Tooltip, Toast, …); those are MUI's job now and are not re-exported. A
// wrapper around a MUI component that adds nothing is a component to maintain, a name to learn and
// a place for behaviour to drift.
//
// **The export surface is a contract, not an index.** Two rules are asserted by
// `tests/surface.test.ts` rather than left to review:
//
//   1. There is exactly ONE loading / error / empty discipline — `AsyncState`. No `Spinner`, no
//      `Loading`, no `ErrorState`, nothing a page could reach for instead. The rule that no page
//      writes its own is enforced by there being no alternative to write it with.
//   2. NO raw chart primitive escapes this package (ui.md §7.1). `ui#4` added the chart layer —
//      three charts, each with the error-bar and open-mark discipline built in. What leaves this
//      package is a chart with a unit, a title and an uncertainty rule; what does not leave it is an
//      axis, a scale, a series or anything else a page could compose the wrong chart out of.
//      `@mui/x-charts` is a private dependency, and `scripts/check-layering.mjs` fails the build if
//      anything else in the workspace reaches for it.
//
// `InspectorSlot` is named in `ui.md` §2's kit but lands with `ui#7`, which owns the artifact
// inspector registry it is the extension point for.

export { ColorModeToggle, type ColorModeToggleProps } from "./ColorModeToggle.js";
export { ThemeRegistry, type ThemeRegistryProps } from "./ThemeRegistry.js";
export {
  COLOR_SCHEME_ATTRIBUTE,
  COLOR_SCHEMES,
  CONTRAST_PAIRS,
  CONTRAST_THRESHOLDS,
  DECORATIVE_ROLES,
  PALETTES,
  theme,
  type ColorSchemeName,
  type ContrastLevel,
} from "./theme.js";

export { AsyncState, type Async, type AsyncStateProps } from "./components/AsyncState.js";
export { DegradedState, type DegradedStateProps } from "./components/DegradedState.js";
export { Digest, abbreviateDigest, type DigestProps } from "./components/Digest.js";
export { EmptyState, type EmptyStateProps } from "./components/EmptyState.js";
export {
  ProvenanceList,
  type ProvenanceEntry,
  type ProvenanceListProps,
} from "./components/ProvenanceList.js";
export { RunnerBadge, type RunnerBadgeProps } from "./components/RunnerBadge.js";
export { StandInBanner, type StandInBannerProps } from "./components/StandInBanner.js";
export { UncertaintyValue, type UncertaintyValueProps } from "./components/UncertaintyValue.js";

// The chart layer (ui#4). Three charts and the vocabulary they take — no axis, no scale, no series
// primitive, and nothing re-exported from `@mui/x-charts`.
export { BarChart, type BarChartProps } from "./charts/BarChart.js";
export {
  ParallelCoordinates,
  type ParallelCoordinatesProps,
} from "./charts/ParallelCoordinates.js";
export { ScatterChart, type ScatterChartProps } from "./charts/ScatterChart.js";
export type {
  BarDatum,
  BoundState,
  Measured,
  ParallelAxis,
  ParallelRow,
  ScatterPoint,
} from "./charts/model.js";
