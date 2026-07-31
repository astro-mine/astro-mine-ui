// @astro-mine/ui — the design system.
//
// Deliberately empty. ui#3 brings the Material UI theme (light and dark only) and the honesty kit —
// UncertaintyValue, AsyncState, DegradedState, StandInBanner, Digest, EmptyState — and ui#4 brings
// the chart layer on MUI X Charts.
//
// The obligation ui#4 inherits is worth stating where the code will live: visx made a second y-axis
// unrepresentable and rendered a null uncertainty bound as an open mark *by construction*. MUI X
// Charts guarantees neither and ships no error bars, so this package owns every chart the
// application renders, exports no raw chart primitive, and carries tests asserting both properties.
//
// This package is a leaf: it must not import any sibling.

export {};
