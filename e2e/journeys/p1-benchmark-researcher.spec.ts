import { expect, test } from "@playwright/test";

import { chooseScenario } from "../fixture/leaderboard";
import { seed } from "../fixture/seed";

// P1 — THE BENCHMARK RESEARCHER (ui#20; UC-G5, UC-B6, UC-G4).
//
// Find the leaderboard, read a scorecard, open its provenance, play the replay, submit a policy.
// The longest read path in the application and the one the commons is for: a researcher who cannot
// get from a number to what produced it has a leaderboard they have no reason to believe.
//
// **Navigated, not deep-linked.** Every step here starts from where the previous one left the
// reader. A journey that jumped straight to `/bench/submission?id=…` would test the page and not
// the path, and the path is what a person has.

test("from the board to a scorecard, its provenance and its replay", async ({ page }) => {
  const { bench } = seed();

  await page.goto("/bench/leaderboard");
  const table = await chooseScenario(page, bench.scenario_id);

  // Every seeded entry is on the board — identified by its **submission id**, which is what the
  // row carries. The `method` a submitter names is on the record and in no column; that is a
  // product observation and not this test's to fix, so the assertion uses what a reader can see.
  // The cell shows a 20-character prefix, because a content address is 71 characters and a table
  // is not the place to read one in full.
  for (const submission of bench.submissions) {
    await expect(table.getByText(submission.submission_id.slice(0, 20))).toBeVisible();
  }

  // The submission link in the first row — the id is a content address, so the cell shows a prefix
  // and the link carries the whole thing.
  const firstLink = table.getByRole("link").first();
  const submissionId = await firstLink.textContent();
  await firstLink.click();

  await expect(page).toHaveURL(/\/bench\/submission\/?\?/);
  await expect(page.locator("h1")).toBeVisible();

  // **The scorecard.** Every metric with its uncertainty — the thing the board's single primary
  // column cannot show — over the held-out seeds, which is the number that counts.
  await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /held-out seeds/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Every metric on this scorecard" })).toBeVisible();
  expect(submissionId?.trim().length).toBeGreaterThan(0);

  // **Provenance before interpretation** (`ui.md` §7 rule 5). What matters is that the section is
  // present and *answers*: either the lineage, or — as on every seeded entry today — an explanation
  // of why there is none.
  //
  // The seeded board is entirely `policy_ref` intake, which records no bundle by design; the
  // Hub-digest path that does record one cannot currently accept an artifact the platform
  // publishes (astro-mine-platform#14). So the honest end state is the explanation, and this
  // asserts the page gives one rather than a spinner or an empty panel. **When the platform issue
  // is fixed and the seeder submits by digest, this assertion is the one to update.**
  const provenance = page.getByRole("heading", { name: "Provenance" });
  await expect(provenance).toBeVisible();
  await expect(page.getByText(/No provenance bundle is stored for this submission/)).toBeVisible();

  // **The replay.** Attached to every seeded entry, so whichever row was opened has one.
  await expect(page.getByRole("heading", { name: /Episode replay/i })).toBeVisible();
  await expect(page.getByText(/Reading the replay manifest/)).toHaveCount(0, { timeout: 15_000 });

  // The manifest decoded: an episode with a sim-time span and agents in it. Asserted through the
  // summary rather than by mounting the globe — a Cesium scene in a headless browser proves that
  // WebGL initialised, which is not what this journey is about.
  await expect(page.getByText(/frames?/i).first()).toBeVisible();
});

test("submits a policy, and the board grows by it", async ({ page }) => {
  const { bench } = seed();

  await page.goto("/bench/submit");
  await expect(page.locator("h1")).toBeVisible();

  // **Looking is open; entering is not.** The form says so before it asks for anything, which is
  // `ui#14`'s honesty criterion — a reader must not discover the account requirement by failing.
  await expect(page.getByText(/Looking is open; entering is not/)).toBeVisible();

  await page.getByRole("button", { name: "Direct reference" }).click();

  await page.getByRole("combobox", { name: /Scenario/ }).click();
  await page.getByRole("option", { name: bench.scenario_id }).click();

  // The policy the seeder deliberately left off the board. Re-submitting one already on it would
  // return the existing entry — submission ids are content addresses, so that is a *success* — and
  // this test would pass without the write path ever having worked.
  await page.getByRole("textbox", { name: /Policy reference/ }).fill(bench.unsubmitted_policy_ref);
  await page.getByRole("textbox", { name: /Token/ }).fill(seed().oidc.token);

  await page.getByRole("button", { name: /Submit for evaluation/ }).click();

  // Scoring runs the policy on the held-out seeds in a sandboxed subprocess, which is slow and is
  // supposed to be: the server runs the submission, the submitter does not report a score.
  await expect(page.getByText("Accepted")).toBeVisible({ timeout: 180_000 });

  // ...and the result is badged for what produced it, exactly as a board row would be.
  await expect(page.getByText(/Fixture/i).first()).toBeVisible();

  await page.goto("/bench/leaderboard");
  const table = await chooseScenario(page, bench.scenario_id);
  await expect(table.getByRole("row")).toHaveCount(bench.submissions.length + 2); // + header + new
});

test("refuses the submission when no token is given, and says why", async ({ page }) => {
  const { bench } = seed();

  await page.goto("/bench/submit");
  await page.getByRole("button", { name: "Direct reference" }).click();
  await page.getByRole("combobox", { name: /Scenario/ }).click();
  await page.getByRole("option", { name: bench.scenario_id }).click();
  await page.getByRole("textbox", { name: /Policy reference/ }).fill("does.not:matter");

  await page.getByRole("button", { name: /Submit for evaluation/ }).click();

  // A refusal a reader can act on. The deployment fails closed (bench#29) and the page renders the
  // problem document's own words rather than a bare status code — which is the whole point of the
  // one error contract `api#4` converged on.
  //
  // Filtered rather than `.first()`: Next's route announcer is also `role="alert"` and is always in
  // the document, so an unfiltered match resolves to two elements and would pass on an empty one.
  const refusal = page.getByRole("alert").filter({ hasText: /\S/ });
  await expect(refusal).toBeVisible({ timeout: 30_000 });
  await expect(refusal).toContainText(/token|authenticat/i);
});
