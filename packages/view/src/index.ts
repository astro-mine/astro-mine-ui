// @astro-mine/view — the visualization library.
//
// Deliberately empty. ui#6 ports the existing astro-mine-view package into this workspace and makes
// it Next-safe: client-only mounting, dynamic import, and Cesium's binary assets copied into the
// static export rather than fetched from a CDN. React 19 moves its peer range, and Cesium's React
// bindings are the first surface to check.
//
// This package is a leaf: it must not import any sibling. Geometry, tiles and frame helpers are
// View's; the design system does not re-implement them, and View does not re-implement the design
// system.

export {};
