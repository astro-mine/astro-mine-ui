import { expect, test } from "@playwright/test";

import { seed } from "../fixture/seed";

// P5 — THE MISSION DESIGNER (ui#20; UC-F1 → UC-F6).
//
// The full design loop: author an objective, compose candidates, run a study, read the front,
// inspect the swarm on a world, publish the campaign. Six use cases that had **no UI at all** before
// Wave 29 — the gap report's largest single hole — and the only journey in this suite that is
// mostly *writes*.
//
// **One test, not six.** Every step depends on the last, and the dependency is not incidental: the
// session holds the captured objective and the launched study in the tab, deliberately ("a
// comparison is computed from the study document itself, so they live as long as the tab does").
// Six tests would each have to re-drive the previous five or share state across files, and both are
// worse than one long test that reads like the journey it is.
//
// **The stand-in rule is asserted throughout** (`ui.md` §7 rule 1). The seeded deployment scores
// with the reference fixture and its world carries no terrain, so almost every number and surface
// here is a stand-in. Each one has to say so *in place*. A design tool that let a reader mistake a
// fixture for a simulation is worse than one that refuses to draw.

test("authors an objective, runs a study, inspects a candidate and tries to publish", async ({
  page,
}) => {
  const { hub } = seed();

  // --- UC-F1: state the goal --------------------------------------------------------------------

  await page.goto("/design/new");
  await expect(page.getByRole("heading", { level: 1, name: "New study" })).toBeVisible();

  // No JSON is typed anywhere: the objective is captured through a structured form and validated
  // against Core by the backend. That is `ui#15`'s criterion and it is why this fills fields rather
  // than pasting a document.
  await page.getByRole("textbox", { name: /^Name/ }).fill("Lunar polar water ice");
  await page.getByRole("textbox", { name: /^Author/ }).fill("journey-suite");
  await page.getByRole("textbox", { name: /Region name/ }).fill("Shackleton rim");

  // **What the campaign is *for*** — the target product. The form refuses to send without it, and
  // that refusal is the feature: "a study built on an objective Core would refuse is minutes of
  // compute spent on a question that cannot be answered". The values are the anchor scenario's own.
  await page.getByRole("textbox", { name: /^Metric/ }).fill("water_production_rate");
  await page.getByRole("textbox", { name: /^Unit/ }).fill("kg/day");
  await page.getByRole("spinbutton", { name: /^Target/ }).fill("40");
  await page.getByRole("spinbutton", { name: /^Tolerance/ }).fill("60");

  // --- UC-F2: compose the candidates ------------------------------------------------------------
  //
  // The robot comes from the **catalog**, so the candidate carries a real digest rather than a name
  // somebody typed. The menu is the seeded registry's, which is the point: an empty menu here would
  // mean the Studio surface has no registry wired, and the form would be uncomposable.
  await page.getByRole("textbox", { name: /Candidate name/ }).fill("Four rovers");
  const robot = page.getByRole("combobox", { name: /Robot/ });
  await expect(robot).toBeEnabled({ timeout: 30_000 });
  await robot.click();
  // Wait for the menu to have *anything* in it before naming one. The Select is enabled before its
  // catalog read resolves, so clicking can open an empty listbox — and waiting for a named option
  // that will never appear inside an empty menu hangs until the test timeout and then reports
  // "locator not found", which says nothing about the catalog being the thing that did not arrive.
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole("option", { name: hub.assets[0]! }).click();
  await page.getByRole("spinbutton", { name: /^Count/ }).fill("4");

  await page.getByRole("button", { name: /Capture the objective/ }).click();
  await expect(page.getByText("Objective captured")).toBeVisible({ timeout: 60_000 });

  // --- UC-F3: run the study ---------------------------------------------------------------------

  await page.getByRole("link", { name: "Run the study" }).click();
  await expect(page).toHaveURL(/\/design\/?$/);

  await page.getByRole("button", { name: "Launch the study" }).click();

  // **The study, not a queue.** `POST /studio/studies` runs the batch through the local dispatcher
  // inline and returns a comparison when the jobs succeeded; the asynchronous path — jobs with no
  // study, and a page that says so rather than inventing one — belongs to a deployment with a real
  // cluster behind it. Against this one the synchronous answer is the expected answer, so it is
  // asserted rather than tolerated: a journey that accepted either outcome would pass just as
  // happily on a backend that silently stopped evaluating anything.
  await expect(page.getByText(/there is no comparison yet/)).toHaveCount(0, { timeout: 180_000 });
  const comparison = page.getByRole("link", { name: "Open the comparison" });
  await expect(comparison.nth(1)).toBeVisible({ timeout: 180_000 }); // [0] is the seeded example

  // --- UC-F4: read the front --------------------------------------------------------------------

  await comparison.nth(1).click();
  await expect(page).toHaveURL(/\/design\/study\/?\?/);

  // **The stand-in says so, in place.** The seeded deployment evaluates with the reference fixture,
  // so no physics was run — and a Pareto front drawn from fixture numbers that did not announce
  // itself is exactly the mistake `ui.md` §7 rule 1 exists to prevent.
  await expect(page.getByText(/stand-in|fixture/i).first()).toBeVisible({ timeout: 60_000 });

  // --- UC-F5: the world, and the swarm on it ----------------------------------------------------
  //
  // The world menu is the seeded registry's. Selecting one materializes the bundle server-side and
  // hands back its tileset anchor — the one position in a world bundle that means "the terrain is
  // here" — which is what lets a design-time swarm be laid out at all.
  //
  // Asserted on the world resolving and its anchor arriving, **not** on pixels: a Cesium scene in a
  // headless browser proves WebGL initialised, which is not what this journey is about and is the
  // most reliable way to buy a flaky test.
  await expect(page.getByRole("heading", { name: /World and 3D inspection/ })).toBeVisible();
  const world = page.getByRole("combobox", { name: "World" });
  await expect(world).toBeEnabled({ timeout: 60_000 });
  await world.click();
  await page.getByRole("option", { name: hub.worlds[0]! }).click();

  // The world resolved, and its digest is on the page — the identity, not the tag.
  await expect(page.getByText(/World digest/i)).toBeVisible({ timeout: 60_000 });

  // The bundle is a stand-in with a real anchor and no terrain, and it says which it is rather than
  // showing an empty globe that reads as a failed load.
  await expect(page.getByText(/stand-in/i).first()).toBeVisible();

  // --- UC-F6: publish the campaign — asserted as the gap it currently is (`ui#48`) ---------------
  //
  // **Published from the study, not from `/design/campaign`.** That route is keyed on `?ref=…` and
  // *opens* a published campaign; publishing is the step at the end of reading a front, which is
  // where the choice being published was made. It also has to happen here, in this test: the design
  // session lives in the tab, so a separate test would arrive with nothing composed.
  //
  // And it fails today. The form sends `phases: []`, `Campaign.phases` requires at least one item,
  // so the request raises inside the handler and returns a 500 rather than a problem document
  // (`astro-mine-api#21`). Neither is this issue's to fix — what a published campaign's default
  // phasing *is* belongs to `ui#18`.
  //
  // So this asserts what happens today rather than skipping the use case, and **it fails when
  // either defect is fixed**. A gap nobody is forced to revisit is a gap that becomes the design.
  const candidate = page.getByRole("combobox", { name: /Candidate/ });
  await expect(candidate).toBeEnabled({ timeout: 30_000 });
  await candidate.click();
  await page.getByRole("option").first().click();
  await page.getByRole("textbox", { name: /Campaign name/ }).fill(`journey-suite-${Date.now()}`);

  await page.getByRole("button", { name: /Publish the campaign/ }).click();

  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Published")).toHaveCount(0);
});

test("opens a published campaign by reference", async ({ page }) => {
  const { studio } = seed();
  test.skip(studio.campaign === null, "the seeder wired no publisher, so there is none to open");

  // The example campaign the seeder published — a *different* session from the one that wrote it,
  // which is the whole value of publishing: a design outlives the tab it was made in.
  await page.goto(`/design/campaign?ref=${encodeURIComponent(studio.campaign!)}`);
  await expect(page.locator("h1")).toBeVisible();

  // The campaign's *name*, which is what the page titles itself with — the version rides in the
  // reference and the digest is the identity, so neither is repeated in the heading.
  const [name] = studio.campaign!.split(":");
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible({ timeout: 60_000 });

  // ...and it is labelled as the example it is, never passed off as the reader's own result — the
  // honesty rule `astro_mine.studio.seed` was written around.
  await expect(page.getByText(/example/i).first()).toBeVisible();
});
