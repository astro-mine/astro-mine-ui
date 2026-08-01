// The theme, and the mode the reader chooses (ui#3; ui.md §2, §5, D6).

import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ColorModeToggle } from "../src/ColorModeToggle.js";
import { COLOR_SCHEME_ATTRIBUTE, COLOR_SCHEMES, PALETTES, theme } from "../src/theme.js";
import { expectNoA11yViolations } from "./a11y.js";
import { forEachColorScheme } from "./render.js";

/** Renders the toggle plus a readout of the mode the provider believes is in effect. */
function ModeHarness() {
  const { mode } = useColorScheme();
  return (
    <>
      <ColorModeToggle />
      <output data-testid="mode">{mode ?? "unset"}</output>
    </>
  );
}

/**
 * Mount the harness the way the application mounts it. `storageWindow` is passed explicitly so the
 * provider persists to jsdom's `localStorage` — the property under test is that a choice *survives*,
 * and a provider with nowhere to write would pass a weaker test silently.
 */
function mountWithSystemPreference(systemPrefersDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("dark") ? systemPrefersDark : !systemPrefersDark,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  return render(
    <ThemeProvider theme={theme} storageWindow={window} forceThemeRerender>
      <ModeHarness />
    </ThemeProvider>,
  );
}

describe("light and dark, and only light and dark", () => {
  it("declares exactly two colour schemes (D6)", () => {
    // The three-theme system and its derivation, contrast and palette generators are retired. This
    // asserts the retirement rather than trusting that nobody re-adds one.
    expect(Object.keys(theme.colorSchemes ?? {}).sort()).toEqual(["dark", "light"]);
    expect(COLOR_SCHEMES).toEqual(["light", "dark"]);
  });

  it("declares the same colour roles in both schemes", () => {
    // A role present in one scheme and forgotten in the other typechecks, renders, and is broken in
    // exactly half of deployments — the single most likely way this palette would go wrong.
    const roles = (palette: Record<string, unknown>) =>
      Object.entries(palette)
        .flatMap(([role, value]) =>
          typeof value === "string"
            ? [role]
            : Object.keys(value as object).map((k) => `${role}.${k}`),
        )
        .sort();

    expect(roles(PALETTES.light)).toEqual(roles(PALETTES.dark));
  });

  it("carries the honesty colours the kit needs", () => {
    // `standIn` and `degraded` are not decoration: they are the two states Material Design has no
    // colour for, and the components that use them will not render without them.
    for (const scheme of COLOR_SCHEMES) {
      const palette = theme.colorSchemes?.[scheme]?.palette;
      expect(palette?.standIn?.main).toBeTruthy();
      expect(palette?.degraded?.main).toBeTruthy();
    }
  });

  it("resolves CSS variables, which is what lets the mode change before first paint", () => {
    expect(theme.vars).toBeDefined();
    expect(theme.vars?.palette.text.primary).toContain("var(--mui-palette-text-primary");
  });

  it("keys its CSS to the attribute InitColorSchemeScript actually writes", () => {
    // The bug this exists to prevent has no other symptom anywhere in this suite. MUI's `"data"`
    // shorthand generates `[data-dark]`; the pre-paint script writes `data-mui-color-scheme="dark"`.
    // Nothing objects — the types agree, the build succeeds, every jsdom test above still passes,
    // and dark mode is simply dead in a browser because the CSS is keyed to an attribute nobody
    // sets. Two files have to agree and neither can see the other.
    //
    // This half guards the theme: the selector is the named attribute in full, never MUI's `"data"`
    // shorthand. The other half — that the script in the application's layout writes the *same*
    // attribute — cannot honestly be asserted here, because jsdom does not populate the inline
    // script's body, and a test that renders the component and finds an empty `<script>` would pass
    // for the wrong reason. CI asserts it on the emitted bytes of `out/index.html` instead, beside
    // the two other properties this repository checks that way for exactly the same reason.
    expect(theme.colorSchemeSelector).toBe(COLOR_SCHEME_ATTRIBUTE);
  });
});

describe("the mode toggle", () => {
  it("follows the system preference until the reader chooses", async () => {
    mountWithSystemPreference(true);
    expect(await screen.findByTestId("mode")).toHaveTextContent("system");
  });

  it("overrides a dark OS preference with an explicit light choice", async () => {
    const user = userEvent.setup();
    mountWithSystemPreference(true);

    await user.click(await screen.findByRole("button", { name: "Light" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(window.localStorage.getItem("mui-mode")).toBe("light");
  });

  it("overrides a light OS preference with an explicit dark choice", async () => {
    // The other direction, and the half a naive "prefers-color-scheme plus a dark toggle"
    // implementation gets wrong. Both are asserted because passing one proves nothing about the
    // other.
    const user = userEvent.setup();
    mountWithSystemPreference(false);

    await user.click(await screen.findByRole("button", { name: "Dark" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(window.localStorage.getItem("mui-mode")).toBe("dark");
  });

  it("persists the choice across a reload", async () => {
    const user = userEvent.setup();
    const first = mountWithSystemPreference(true);
    await user.click(await screen.findByRole("button", { name: "Light" }));
    first.unmount();

    // A fresh mount is what a reload is, from the provider's point of view: nothing in memory,
    // everything read back from storage.
    mountWithSystemPreference(true);
    expect(await screen.findByTestId("mode")).toHaveTextContent("light");
  });

  it("lets the reader hand control back to the system", async () => {
    // The reason this is a three-state control. A two-way switch cannot express "whichever the
    // machine is set to", so the first touch would be a one-way door out of the default.
    const user = userEvent.setup();
    mountWithSystemPreference(true);

    await user.click(await screen.findByRole("button", { name: "Dark" }));
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");

    await user.click(screen.getByRole("button", { name: "Follow the system" }));
    expect(screen.getByTestId("mode")).toHaveTextContent("system");
  });

  it("keeps a mode selected when the active button is pressed again", async () => {
    // ToggleButtonGroup reports `null` on deselect. Honouring it would leave no mode chosen at all.
    const user = userEvent.setup();
    mountWithSystemPreference(false);

    await user.click(await screen.findByRole("button", { name: "Dark" }));
    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });
});

describe("accessibility", () => {
  it("the toggle is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(<ColorModeToggle />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });
});
