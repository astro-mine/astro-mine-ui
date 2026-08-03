// THE HARNESS, PROVEN (ui#8).
//
// `ui#8`'s acceptance criteria include two claims that are worth nothing unless something runs them:
//
//   - "A component test can mount any page with a faked API in under ten lines."
//   - "The a11y helper fails on a real violation, proven with a deliberately-broken fixture."
//
// Both are asserted here rather than described. The first is asserted *by counting the lines of the
// test that does it*, which sounds like a gimmick and is not: the criterion is about the cost of
// writing the next test, and the only honest measure of that cost is a real one.
//
// No page fetches yet — Wave 29 builds those — so the subject is a small component that calls the
// generated client exactly as a page will. That is the harness under test, not the component.
//
// **Writing it proved the fake's own promise**, which is worth recording because it happened rather
// than because it reads well: the first draft passed `{ q: "excavator" }` and a five-field hit, and
// `tsc` rejected both — the parameter is `text`, and a `SearchHit` has `deprecated` and `yanked`.
// "A fake that can drift from the real API is a test that lies"; this one cannot drift, because its
// reply type *is* the document's response type and a stale fixture fails to compile.

import { createApiClient } from "@astro-mine/api-client";
import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, renderLight } from "@astro-mine/ui/testing";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

const { api, use } = mockApi();

/** One search hit, with the fields a test does not care about filled in. */
const hit = (name: string) => ({
  reference: `${name}:1.0.0`,
  digest: "sha256:a",
  name,
  version: "1.0.0",
  score: 1,
  deprecated: false,
  yanked: false,
});

/** What a Wave 29 page will do, with everything that is not the harness removed. */
function ArtifactCount() {
  const [names, setNames] = useState<string[] | null>(null);
  useEffect(() => {
    createApiClient({ baseUrl: "https://api.test" })
      .hubSearch({ query: { text: "excavator" } })
      .then((hits) => setNames(hits.map((hit) => hit.name)));
  }, []);
  return <p>{names === null ? "Loading…" : names.join(", ")}</p>;
}

describe("mounting a component against the faked API", () => {
  // ---- the ten lines begin ----
  it("renders what the registry returned", async () => {
    use(api.hubSearch({ body: [hit("excavator")] }));
    renderLight(<ArtifactCount />);
    expect(await screen.findByText("excavator")).toBeInTheDocument();
  });
  // ---- and end ----

  it("costs under ten lines, counted rather than claimed", () => {
    // Read this file and measure the block above. A criterion phrased as a number is a criterion
    // that can be checked, and a comment claiming "under ten lines" is one that rots the first time
    // somebody adds a provider.
    //
    // **What is counted is the ceremony, not the data.** The `hit()` builder sits outside the block
    // on purpose: how many fields a fixture needs is a property of the API's schema, not of this
    // harness, and folding it in would measure the wrong thing — a wider response type would
    // "fail" a criterion about how hard it is to mount a page. What the block holds is the whole
    // cost the harness imposes: stub, render, assert.
    const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
    const body = source.split("---- the ten lines begin ----")[1].split("---- and end ----")[0];
    const lines = body.split("\n").filter((line) => line.trim() !== "").length;

    expect(lines, `mounting a page against the fake took ${lines} lines`).toBeLessThanOrEqual(10);
  });

  it("refuses a request the test did not stub", async () => {
    // The property that makes the fake trustworthy. An un-stubbed call must not reach the network
    // and must not quietly resolve — it is a request the test did not think about.
    const client = createApiClient({ baseUrl: "https://api.test" });
    await expect(
      client.hubGetArtifact({ path: { name: "nope", version: "1.0.0" } }),
    ).rejects.toThrow();
  });
});

describe("the accessibility helper", () => {
  it("passes a clean tree", async () => {
    const { container } = renderLight(
      <main>
        <h1>A heading</h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixture, not a page: `next/image`
            needs the framework's loader and this tree is handed straight to axe. */}
        <img src="/x.png" alt="A described image" />
      </main>,
    );
    await expectNoA11yViolations(container);
  });

  it("fails on a deliberately-broken fixture, naming the rule", async () => {
    // The proof the criterion asks for. A helper nobody has watched reject anything is a helper
    // nobody should trust — the same argument every other gate in this repository carries.
    //
    // **ESLint flags this too, and the suppressions below are the interesting part.** `jsx-a11y`
    // catches the missing `alt` statically, which is a second gate agreeing with the first — so the
    // fixture is doubly proven broken, and the exemption has to be narrow and reasoned rather than a
    // file-level disable that would also blind the rule to a real page.
    const { container } = renderLight(
      <main>
        {/* An image with no alt text: axe's `image-alt`, one of the least ambiguous violations
            there is, and one jsdom can see without layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- BROKEN ON
            PURPOSE. This is the fixture that proves `expectNoA11yViolations` rejects; giving it an
            `alt` would delete the test while leaving it green. */}
        <img src="/x.png" />
      </main>,
    );

    await expect(expectNoA11yViolations(container)).rejects.toThrow(/image-alt/);
  });
});
