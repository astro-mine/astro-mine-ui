import { expect, test } from "@playwright/test";

import { exportedRoutes } from "./routes";

// THE DEGRADED JOURNEY (ui#20; ui.md §7 rule 3, §8).
//
// **With no API configured at all, every route renders, navigates and explains itself.** That is
// the rule the whole design rests on — "degrade visibly, never blank" — and it is the one rule most
// likely to rot, because it is invisible on any machine where the backend happens to be up. Every
// page issue in Wave 29 carried it as an acceptance criterion and each proved it in isolation
// against a mocked `unconfigured` state; nothing proved it of the **shipped bundle, everywhere at
// once**, which is the only form a reader meets it in.
//
// The export this drives is `apps/console/out` exactly as `next build` emits it. There is no
// `config.json` in it, and there is nothing to arrange: the repository ships no endpoint, so the
// unconfigured state is simply what a build *is*.
//
// **What "explains itself" means here, precisely.** Not that a page renders — a blank page with a
// heading renders. Three things, and they are separable:
//
//   1. the page paints its own heading, prerendered, before any script runs;
//   2. the navigation is still there and still works, so the reader is not stranded;
//   3. the missing backend is named as a *state* with a reason and a remedy — never a spinner,
//      never an empty table, never a silent nothing.
//
// The third is what separates this from `smoke.spec.ts`, which asserts (1) and hydration and is
// deliberately not about the API at all.

const routes = exportedRoutes();

/**
 * Routes that talk to no API and so have nothing to explain.
 *
 * A short list, and it should stay short: an entry here is a page that asks the backend for nothing,
 * which for this application is unusual enough to be worth naming. `/help` is prose and links. If a
 * page appears here that a reader would expect to show *data*, that is a finding, not a reason to
 * extend the list.
 *
 * `/dev/inspector` was the second entry and went with the route at `ui#21` — its fixtures were
 * compiled in, so it asked the backend for nothing by construction.
 */
const NO_BACKEND_NEEDED = new Set(["/help"]);

test("the export has routes to drive at all", () => {
  // The same vacuity guard `smoke.spec.ts` carries: a data-driven suite over an empty directory is
  // a green run that asserted nothing.
  expect(routes.length).toBeGreaterThan(15);
});

for (const route of routes) {
  test.describe(route, () => {
    test("renders its own heading with no backend", async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} did not serve`).toBe(200);

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).not.toHaveText("");
    });

    test("keeps its navigation, and the navigation works", async ({ page }) => {
      await page.goto(route);

      // The shell's own landmark, not a guess at a class name. A missing backend must not hide the
      // way out — a reader who lands on a page that cannot load anything has to be able to leave.
      const nav = page.getByRole("navigation");
      await expect(nav.first()).toBeVisible();

      // ...and it is real navigation, not decoration. The leaderboard is the link every persona
      // route eventually passes through, so it is the one worth proving moves.
      await page.getByRole("link", { name: "Leaderboard", exact: true }).first().click();
      await expect(page).toHaveURL(/\/bench\/leaderboard/);
      await expect(page.locator("h1")).toBeVisible();
    });

    if (!NO_BACKEND_NEEDED.has(route)) {
      test("says the backend is missing, with a remedy", async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        // The state, by its words rather than by a test id: this text is what a reader actually
        // gets, and asserting a test id would let the sentence rot while the test stayed green.
        const explanation = page.getByText(/No API is configured/i).first();
        await expect(explanation, `${route} does not say the backend is missing`).toBeVisible();

        // A reason is half an answer. `RuntimeConfigState` carries a remedy for exactly this, and
        // the page has to render it — "it is broken" without "here is what to do" is the failure
        // this rule exists to prevent.
        await expect(page.getByText(/config\.json/i).first()).toBeVisible();
      });

      test("shows no spinner that never resolves", async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        // A spinner is the honest thing to show while a request is in flight and a lie once there
        // is no request to wait for. `progressbar` is the role MUI's loaders carry, so this catches
        // every one of them without naming a component.
        await expect(page.getByRole("progressbar")).toHaveCount(0);
      });
    }
  });
}

test("an unknown path lands on the application's own not-found page", async ({ page }) => {
  await page.goto("/no/such/page");
  // A static host answers an unmatched URL with the export's `404.html`. What matters is that the
  // body is the application's page — with its navigation — rather than the host's default, so a
  // mistyped link does not drop a reader out of the application entirely.
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("navigation").first()).toBeVisible();
});
