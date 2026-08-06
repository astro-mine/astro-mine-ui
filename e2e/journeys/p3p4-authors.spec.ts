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
//
// P3 also gets the one thing the world author can actually *see* here: a published world's terrain
// on the artifact's own page (ui#51). Those two tests say why they have to live in this lane — and
// the second one is an expected failure that found a defect older than the branch it arrived on.

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

// --- the world author's terrain, in two tests, and the split is the finding ------------------------
//
// **These exist because a scaffold used to be the only thing covering this** (ui#51). A globe reached
// a panel in exactly one place — `/dev/inspector`, hand-written subjects, deleted at its stated
// expiry by `ui#21` — and when it went, `/registry/artifact` had been passing no `globe` slot the
// whole time and a `world` artifact rendered "no globe was supplied" where the globe belongs. Nothing
// red went red. The component lane runs in jsdom, where Cesium cannot mount and the empty branch is
// the *correct* expectation; the `degraded` lane has no backend, so no world resolves at all. This
// lane is the only one with both a browser and a world in it.
//
// It is two tests because the first run of the second one **found a defect that predates ui#51**:
// the Cesium chunk in the built export was not parseable JavaScript, so no globe mounted anywhere in
// the bundle this repository ships (astro-mine-ui#55, since fixed). The split outlived its cause and
// is kept, because the two assert different things: the first is about the *page* passing a slot and
// needs no Cesium at all, the second is about the *chunk* loading. Keeping them apart means a broken
// bundler cannot be mistaken for a broken page.

/** Where the seeded world artifact lives, as a URL a reader could send to a colleague. */
function worldArtifactUrl(): string {
  const [name, version] = seed().hub.worlds[0]!.split(":");
  return `/registry/artifact?name=${encodeURIComponent(name!)}&version=${version}`;
}

test("supplies a world artifact's terrain from the artifact's own page", async ({ page }) => {
  await page.goto(worldArtifactUrl());
  await expect(page.locator("h1")).toBeVisible();

  // The registry resolved a panel for `world_provider`, and the panel is not reporting that the
  // page handed it nothing. The second assertion is the ui#51 defect, named.
  await expect(page.getByRole("heading", { name: "World", exact: true })).toBeVisible();
  await expect(page.getByText("No terrain rendered")).toHaveCount(0);

  // Behind a control on purpose: drawing asks the backend to pull the bundle out of Hub and
  // re-verify it, and a reader who came for a digest must not trigger that by arriving.
  const draw = page.getByRole("button", { name: "Draw the terrain" });
  await expect(draw).toBeVisible();

  // **What proves the slot is filled and wired to *this* artifact.** The request is the page's own
  // — `WorldTerrain` is what issues it — and it names the artifact the page is showing. Everything
  // downstream of it belongs to Cesium, and Cesium is the next test's subject rather than this
  // one's: a lane that mounts a 3D scene to prove a page passed a prop is a lane that goes red for
  // reasons that have nothing to do with the page.
  const resolved = page.waitForResponse(
    (response) =>
      response.url().includes("/studio/worlds/") &&
      !response.url().includes("/studio/worlds/files/") &&
      response.ok(),
    { timeout: 60_000 },
  );
  await draw.click();
  const world = await resolved;
  expect(decodeURIComponent(new URL(world.url()).pathname)).toContain(seed().hub.worlds[0]!);

  // Still not the empty state after the round trip — the panel is drawing, or saying why it cannot.
  await expect(page.getByText("No terrain rendered")).toHaveCount(0);
});

// **This was `test.fail` for one commit, and the `.fail` came off here** (astro-mine-ui#55).
//
// It arrived with `ui#51` asserting a gap: `next build` emitted Cesium into a 4 MB chunk that was
// **not parseable JavaScript** — an embedded binary inside a template literal with octal escapes —
// so `next/dynamic` never resolved and the loading fallback was permanent. Every 3D surface in the
// shipped bundle was dead, and it was invisible because minification only runs in a production build.
// The build now repairs the minifier's output and `pnpm check:chunks` fails if a chunk ever stops
// parsing, so this asserts the behaviour rather than the gap.
//
// With `.fail` gone it earns its second subject: it is the only end-to-end cover for the API-base
// join in `data/apiUrl.ts`, because the manifest URL is a path on the API and this page is served
// from its own origin.
//
// **Every wait carries its own timeout**, which is load-bearing rather than tidy: an implicit one is
// the project's ten-minute budget, so a missing button used to burn the whole of it and report a
// timeout instead of the assertion that actually failed.
test("mounts the globe once the world resolves", async ({ page }) => {
  await page.goto(worldArtifactUrl());
  await page.getByRole("button", { name: "Draw the terrain" }).click({ timeout: 30_000 });

  // The manifest is fetched from the API rather than from the origin serving this page: the response
  // carries an API-rooted path and the export is served from its own host — `:4174` against an API
  // on `:8000`. Unjoined it 404s and the scene reports "terrain unavailable", which reads as a bad
  // world bundle rather than as a URL built against the wrong host.
  await page.waitForResponse(
    (response) => response.url().includes("/studio/worlds/files/") && response.ok(),
    { timeout: 30_000 },
  );

  // The scene's own element, which `GlobeScene` renders before and regardless of its `Viewer` — and
  // **not pixels**: a Cesium canvas in a headless browser proves WebGL initialised, which is not
  // what this journey is about and is the most reliable way to buy a flaky test. The rule p1 and p5
  // already state.
  await expect(page.getByTestId("globe-scene")).toBeVisible({ timeout: 30_000 });
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
