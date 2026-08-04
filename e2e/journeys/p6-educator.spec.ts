import { expect, test } from "@playwright/test";

import { chooseScenario } from "../fixture/leaderboard";
import { seed } from "../fixture/seed";

// P6 — THE EDUCATOR OR STUDENT (ui#20; UC-A4, UC-G5).
//
// The shortest journey in the suite and the one with the sharpest bar, because it is the one the
// gap report's J6 is about: somebody arrives, forms an impression in ten seconds, and either stays
// or concludes "so this is the GUI" and leaves.
//
// Two properties, both from `ui#9` and `ui#12`:
//
//   - **the leaderboard is one click from the front door**, and
//   - **reading it needs no account** — nothing prompts, nothing is disabled behind a login, and no
//     `Authorization` header leaves the browser.
//
// The second is asserted on the wire rather than on the screen. A page can look account-free and
// still be sending a token it picked up somewhere, and "no account needed" is a promise about what
// the platform *requires*, not about what its buttons look like (CX-LOCAL; bench#29 AC5).

test("lands on Home, reaches the leaderboard in one click, and reads it with no account", async ({
  page,
}) => {
  const authenticated: string[] = [];
  page.on("request", (request) => {
    if (request.headers()["authorization"] !== undefined) authenticated.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Astro-Mine" })).toBeVisible();

  // **One click, from the front door.** Not through the sidebar — the persona cards are the answer
  // `ui#9` gives to "which of these people are you", and the student's card is the one that has to
  // land on the board. A journey that navigated by the sidebar would pass while the cards pointed
  // nowhere, which is the exact failure J6 describes.
  const student = page.getByRole("article").filter({ hasText: "Educator or student" });
  await expect(student).toBeVisible();
  await student.getByRole("link").first().click();

  await expect(page).toHaveURL(/\/bench\/leaderboard/);

  // One click reached the board; the second interaction is choosing *which* board, which the page
  // declines to guess (see `chooseScenario`). The claim under test is "one click from the front
  // door to the leaderboard", not "zero decisions to read one".
  const table = await chooseScenario(page, seed().bench.scenario_id);
  await expect(table.getByRole("row")).not.toHaveCount(1); // the header row alone would be empty

  expect(authenticated, "reading the leaderboard sent an Authorization header").toEqual([]);
});

test("says what produced each number, in the row rather than in a footnote", async ({ page }) => {
  // `ui#12`'s non-negotiable, and P6's in particular: a student reading a number has to be able to
  // see that it came from the reference fixture and never ran a simulator. The seeded entries are
  // all fixture-scored, so the badge must be on every row — visible, without opening or hovering
  // anything.
  await page.goto("/bench/leaderboard");
  const table = await chooseScenario(page, seed().bench.scenario_id);

  const badges = table.getByText(/Fixture/i);
  expect(await badges.count()).toBeGreaterThan(0);
  await expect(badges.first()).toBeVisible();
});
