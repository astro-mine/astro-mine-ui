import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";

export const metadata: Metadata = {
  title: "Astro-Mine",
  description:
    "Design, simulate and evaluate heterogeneous robotic swarms for planetary exploration and in-situ resource utilization.",
};

/**
 * The root layout.
 *
 * `AppRouterCacheProvider` is what makes the first paint honest: it flushes Emotion's collected
 * styles into the HTML emitted at build time, so a statically exported page arrives already styled
 * instead of restyling itself on hydrate. Without it the export ships unstyled markup and flashes.
 *
 * There is no `ThemeProvider` here yet, and that is deliberate — the light/dark theme is ui#3, and a
 * placeholder theme now would be a thing to unpick rather than a thing to build on. Until it lands
 * the app renders on Material UI's defaults. The shell itself — sidebar, breadcrumbs, keyboard
 * navigation, focus management — is ui#5.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <CssBaseline />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
