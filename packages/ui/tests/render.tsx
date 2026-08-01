// Rendering a component the way the application renders it (ui#3).
//
// A honesty component tested outside the theme is a component tested against Material UI's defaults
// rather than against this design system — the palette it reads, the severity colours it names and
// the monospace stack it asks for all come from the theme, and none of them exist without it.
//
// Everything here renders in **both** colour schemes, because that is what the acceptance criteria
// require and because the two are separately capable of being wrong: a role declared in one scheme
// and forgotten in the other typechecks, renders, and is broken in exactly half of deployments.

import { ThemeProvider } from "@mui/material/styles";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { COLOR_SCHEMES, theme, type ColorSchemeName } from "../src/theme.js";

export { COLOR_SCHEMES };
export type { ColorSchemeName };

/**
 * Render inside the theme, in a chosen colour scheme.
 *
 * `forceThemeRerender` makes `theme.palette` resolve to that scheme's values rather than staying on
 * the default — without it the provider would switch the CSS variables and leave the JavaScript
 * palette a component reads in `sx` pointing at the other mode.
 */
export function renderInMode(ui: ReactElement, mode: ColorSchemeName): RenderResult {
  return render(
    <ThemeProvider theme={theme} defaultMode={mode} forceThemeRerender>
      {ui}
    </ThemeProvider>,
    // A fresh container per render, so the two schemes never share a DOM and an assertion cannot
    // accidentally read the other one's markup.
    { container: document.body.appendChild(document.createElement("div")) },
  );
}

/**
 * Run `assertion` against the component rendered in each colour scheme in turn.
 *
 * The unmount between schemes is what keeps this from being two components on the page at once —
 * which would make every `getByRole` ambiguous and every axe run report each violation twice.
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
