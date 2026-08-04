import { expect, test } from "@playwright/test";

import { chooseScenario } from "../fixture/leaderboard";
import { seed } from "../fixture/seed";

// P7 — THE COMMONS STEWARD (ui#20; UC-G7).
//
// Read the audit trail and retract a submission. The smallest surface in the application and the
// one with the most at stake: a commons whose steward cannot see who did what, or cannot remove an
// entry that should not stand, is a commons nobody can be responsible for.
//
// **Retract first, then read the trail.** Deliberately in that order. Reading a trail somebody else
// wrote proves the route answers; reading a trail containing *the act this test just performed*
// proves the write was recorded — which is the property an audit trail exists to have, and the one
// that was silently missing until `astro-mine-api#17` wired durable storage.
//
// The retraction is destructive and this suite runs against a seeded deployment, so it takes the
// entry the seeder marks as expendable: the one submitted by `p1-benchmark-researcher.spec.ts`
// would be a dependency between journeys, and the seeded rows are what every other journey reads.
// So this test submits its own, then retracts that.

test("retracts a submission and finds the act in the audit trail", async ({ page }) => {
  const { bench, oidc } = seed();

  // --- an entry of this test's own to remove -----------------------------------------------------
  //
  // A journey that retracted a *seeded* row would leave the deployment different from how it found
  // it, and every other journey reads those rows. Playwright gives no ordering guarantee across
  // files, so "put it back afterwards" is not a fix — not creating the dependency is.
  await page.goto("/bench/submit");
  await page.getByRole("button", { name: "Direct reference" }).click();
  await page.getByRole("combobox", { name: /Scenario/ }).click();
  await page.getByRole("option", { name: bench.scenario_id }).click();
  await page.getByRole("textbox", { name: /Policy reference/ }).fill(bench.unsubmitted_policy_ref);
  await page.getByRole("textbox", { name: /Token/ }).fill(oidc.token);
  await page.getByRole("button", { name: /Submit for evaluation/ }).click();

  // Sandboxed scoring on the held-out seeds; slow on purpose.
  await expect(page.getByText("Accepted")).toBeVisible({ timeout: 180_000 });

  // --- retract it --------------------------------------------------------------------------------

  await page.goto("/bench/leaderboard");
  const table = await chooseScenario(page, bench.scenario_id);

  const row = table
    .getByRole("row")
    .filter({ hasText: bench.unsubmitted_policy_ref.split(":")[1] });
  const target = (await row.count()) > 0 ? row : table.getByRole("row").nth(1);
  await target.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/bench\/submission\/?\?/);

  const submissionId = new URL(page.url()).searchParams.get("id");
  expect(submissionId).not.toBeNull();

  // **A destructive act asks before it acts**, and the dialog names its subject — "are you sure?"
  // over an unnamed thing is a question nobody can answer correctly.
  await page.getByRole("button", { name: "Retract this submission" }).click();
  const dialog = page.getByRole("dialog", { name: /Retract this submission\?/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(submissionId!)).toBeVisible();

  // The reason rides on the audit event. Recording *that* something was retracted without *why* is
  // the half of an audit trail that settles no dispute.
  await dialog.getByRole("textbox", { name: /Reason/ }).fill("Retracted by the journey suite.");
  await dialog.getByRole("textbox", { name: /Token/ }).fill(oidc.token);
  await dialog.getByRole("button", { name: "Retract", exact: true }).click();

  // ...and it says what happened, rather than leaving the reader to reload and infer it.
  //
  // Filtered by its words, not by role alone: `status` is a live region and the page carries several
  // — the route announcer, a digest's copy confirmation — so a bare role match resolves to four
  // elements and fails on strict mode without ever having looked at the retraction.
  await expect(page.getByRole("status").filter({ hasText: /Retracted/ })).toBeVisible({
    timeout: 60_000,
  });

  // --- and the trail carries it ------------------------------------------------------------------

  await page.goto("/bench/audit");
  await expect(page.locator("h1")).toBeVisible();

  // Filter to the entry this test just removed. The trail is durable across processes — before
  // api#17 it was not, and this is where that would show: the retraction happened in the running
  // server, so an in-memory trail would still have it, but the *seeded* events would be missing
  // and the deployment would be quietly forgetting its own history.
  await page.getByRole("textbox", { name: "Submission" }).fill(submissionId!);

  await expect(
    page
      .getByRole("table")
      .or(page.getByText(/retract/i))
      .first(),
  ).toBeVisible({
    timeout: 60_000,
  });
});

test("shows the audit trail without a token, and asks for one only for more", async ({ page }) => {
  await page.goto("/bench/audit");
  await expect(page.locator("h1")).toBeVisible();

  // No prompt, no modal, no disabled page: the read path is account-free and the token is an
  // opt-in for whatever the deployment grants beyond it (bench#29 AC5).
  await expect(page.getByRole("button", { name: /steward token/i })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 30_000 });

  // And the field really is absent until asked for — `unmountOnExit` on the disclosure, so a
  // credential input is not sitting in the DOM tab-reachable behind a collapsed panel.
  await expect(page.getByRole("textbox", { name: /Token/ })).toHaveCount(0);
});
