import { defineConfig, devices } from "@playwright/test";

// THE BROWSER LANE, AGAINST THE BUILT EXPORT (ui#8; ui.md §8, rebuild plan §6).
//
// **`out/`, never `next dev`.** The deployment is a static bundle any host serves, and the two
// differ in ways that matter to exactly the properties a browser test is for: the dev server
// re-renders on the fly, so a page that fails to prerender its own content looks fine there and
// ships blank. Driving the export is what makes this lane say something the jsdom lane cannot.
//
// **This lane is runnable, not yet a gate.** The persona journey suite and turning accessibility
// into a merge gate are Wave 30, once there are journeys to drive (this issue's own out-of-scope
// note). What ships here is the configuration, a smoke spec and a route-level axe sweep, so the
// Wave 30 issue writes specs rather than infrastructure.
//
// **It runs locally once one system package is installed**, which is worth stating plainly because
// the previous note here said it could not. `libasound.so.2` is missing on a fresh WSL checkout —
// `libasound2t64` on Ubuntu 24.04 — and with it in place both this and the axe sweep pass here. A
// red browser lane is a finding, not an environment quirk. See ARCHITECTURE.md for the commands.

const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  // A failing browser test that passes on a retry is a flake, and a flake recorded as a pass is how
  // a suite stops meaning anything. CI retries once — enough to survive a genuinely flaky network
  // hop, few enough that a real intermittent failure still shows up as one.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Traces on the first retry only: they are large, and the run that matters is the one that
    // failed twice.
    trace: "on-first-retry",
  },

  // One browser. Chromium is what the deployment is developed against, and three engines' worth of
  // CI minutes buys cross-browser confidence this front end has no evidence it needs yet — a
  // decision to revisit deliberately in Wave 30 rather than a default nobody chose.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Serves the export exactly as a static host would: no rewrites, no fallback, no server. If a
  // route only works because something rewrote its URL, it fails here, which is the point.
  webServer: {
    command: `pnpm dlx serve --no-clipboard --listen ${PORT} apps/console/out`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
