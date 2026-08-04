import { expect, type Locator, type Page } from "@playwright/test";

// Choosing a scenario, which every leaderboard journey has to do first (ui#20).
//
// **`/bench/leaderboard` with no `?scenario=` shows "No scenario chosen", and that is the design
// rather than a gap.** A deployment publishes several scenarios and none of them is canonical, so
// the page declines to pick one on the reader's behalf — `ui#12` gives it a picker and says so in
// the empty state ("Pick a scenario above, or open a leaderboard by URL with ?scenario=…").
//
// So the journeys click the picker, because that is what a person does. Navigating straight to
// `?scenario=…` would skip the one control standing between a reader and the board — and if it ever
// stopped populating, every leaderboard journey would keep passing.

/** Pick `scenarioId` from the picker and return the board's table, once it has rendered. */
export async function chooseScenario(page: Page, scenarioId: string): Promise<Locator> {
  const picker = page.getByRole("combobox", { name: /Scenario/ });
  // The picker is fed by its own read of the zoo, so it is empty until that answers. It renders
  // nothing at all when the list is empty — which would mean a deployment with no scenarios, and is
  // worth failing on here rather than three assertions later.
  await expect(picker).toBeVisible({ timeout: 30_000 });
  await picker.click();
  await page.getByRole("option", { name: scenarioId }).click();

  const table = page.getByRole("table", { name: /Leaderboard for/ });
  await expect(table).toBeVisible({ timeout: 30_000 });
  return table;
}
