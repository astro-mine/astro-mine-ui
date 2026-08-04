import { expect, test } from "@playwright/test";

import { exportedRoutes } from "./routes";

// The browser lane's floor (ui#8).
//
// Not a persona journey — those are Wave 30, and there are no journeys to drive until pages fetch
// something. What this asserts is the set of properties that are **invisible to every other lane**
// and true of every route: it is reachable as a static file, it paints its own content without
// JavaScript having to build it, and it does not throw on hydration.
//
// The jsdom lane cannot see any of the three. It never prerenders, so a page that ships empty and
// fills in on hydrate looks identical to one that does not; and it has no navigation, so a
// hydration error surfaces as a passing test with a console message nobody reads.

const routes = exportedRoutes();

/**
 * Page errors that are Cesium's rather than this application's.
 *
 * **Found by this lane on its first CI run**, which is the argument for having it: three identical
 * parse errors on the routes that mount Cesium and on no other route. It comes out of Cesium's own bundled code as Chromium parses it, the page still loads, and
 * the globe still renders. No other lane could see it: jsdom never evaluates Cesium, and a passing
 * build says nothing about what a browser does with the bytes.
 *
 * Matched on the **exact message** rather than by muting the routes, so that any *other* error on
 * those routes still fails — which is what let `/design/study` inherit the tolerance at `ui#17`
 * without anybody widening it.
 *
 * REMOVE THIS when a Cesium upgrade stops producing it — the check below fails loudly if the entry
 * stops matching anything, so it cannot quietly outlive its reason.
 */
const KNOWN_THIRD_PARTY_ERRORS = ["Octal escape sequences are not allowed in template strings."];

const unexpected = (errors: string[]) =>
  errors.filter((message) => !KNOWN_THIRD_PARTY_ERRORS.some((known) => message.includes(known)));

test("the export has routes to drive at all", () => {
  // A guard against the whole suite passing vacuously. `exportedRoutes` reads a directory, and an
  // empty directory would make every `test.describe` below expand to nothing — a green lane that
  // ran no assertions, which is the failure mode a data-driven suite is most prone to.
  expect(routes.length).toBeGreaterThan(15);
});

for (const route of routes) {
  test.describe(route, () => {
    test("serves, paints its own heading, and hydrates without error", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(route);
      expect(response?.status(), `${route} did not serve`).toBe(200);

      // The heading is in the HTML the server sent, before any script runs. `useSearchParams` called
      // above the content it needs opts a whole page out of prerendering; the route still builds,
      // still lists as static, and ships a shell. CI already greps the emitted bytes for an `<h1>`,
      // and this is the same property asserted where a user meets it.
      await expect(page.locator("h1")).toBeVisible();

      // Hydration happens after the first paint, so give React a moment to throw if it is going to.
      await page.waitForLoadState("networkidle");
      expect(unexpected(errors), `${route} threw during hydration`).toEqual([]);
    });
  });
}

test("the third-party error allowlist still has a subject", async ({ page }) => {
  // An allowlist that stops matching anything is an allowlist nobody removed. This asserts the
  // entry above is still earning its place — when a Cesium upgrade fixes it, this fails and the
  // tolerance goes with it, rather than sitting there quietly weakening the assertion above.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // `/dev/inspector` since `ui#17` deleted `/dev/globe`. It mounts Cesium through the same
  // `components/Globe` boundary, so it is the same subject; the real globe on `/design/study`
  // cannot be the subject here because it draws nothing until a world resolves against a live API.
  await page.goto("/dev/inspector");
  await page.waitForLoadState("networkidle");

  expect(
    errors.some((message) => KNOWN_THIRD_PARTY_ERRORS.some((known) => message.includes(known))),
    "Cesium no longer produces the parse error KNOWN_THIRD_PARTY_ERRORS tolerates — delete the entry",
  ).toBe(true);
});

test("an unknown path lands on the not-found page rather than a blank host error", async ({
  page,
}) => {
  const response = await page.goto("/no/such/page");
  // A static host answers 404 with the export's own `404.html`. What matters is that the body is the
  // application's not-found page, not the host's default — the status code is the host's business.
  expect(await page.locator("body").innerText()).not.toBe("");
  expect(response).not.toBeNull();
});
