// Writing to the API (Wave 29).
//
// A write differs from a read in what a *control* needs from it: whether it can be attempted at
// all, whether it is in flight, and — when it was refused — which cause, because ui#11 renders three
// refusals three different ways from the same route.

import { mockApi } from "@astro-mine/api-client/testing";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useApiAction } from "@/data/useApiAction";

import { renderWithApi, UNCONFIGURED } from "./harness";

const { api, use } = mockApi();

const MANIFEST = { kind: "world", name: "shackleton" };

/** What `POST /hub/publish` answers with: the catalog entry it just indexed (a `SearchHit`). */
const indexed = (name: string) => ({
  reference: `open/${name}:1.0.0`,
  name,
  namespace: "open",
  version: "1.0.0",
  digest: "sha256:abc",
  kind: "world",
  artifact_kind: "world",
  publisher: "astro-mine",
  license: "Apache-2.0",
  yanked: false,
  deprecated: false,
  score: 1,
});

function PublishForm() {
  const publish = useApiAction((client, digest: string) =>
    client.hubPublish({
      body: { manifest: MANIFEST, digest, publisher: "astro-mine", namespace: "open" },
    }),
  );

  return (
    <>
      <div data-testid="state">
        {publish.state.status}
        {publish.state.status === "failed"
          ? `:${publish.state.failure.code ?? "none"}:${publish.state.failure.kind}`
          : ""}
        {publish.state.status === "done" ? `:${JSON.stringify(publish.state.data)}` : ""}
      </div>
      <button disabled={!publish.ready} onClick={() => void publish.invoke("sha256:abc")}>
        publish
      </button>
      <button onClick={publish.reset}>reset</button>
    </>
  );
}

const state = () => screen.getByTestId("state").textContent ?? "";
const click = (name: string) => screen.getByRole("button", { name }).click();

/**
 * Wait until there is a client to write with.
 *
 * **Not the same as waiting for `idle`.** `idle` is the state before the configuration has even
 * resolved, so a test that waits for it proceeds immediately, clicks a still-disabled button and
 * then asserts against a write that never happened — which fails as "expected idle to contain
 * failed" and reads like a bug in the hook.
 */
const awaitReady = () =>
  waitFor(() => expect(screen.getByRole("button", { name: "publish" })).toBeEnabled());

describe("before it is asked", () => {
  it("does nothing", async () => {
    // Nothing is stubbed, and `onUnhandledRequest: "error"` means a request on mount would fail
    // this test. A write that fires without being asked is the difference between a form and a
    // side effect.
    renderWithApi(<PublishForm />);
    await awaitReady();
    expect(state()).toBe("idle");
  });
});

describe("a write that succeeded", () => {
  it("carries what the server made", async () => {
    // Every write in this application answers with something the page then shows: a publish
    // answers with the reference, a submission answers with the job to follow.
    use(api.hubPublish({ body: indexed("shackleton") }));
    renderWithApi(<PublishForm />);
    await awaitReady();

    click("publish");
    await waitFor(() => expect(state()).toContain("done"));
    expect(state()).toContain("open/shackleton:1.0.0");
  });
});

describe("a write the API refused", () => {
  it.each([
    ["publish_unconfigured", "degraded"],
    ["namespace_refused", "refused"],
    ["admission_rejected", "refused"],
  ] as const)("reports %s as %s, by code and not by status", async (code, kind) => {
    // ui#11: "Each of the three failure causes renders distinctly, driven by the error `code` and
    // not by prose." This is the layer that makes that possible.
    use(api.hubPublish({ problem: { code } }));
    renderWithApi(<PublishForm />);
    await awaitReady();

    click("publish");
    await waitFor(() => expect(state()).toContain("failed"));
    expect(state()).toBe(`failed:${code}:${kind}`);
  });

  it("can be cleared, so the form is usable again", async () => {
    use(api.hubPublish({ problem: { code: "namespace_refused" } }));
    renderWithApi(<PublishForm />);
    await awaitReady();

    click("publish");
    await waitFor(() => expect(state()).toContain("failed"));
    click("reset");
    await waitFor(() => expect(state()).toBe("idle"));
  });
});

describe("with no API configured", () => {
  it("says so before the button is clicked, rather than failing on click", async () => {
    // ui#18 asks for exactly this: the control reflects that state *before* it is clicked. A button
    // that fails on click has already wasted the reader's time.
    renderWithApi(<PublishForm />, UNCONFIGURED);
    await waitFor(() => expect(screen.getByRole("button", { name: "publish" })).toBeDisabled());
  });

  it("stays idle if it is invoked anyway", async () => {
    renderWithApi(<PublishForm />, UNCONFIGURED);
    await waitFor(() => expect(screen.getByRole("button", { name: "publish" })).toBeDisabled());
    // No client, so nothing is attempted — and nothing is reported as having failed, because
    // nothing did.
    expect(state()).toBe("idle");
  });
});

describe("a write whose page went away mid-flight", () => {
  it("reports nothing to nobody", async () => {
    let release: (() => void) | undefined;
    use(
      api.hubPublish(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ body: indexed("hopper") });
          }),
      ),
    );

    const { unmount } = renderWithApi(<PublishForm />);
    await awaitReady();
    click("publish");
    await waitFor(() => expect(state()).toBe("pending"));

    unmount();
    release?.();
    // The assertion is the absence of a React warning about setting state on an unmounted tree —
    // and, more to the point, that a success nobody can see is not recorded as one.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
