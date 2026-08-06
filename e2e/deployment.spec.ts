import { expect, test, type Page, type Request } from "@playwright/test";

import { exportedRoutes } from "./routes";

// WHAT THE DEPLOYMENT PROMISES, ASSERTED ON THE BUILT BUNDLE (ui#21; ui.md §5.1, §8).
//
// Two claims, and neither is checkable anywhere else in this suite:
//
//   1. **One bundle, two deployments.** The API endpoint is runtime configuration, so pointing the
//      application somewhere else is editing a file beside it — never a rebuild. Every other test
//      of `config.json` proves the *loader* handles a state; this proves the *artifact* does, by
//      driving the same `apps/console/out` at two different backends without touching the build.
//      That is the property that makes the thing deployable by somebody who did not build it, and
//      it is the one that would rot invisibly: an endpoint compiled in by accident looks identical
//      on every machine where the build and the deployment are the same act.
//
//   2. **Nothing leaves the origin except the configured API.** No CDN, no font host, no analytics,
//      no telemetry beacon (CX-LOCAL). Cesium's workers and WebAssembly are served by the
//      deployment, which is why `scripts/copy-cesium-assets.mjs` exists — but that is asserted on
//      the emitted *files*, and a file being present says nothing about what a running page asks
//      for. This records every request each route actually makes.
//
// **The honest limit of claim 2.** It bounds what the *bundle* fetches of its own accord. Two
// things it deliberately does not bound: an episode's MCAP replay and a world's 3D Tiles bundle
// are addressed by URLs the **API supplies**, and a deployment may well serve those from a
// registry or an object store beside the API rather than from the API itself. Those addresses are
// data, not build output, and no assertion here could distinguish a legitimate one from a bad one.
// Nothing in this file drives a replay, so nothing here is silently excusing one.
//
// Runs in the `degraded` project — `apps/console/out` served as `next build` emits it, with no
// `config.json` — so it needs no API, no Python and no seed. The configuration each test wants is
// fulfilled at the network layer, which is what lets both endpoints be exercised against a single
// running server and a single build.

/** Two endpoints that are unmistakably different, and neither of which resolves. */
const ALPHA = "https://alpha.example";
const BETA = "https://beta.example";

/**
 * Serve `config.json` naming `apiBaseUrl`, and answer that API with a refusal.
 *
 * The refusal is deliberate: what is under test is the address the client *dialled*, not what came
 * back, and stubbing a success would mean maintaining a second copy of response shapes the
 * component lane already fakes from the OpenAPI document. A 503 is also stable — it needs no DNS,
 * so the test cannot fail because a runner has an opinion about `.example`.
 */
async function deployAgainst(page: Page, apiBaseUrl: string): Promise<void> {
  await page.route("**/config.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ apiBaseUrl }),
    }),
  );
  await page.route(`${apiBaseUrl}/**`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      body: JSON.stringify({ title: "Unavailable", status: 503, detail: "stubbed by the suite" }),
    }),
  );
}

/** Every http(s) URL the page asked for. */
function recordRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request: Request) => {
    const url = request.url();
    // `data:` and `blob:` never leave the browser, so they are not requests in the sense this file
    // cares about. Filtered by scheme rather than skipped by guesswork about who created them.
    if (url.startsWith("http://") || url.startsWith("https://")) seen.push(url);
  });
  return seen;
}

test.describe("one bundle, two deployments", () => {
  for (const apiBaseUrl of [ALPHA, BETA]) {
    test(`the same build calls ${apiBaseUrl} when config.json says so`, async ({ page }) => {
      const requests = recordRequests(page);
      await deployAgainst(page, apiBaseUrl);

      // The leaderboard lists the scenario zoo on mount, with no query string needed to make it
      // ask — which is what makes it the route worth driving here.
      await page.goto("/bench/leaderboard");
      await page.waitForLoadState("networkidle");

      const toApi = requests.filter((url) => url.startsWith(`${apiBaseUrl}/`));
      expect(
        toApi,
        `no request reached ${apiBaseUrl}; the endpoint in config.json was not used`,
      ).not.toHaveLength(0);

      // ...and unmistakably not the other one. A bundle with an endpoint compiled in would call the
      // same address whatever the file said, and this is the assertion that catches it.
      const other = apiBaseUrl === ALPHA ? BETA : ALPHA;
      expect(
        requests.filter((url) => url.startsWith(`${other}/`)),
        `a request reached ${other}, which this deployment was never pointed at`,
      ).toHaveLength(0);
    });
  }

  test("the export itself carries no endpoint", async ({ page }) => {
    // The complement of the two tests above, and the reason they are not sufficient on their own:
    // they prove the configured address is *used*, not that no other address is baked in. Served
    // exactly as `next build` emits it — no `config.json` anywhere — the application must reach
    // nothing at all beyond the host serving it.
    const requests = recordRequests(page);

    await page.goto("/bench/leaderboard");
    await page.waitForLoadState("networkidle");

    const origin = new URL(page.url()).origin;
    expect(
      requests.filter((url) => new URL(url).origin !== origin),
      "an unconfigured build reached an address it was not given",
    ).toEqual([]);
  });
});

test("no route fetches anything but the deployment and its configured API", async ({ page }) => {
  const routes = exportedRoutes();
  // The vacuity guard the rest of the suite carries: a sweep over an empty directory is a green run
  // that asserted nothing.
  expect(routes.length).toBeGreaterThan(15);

  const requests = recordRequests(page);
  await deployAgainst(page, ALPHA);

  // One page across every route rather than a test per route: this is a single claim about the
  // whole bundle, and a failure is most useful as one list naming every route that broke it.
  const offenders: string[] = [];
  for (const route of routes) {
    const before = requests.length;
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const origin = new URL(page.url()).origin;
    for (const url of requests.slice(before)) {
      const requestOrigin = new URL(url).origin;
      if (requestOrigin !== origin && requestOrigin !== ALPHA) offenders.push(`${route} → ${url}`);
    }
  }

  expect(
    offenders,
    "these routes fetched from somewhere that is neither the deployment nor its configured API — " +
      "a CDN, a font host or a beacon has been introduced, and the offline/CX-LOCAL property is gone",
  ).toEqual([]);
});
