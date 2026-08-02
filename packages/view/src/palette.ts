// The one file in `@astro-mine/view` where a colour may be written (ui#6).
//
// **Why this package has its own, rather than reaching for the design system's theme.** A package
// may not import a sibling (ui.md §3), so `@astro-mine/ui`'s theme is structurally out of reach —
// and it would be the wrong source anyway. These colours are not application chrome: they are
// overlays sitting **on top of a WebGL canvas**, whose background is a rendered planet rather than a
// surface the theme knows about. Every one of them is deliberately dark and translucent because
// what is behind it is lunar regolith at an unknown exposure, not `background.paper`.
//
// What the workspace rule wants is that colour lives in one auditable place per package rather than
// being scattered through components, and that is exactly what this is. `eslint.config.mjs` names
// this file alongside `packages/ui/src/theme.ts` for that reason.
//
// **Every pairing here is declared as a pair**, foreground against its own background, so
// `palette.test.ts` can measure each one against WCAG 1.4.3 rather than trusting that it looked
// fine on somebody's monitor. That test is what keeps this from being the one corner of the front
// end whose contrast nobody checks.

/** A foreground on the background it is actually rendered against. */
export interface Pairing {
  readonly foreground: string;
  readonly background: string;
}

/**
 * The scene overlays.
 *
 * The backgrounds are translucent over an unknown scene, so the measured pair uses each colour's
 * **composite over black** — the worst realistic case, since the globe's night side and the space
 * behind it are the darkest thing an overlay can sit on. Measuring against the translucent value
 * itself would measure nothing.
 */
export const OVERLAY = {
  /** A scene that is current and complete. */
  ready: { foreground: "#b6f0b6", background: "rgba(20, 40, 20, 0.75)" },
  /** Stale terrain, an unreachable bundle — the scene still renders and says so. */
  degraded: { foreground: "#ffd88a", background: "rgba(60, 40, 0, 0.85)" },
  /** Resolving. Not an error, and it must not wear one's colour. */
  pending: { foreground: "#c8c8d8", background: "rgba(20, 20, 30, 0.75)" },
  /** The body-fixed coordinate readout. */
  readout: { foreground: "#e8e8f0", background: "rgba(15, 15, 20, 0.75)" },
  /** The timeline strip beneath a scene. */
  timeline: { foreground: "#c8c8d8", background: "rgba(20, 20, 30, 0.8)" },
} as const satisfies Record<string, Pairing>;

/** The scrubber's transport controls — opaque, because they sit on the timeline strip, not the scene. */
export const CONTROL = {
  foreground: "#c8c8d8",
  background: "#161a22",
  border: "#3a3f4b",
} as const;

/** Every pairing the contrast test measures. Adding a colour above without adding it here is the
 * one way to slip past that test, so the test asserts this list covers `OVERLAY` in full. */
export const PAIRINGS: Readonly<Record<string, Pairing>> = {
  ...OVERLAY,
  control: { foreground: CONTROL.foreground, background: CONTROL.background },
};
