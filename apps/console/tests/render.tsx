// Rendering the shell the way the application renders it (ui#5).
//
// The same helper `packages/ui/tests/render.tsx` carries, for the same reason — a component tested
// outside the theme is a component tested against Material UI's defaults — and duplicated rather
// than imported because a package's tests are not part of its published surface. `ui#8` owns the
// shared harness that collapses the two.
//
// Everything renders in **both** colour schemes, because the acceptance criteria say both and
// because the two are separately capable of being wrong.

import { ThemeProvider } from "@mui/material/styles";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { COLOR_SCHEMES, theme, type ColorSchemeName } from "@astro-mine/ui";

export { COLOR_SCHEMES };
export type { ColorSchemeName };

/**
 * Render inside the theme, in a chosen colour scheme.
 *
 * `forceThemeRerender` makes `theme.palette` resolve to that scheme's values rather than staying on
 * the default — without it the provider switches the CSS variables and leaves the JavaScript palette
 * a component reads in `sx` pointing at the other mode.
 *
 * The theme goes in through Testing Library's `wrapper` rather than around the element, so that
 * **`rerender` keeps it**. Wrapping the element by hand looks identical and is not: `rerender(next)`
 * then mounts `next` with no provider above it, React sees a different element type at the root and
 * remounts the whole tree — which silently resets every ref, and so quietly breaks exactly the
 * "what happens on the *second* render" assertions that navigation is made of.
 */
export function renderInMode(ui: ReactElement, mode: ColorSchemeName): RenderResult {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme} defaultMode={mode} forceThemeRerender>
      {children}
    </ThemeProvider>
  );

  return render(ui, {
    wrapper: Wrapper,
    // A fresh container per render, so the two schemes never share a DOM and an assertion cannot
    // accidentally read the other one's markup.
    container: document.body.appendChild(document.createElement("div")),
  });
}

/** Render in the default (light) scheme — for assertions that are not about colour at all. */
export function renderShell(ui: ReactElement): RenderResult {
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
