"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

import { theme } from "./theme.js";

/**
 * Puts the application inside the theme (ui#3).
 *
 * A client component, because `ThemeProvider` holds the colour-scheme context the mode toggle
 * writes to. That does not make the application client-rendered: the tree below still prerenders at
 * build time, and `AppRouterCacheProvider` flushes the resulting Emotion styles into the emitted
 * HTML — the property CI asserts on the bytes of `out/index.html` rather than on a green build.
 *
 * `CssBaseline` lives here rather than in the layout so it resolves against *this* theme, and
 * `enableColorScheme` is what tells the browser which scheme is active — it is what makes form
 * controls, scrollbars and the canvas behind the page follow the mode instead of staying light
 * under a dark document.
 */
export interface ThemeRegistryProps {
  readonly children: ReactNode;
}

export function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
