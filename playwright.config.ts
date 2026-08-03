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
// **It does not run in this workspace's development environment**, and that is environmental rather
// than a defect: Playwright cannot launch a browser under WSL here (a missing system library), so a
// red browser lane *there* proves nothing and CI is the arbiter. That fact is recorded in
// ARCHITECTURE.md beside the jsdom `File` one, because both look like product bugs and neither is.

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
