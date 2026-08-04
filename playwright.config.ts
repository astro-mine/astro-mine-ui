import { defineConfig, devices } from "@playwright/test";

// THE BROWSER LANE, AGAINST THE BUILT EXPORT (ui#8, ui#20; ui.md §8, rebuild plan §6).
//
// **`out/`, never `next dev`.** The deployment is a static bundle any host serves, and the two
// differ in ways that matter to exactly the properties a browser test is for: the dev server
// re-renders on the fly, so a page that fails to prerender its own content looks fine there and
// ships blank. Driving the export is what makes this lane say something the jsdom lane cannot.
//
// **Two projects over one build, and the difference between them is one file.**
//
//   - `degraded` serves `apps/console/out` exactly as `next build` emits it — with **no**
//     `config.json`, which is the state a reader meets when nobody has configured a backend. Every
//     route must still render, navigate and explain itself. `ui.md` §7 rule 3 is the rule the whole
//     design rests on, and this is where it is asserted.
//   - `journeys` serves a copy with an endpoint beside it and drives the persona journeys against a
//     **real, seeded `astro-mine-api`** (`scripts/journeys-up.mjs`). Faking the API here would
//     re-assert what the component lane already proved against MSW, more slowly; what only this can
//     prove is that the contract holds — that the routes exist and answer what the generated client
//     expects.
//
// Splitting them by project rather than by spec file is what lets `pnpm e2e --project degraded` run
// with no Python, no API and no seed — which is most of the suite, and the part a contributor
// touching a page actually needs.
//
// **It runs locally once one system package is installed.** `libasound.so.2` is missing on a fresh
// WSL checkout — `libasound2t64` on Ubuntu 24.04 — and with it in place every lane here passes. A
// red browser lane is a finding, not an environment quirk. See ARCHITECTURE.md for the commands.

const DEGRADED_PORT = 4173;
const SEEDED_PORT = 4174;
const API_PORT = 8000;

/**
 * Whether to bring up the seeded backend — set by `pnpm e2e:journeys`.
 *
 * A flag rather than a project name, because Playwright's `webServer` list is global: it starts
 * every entry for every project, so `--project degraded` alone would still pay for a seed it never
 * touches. That would make "the degraded lane needs no Python" false in the one place it matters —
 * a contributor changing a page and running the browser tests.
 */
const JOURNEYS = process.env.ASTRO_MINE_JOURNEYS === "1";

const DEGRADED_SERVER = {
  command: `pnpm dlx serve --no-clipboard --listen ${DEGRADED_PORT} apps/console/out`,
  url: `http://127.0.0.1:${DEGRADED_PORT}`,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
};

const SEEDED_SERVERS = [
  {
    command:
      `node e2e/fixture/prepare-export.mjs && ` +
      `pnpm dlx serve --no-clipboard --listen ${SEEDED_PORT} apps/console/.e2e/seeded`,
    url: `http://127.0.0.1:${SEEDED_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  {
    // Slowest by far: on a cold seed root it publishes content and scores two submissions through
    // the real sandboxed evaluator, which is minutes rather than seconds. It is idempotent, so
    // every run after the first is quick.
    command: "node scripts/journeys-up.mjs",
    url: `http://127.0.0.1:${API_PORT}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 1_800_000,
  },
];

export default defineConfig({
  testDir: "./e2e",
  // A failing browser test that passes on a retry is a flake, and a flake recorded as a pass is how
  // a suite stops meaning anything. CI retries once — enough to survive a genuinely flaky network
  // hop, few enough that a real intermittent failure still shows up as one.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    // Traces on the first retry only: they are large, and the run that matters is the one that
    // failed twice.
    trace: "on-first-retry",
  },

  // One browser. Chromium is what the deployment is developed against, and three engines' worth of
  // CI minutes buys cross-browser confidence this front end has no evidence it needs — the
  // cross-browser matrix is `ui#20`'s own deferred scope, revisited when there is a reason.
  projects: [
    {
      name: "degraded",
      testIgnore: /journeys\//,
      use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${DEGRADED_PORT}` },
    },
    ...(JOURNEYS
      ? [
          {
            name: "journeys",
            testMatch: /journeys\/.*\.spec\.ts/,
            // **Ten minutes, and it is not slack.** A submission is scored on twelve held-out seeds
            // in a sandboxed subprocess — the server runs the policy, the submitter does not report
            // a score — which is ~40s of real work per submission, by design. The design journey
            // adds a batch study and a publish on top. Playwright's 30s default cuts every one of
            // those off mid-flight and reports it as "element not found", which reads like a broken
            // page and is a stopwatch.
            timeout: 600_000,
            // **One at a time, and this is a property of the fixture rather than a speed knob.**
            // The journeys share one deployment and *mutate* it — P1 submits, P7 retracts, P5
            // publishes — so running them concurrently makes the board a race. It also keeps one
            // sandboxed evaluation on the machine at a time: a submission is scored under memory
            // and CPU rlimits, and a worker starved by a second scoring run beside it dies with
            // "exited 1 without a parseable result document", which reads as a broken submission
            // and is a busy machine.
            workers: 1,
            use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${SEEDED_PORT}` },
          },
        ]
      : []),
  ],

  // Serves the export exactly as a static host would: no rewrites, no fallback, no server. If a
  // route only works because something rewrote its URL, it fails here, which is the point.
  webServer: JOURNEYS ? [DEGRADED_SERVER, ...SEEDED_SERVERS] : [DEGRADED_SERVER],
});
