import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeRegistry } from "@astro-mine/ui";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";

export const metadata: Metadata = {
  title: "Astro-Mine",
  description:
    "Design, simulate and evaluate heterogeneous robotic swarms for planetary exploration and in-situ resource utilization.",
};

/**
 * The root layout.
 *
 * Two things make the first paint honest, and they are different things:
 *
 * `AppRouterCacheProvider` flushes Emotion's collected styles into the HTML emitted at build time,
 * so a statically exported page arrives already styled instead of restyling itself on hydrate.
 * Without it the export ships unstyled markup and flashes.
 *
 * `InitColorSchemeScript` decides *which* styles. It runs before the first paint and sets the colour
 * scheme on `documentElement` from `localStorage`, falling back to the operating system's
 * preference. A static export has no server to negotiate the mode with, so without this the page
 * would paint light for everyone and then flip for anyone who reads in dark — the exact flash the
 * theme exists to avoid. It must be the first thing in the body, and `suppressHydrationWarning` on
 * `<html>` is what stops React objecting to the attribute the script has already written.
 *
 * The theme itself, and `CssBaseline` under it, live in `ThemeRegistry` (`@astro-mine/ui`, ui#3).
 * The shell — sidebar, breadcrumbs, keyboard navigation, focus management, and where the colour-mode
 * toggle sits — is ui#5.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript defaultMode="system" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeRegistry>{children}</ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
