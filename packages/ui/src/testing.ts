// @astro-mine/ui/testing — the shared component-test harness (ui#8).
//
// **A separate entry point, and the separation is load-bearing**, exactly as
// `@astro-mine/api-client/testing`'s is: this pulls in Testing Library and axe-core, and a page
// bundle must never carry either. They are **optional peer dependencies**, and nothing under
// `./index.js` reaches here.
//
// It exists because the same helper had been written three times — in `packages/ui`, in
// `packages/inspectors` and in `apps/console` — and the three had already diverged. The
// application's copy passed the theme through Testing Library's `wrapper`; the other two wrapped the
// element, which is a real bug (see `renderInMode`). Three copies of a helper is three chances to
// fix something once, and this is what that looks like when it happens.
//
// It lives here rather than in a root `testing/` directory because a package may not import a
// sibling (ui.md §3): `@astro-mine/ui` is the one place `inspectors` and the application can both
// reach. `packages/view` keeps its own harness — it may not import a sibling either, and it renders
// a globe rather than a themed component, so it shares none of this.

import { ThemeProvider } from "@mui/material/styles";
import axe from "axe-core";
import { render, type RenderResult } from "@testing-library/react";
import { createElement, type ReactElement, type ReactNode } from "react";
import { expect } from "vitest";

import { COLOR_SCHEMES, theme, type ColorSchemeName } from "./theme.js";

export { COLOR_SCHEMES };
export type { ColorSchemeName };

/**
 * Render inside the theme, in a chosen colour scheme.
 *
 * A component tested outside the theme is a component tested against Material UI's defaults — the
 * `standIn` and `degraded` severities it names, the palette it reads in `sx` and the monospace stack
 * it asks for do not exist without it.
 *
 * `forceThemeRerender` makes `theme.palette` resolve to that scheme's values rather than staying on
 * the default; without it the provider switches the CSS variables and leaves the JavaScript palette
 * a component reads in `sx` pointing at the other mode.
 *
 * **The theme goes in through Testing Library's `wrapper`, not around the element**, so that
 * `rerender` keeps it. Wrapping the element by hand looks identical and is not: `rerender(next)`
 * then mounts `next` with no provider above it, React sees a different element type at the root and
 * remounts the whole tree — which silently resets every ref, and so quietly breaks exactly the
 * "what happens on the *second* render" assertions that navigation and timelines are made of. Two of
 * the three copies this replaces had the wrapping-the-element form.
 *
 * `createElement` rather than JSX so this file stays `.ts`: the package's `tsconfig` emits to `dist`
 * and a `.tsx` here would be the only JSX in the published entry surface for one four-line wrapper.
 */
export function renderInMode(ui: ReactElement, mode: ColorSchemeName): RenderResult {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ThemeProvider, { theme, defaultMode: mode, forceThemeRerender: true }, children);

  return render(ui, {
    wrapper: Wrapper,
    // A fresh container per render, so the two schemes never share a DOM and an assertion cannot
    // accidentally read the other one's markup.
    container: document.body.appendChild(document.createElement("div")),
  });
}

/** Render in the default (light) scheme — for assertions that are not about colour at all. */
export function renderLight(ui: ReactElement): RenderResult {
  return renderInMode(ui, "light");
}

/**
 * Run `assertion` against the component rendered in each colour scheme in turn.
 *
 * The unmount between schemes is what keeps this from being two copies on the page at once — which
 * would make every `getByRole` ambiguous and every axe run report each violation twice.
 */
export async function forEachColorScheme(
  ui: ReactElement,
  assertion: (rendered: RenderResult, mode: ColorSchemeName) => void | Promise<void>,
): Promise<void> {
  for (const mode of COLOR_SCHEMES) {
    const rendered = renderInMode(ui, mode);
    try {
      await assertion(rendered, mode);
    } finally {
      rendered.unmount();
    }
  }
}

/**
 * Run axe over an already-rendered container and assert it is clean.
 *
 * Takes a container rather than an element so the caller controls how it was rendered — every
 * component in this workspace is asserted in **both** colour schemes, which means rendering twice.
 *
 * **axe-core directly, not a matcher wrapper.** The assertion is "no violations, and name them if
 * there are"; a wrapper would add a dependency, a peer range to keep in step with Vitest, and a
 * custom matcher, to save six lines.
 *
 * **`color-contrast` is disabled and that is not a gap.** The rule samples rendered pixels, and
 * jsdom has no layout or paint engine — it cannot run, and enabling it produces "incomplete" noise
 * rather than findings. Contrast is gated authoritatively by `packages/ui/tests/contrast.test.ts`,
 * which measures the theme's declared pairings in both schemes rather than sampling anything.
 * Deleting that file is what would create the gap.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });

  const described = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.html}`).join("\n"),
  );

  expect(described.join("\n"), `${results.violations.length} accessibility violation(s)`).toBe("");
}

/**
 * The colour-scheme leak every setup file has to clear.
 *
 * The mode is *persisted* by design, which in a test file means one test's choice arrives as the
 * next one's `defaultMode` and silently wins — `renderInMode` then does not mean what it says. Each
 * project's `setupFiles` calls this from its own `afterEach`, because a setup file also runs for
 * files that opt into the `node` environment and have no DOM at all.
 */
export function resetColorScheme(): void {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-mui-color-scheme");
}
