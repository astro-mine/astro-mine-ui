"use client";

/**
 * `@astro-mine/view` — the embeddable component library public API (view.md §3).
 *
 * Phase 1 exports the reference `Placeholder` widget plus the subsystem barrels RM-P1-VIEW-02..04
 * fill: `globe` (Cesium scene + Worlds terrain + assets + replay), `frames` (CRS/SPICE-time),
 * `timeline` (the shared clock) and `replay` (MCAP), with `dashboards`/`explain`/`telemetry`
 * reserved for Phase 2.
 *
 * **`"use client"`, and why it is here rather than on 60 files (ui#6).** Cesium touches `window` at
 * *import* time — `import { Viewer } from "cesium"` is a side effect, not a declaration — so no part
 * of this package may be evaluated while `next build` is prerendering. The directive belongs on the
 * module that forms the boundary, and this is it: the package publishes exactly one entry
 * (`exports: { "." }`), so every consumer arrives through this file and everything it pulls in is in
 * the client graph behind it.
 *
 * That is one of the two belts. The other is the consumer's: the application mounts this through
 * `next/dynamic(..., { ssr: false })`, so the module is never even requested on the server. Either
 * alone would probably do; both is cheap, and the failure they prevent is a build that dies inside a
 * dependency with a stack trace pointing at WebGL.
 */
export { Placeholder } from "./Placeholder";
export type { PlaceholderProps } from "./Placeholder";

export * from "./globe";
export * from "./frames";
export * from "./timeline";
export * from "./replay";
export * from "./telemetry";
export * from "./dashboards";
export * from "./explain";
