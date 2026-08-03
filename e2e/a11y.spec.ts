import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { exportedRoutes } from "./routes";

// THE ROUTE-LEVEL ACCESSIBILITY SWEEP (ui#8; ui.md §7 rule 7, §8).
//
// **This is the lane that can run `color-contrast`, and that is why it exists.** The component lane
// disables that rule because jsdom has no layout or paint engine — it cannot sample a pixel, so it
// reports "incomplete" rather than a finding. A real browser can, and here it does, over the whole
// composed page rather than over a component in isolation. `packages/ui`'s contrast test measures
// the theme's *declared* pairings; this measures what a route actually rendered, which is a
// different question and catches a different mistake.
//
// **In both colour schemes**, because a role declared in one and forgotten in the other typechecks,
// renders, and is broken in exactly half of deployments.
//
// **Runnable, not a gate — yet.** `ui#8` ships this so Wave 30 turns it into a merge gate rather
// than writing it. Two things must happen first: the pages have to exist (a placeholder route
// proves nothing), and any violation it finds has to be fixed rather than baselined.

const routes = exportedRoutes();

test("the export has routes to sweep", () => {
  expect(routes.length).toBeGreaterThan(15);
});

for (const route of routes) {
  for (const scheme of ["light", "dark"] as const) {
    test(`${route} is axe-clean in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        // The tags the platform commits to. Deliberately not `best-practice`: it is advisory, it
        // changes between axe releases, and a lane that goes red because a linter grew an opinion
        // is a lane people learn to re-run rather than read.
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const described = results.violations.map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.help}\n` +
          violation.nodes.map((node) => `    ${node.html}`).join("\n"),
      );

      expect(described.join("\n"), `${route} in ${scheme}`).toBe("");
    });
  }
}
