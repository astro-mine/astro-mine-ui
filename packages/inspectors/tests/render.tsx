// Rendering a panel the way the application renders it (ui#7).
//
// A panel tested outside the theme is a panel tested against Material UI's defaults rather than
// against this design system — the `degraded` severity it reaches for does not exist without the
// theme, and neither does the monospace stack a digest is set in. The same helper `packages/ui`
// carries, for the same reason; it is not shared between the two because a package may not import a
// sibling's tests, and duplicating twenty lines is cheaper than a fifth package.

import { theme } from "@astro-mine/ui";
import { ThemeProvider } from "@mui/material/styles";
import { render, type RenderResult } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { expect } from "vitest";

export const COLOR_SCHEMES = ["light", "dark"] as const;
export type ColorSchemeName = (typeof COLOR_SCHEMES)[number];

/**
 * Render inside the theme, in a chosen colour scheme.
 *
 * `forceThemeRerender` makes `theme.palette` resolve to that scheme's values rather than staying on
 * the default — without it the provider switches the CSS variables and leaves the JavaScript palette
 * a component reads in `sx` pointing at the other mode.
 */
export function renderInMode(ui: ReactElement, mode: ColorSchemeName): RenderResult {
  return render(
    <ThemeProvider theme={theme} defaultMode={mode} forceThemeRerender>
      {ui}
    </ThemeProvider>,
    { container: document.body.appendChild(document.createElement("div")) },
  );
}

/**
 * Run `assertion` against the panel rendered in each colour scheme in turn.
 *
 * The unmount between schemes is what keeps this from being two panels on the page at once — which
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
 * `color-contrast` is disabled and that is not a gap: the rule samples rendered pixels and jsdom has
 * no layout or paint engine, so it cannot run and produces "incomplete" noise rather than findings.
 * Contrast is gated authoritatively by `packages/ui`'s own `tests/contrast.test.ts`, which measures
 * the theme's declared pairings — and every colour these panels use comes from that theme.
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
