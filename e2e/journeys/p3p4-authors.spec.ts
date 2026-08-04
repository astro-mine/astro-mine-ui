import { expect, test } from "@playwright/test";

import { policyName, seed } from "../fixture/seed";

// P3 / P4 — THE WORLD AUTHOR AND THE ASSET AUTHOR (ui#20; UC-G2, UC-G3).
//
// These two personas author things the front end has no page for — a world, a robot — and the
// application says so on their persona cards rather than sending them to a button that was never
// built. What they *do* come here for is the other half of authoring: finding what is already in
// the commons, reading its identity, and pinning a version to a digest.
//
// Three rules from `ui.md` §7 are under test, and each has a way of failing that looks fine:
//
//   - **rule 4, the digest is the identity.** A tag is a query. A page that shows a version and
//     hides the content address has told a reader something unstable and called it identity.
//   - **rule 6, verification is claimed only where it happened.** Attestations *present in a
//     registry* are not a verified supply chain, and the words must differ.
//   - and the reason the attestations are worth asserting at all: a deployment with no registry
//     wired reports none, which is indistinguishable from an unsigned artifact (astro-mine-api#16).

test("finds an artifact by search and reads its identity", async ({ page }) => {
  const { hub } = seed();

  await page.goto("/registry");
  await expect(page.getByRole("heading", { level: 1, name: "Registry" })).toBeVisible();

  // Search is open — nothing prompts for an account (UC-G2, CX-LOCAL). Named rather than "the first
  // textbox": the form also carries namespace and licence facets, and a positional selector would
  // silently start filling one of those the day a field is added above it.
  await page.getByRole("textbox", { name: /Search the catalog/ }).fill("rover");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  // The seeded rover, found by a word in its manifest rather than by its full reference — which is
  // what a person types.
  const hit = page.getByText(hub.assets[0]!, { exact: false }).first();
  await expect(hit).toBeVisible({ timeout: 30_000 });

  // ...and a result leads somewhere. Which artifact the first row is depends on the ranking, and
  // that is the search's business; what this journey needs is that opening one works.
  //
  // Scoped to the results table, because the page's *first* link is the shell's "Skip to content"
  // — which is correct, is the first thing in the document for a keyboard user, and would make an
  // unscoped selector click the accessibility affordance instead of a search result.
  const results = page.getByRole("table", { name: /Search results for/ });
  await expect(results).toBeVisible();
  await results.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/registry\/artifact\/?\?/);

  // **The digest, in full.** `Digest` renders it expandable and copyable precisely so a reader can
  // paste it; a truncated-only display would make the identity unusable at the moment it matters.
  await expect(page.getByText(/sha256:[0-9a-f]{16,}/).first()).toBeVisible();
});

test("reads what evidence the registry holds, without calling it a verified supply chain", async ({
  page,
}) => {
  const { hub } = seed();
  const [name, version] = hub.policies[0]!.split(":");

  await page.goto(`/registry/artifact?name=${encodeURIComponent(name)}&version=${version}`);
  await expect(page.locator("h1")).toBeVisible();

  // Named exactly: the page carries two headings containing the word — the panel's own, and the
  // section it sits in — and a loose match resolves to both.
  await expect(page.getByRole("heading", { name: "Attestations held" })).toBeVisible();

  // All three are attached by `HubClient.publish` and surfaced only because the deployment's Hub
  // router has a registry. Before api#16 this section rendered "No attestations are held for this
  // artifact" on content that carried all of them — the worst possible failure for rule 6, because
  // it is the honest *empty* state telling a lie.
  for (const type of ["signature", "slsa", "sbom"]) {
    await expect(page.getByText(new RegExp(type, "i")).first()).toBeVisible();
  }

  // The words that keep the claim honest: these are types the registry *holds*, not a verdict.
  await expect(page.getByText(/types this registry holds/i)).toBeVisible();
});

test("resolves a version specifier to a pinned digest", async ({ page }) => {
  await page.goto("/registry/resolve");
  await expect(page.locator("h1")).toBeVisible();

  await page.getByRole("textbox", { name: /Name/ }).fill(policyName());
  await page.getByRole("textbox", { name: /Version specifier/ }).fill(">=0.1.0");
  await page.getByRole("button", { name: /Resolve/ }).click();

  // The seeder publishes the policy twice for exactly this: a range with one version in it resolves
  // trivially and proves nothing. `0.2.0` is the answer only if the resolver actually chose.
  await expect(page.getByText("0.2.0").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/sha256:[0-9a-f]{16,}/).first()).toBeVisible();
});
