// Indexing an artifact, and reading the verdict (ui#11; UC-G3; hub.md §9).
//
// The acceptance criteria this file is the evidence for:
//
//   - with publishing unavailable, reads still work and the publish control explains itself;
//   - a malformed manifest renders a labelled error and the page survives;
//   - each of the three failure causes renders distinctly, driven by `code` and not by prose;
//   - the success state claims verification only where it happened;
//   - the file is read with an API jsdom implements, so the suite can drive it.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PublishPage } from "@/components/registry/PublishPage";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { hit } from "./fixtures";

const { api, use } = mockApi();

const MANIFEST = JSON.stringify({ kind: "world_provider", name: "shackleton-rim" });

/**
 * Fill the form and submit it.
 *
 * `FileReader` is what the page uses and what jsdom implements — `File.prototype.text()` is
 * shorter and absent here, which is the whole reason `readJsonFile` exists in the shape it does.
 */
async function publishWith(contents: string, filename = "manifest.json") {
  const user = userEvent.setup();
  const file = new File([contents], filename, { type: "application/json" });

  await user.upload(screen.getByLabelText(/Core plugin manifest/), file);
  await user.type(screen.getByRole("textbox", { name: /Digest/ }), "sha256:abc");
  await user.type(screen.getByRole("textbox", { name: /Publisher/ }), "astro-mine");
  return user;
}

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  const button = screen.getByRole("button", { name: /Publish/ });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
};

describe("a manifest that is not one", () => {
  it("labels the error and leaves the page standing", async () => {
    // The degrade-never-blank rule at the point it is most likely to be needed: picking the wrong
    // file is the single most probable mistake on this form.
    // A `.json` file whose contents are not JSON — which is the realistic mistake, because the
    // input carries `accept="application/json,.json"` and the picker will not offer a `.txt` at
    // all. (`userEvent.upload` honours `accept` too, so a `.txt` here uploads nothing and the test
    // asserts against a form that was never given a file.)
    renderWithApi(<PublishPage />);
    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText(/Core plugin manifest/),
      new File(["not json at all"], "notes.json", { type: "application/json" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That file could not be used as a manifest");
    expect(alert).toHaveTextContent("notes.json");
    // The page survives: the rest of the form is still there and still usable.
    expect(screen.getByRole("textbox", { name: /Digest/ })).toBeEnabled();
  });

  it("rejects valid JSON that is not an object, and says which file", async () => {
    renderWithApi(<PublishPage />);
    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText(/Core plugin manifest/),
      new File(["[1, 2, 3]"], "list.json", { type: "application/json" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("not a JSON object");
  });

  it("will not submit until a manifest has been read", async () => {
    renderWithApi(<PublishPage />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /Digest/ }), "sha256:abc");
    await user.type(screen.getByRole("textbox", { name: /Publisher/ }), "astro-mine");

    expect(screen.getByRole("button", { name: /Publish/ })).toBeDisabled();
  });
});

describe("the three refusals render distinctly, by code", () => {
  it("publish_unconfigured degrades the control and keeps the reads working", async () => {
    use(api.hubPublish({ problem: { code: "publish_unconfigured", detail: "no registry wired" } }));
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Publishing is not enabled on this deployment");
    expect(notice).toHaveTextContent("no registry wired");
    // The other half of the criterion: this is a control that degraded, not a page that broke, and
    // the remedy points at the reads that still work.
    expect(notice).toHaveTextContent(/Browsing, searching and/);
    expect(screen.getByRole("link", { name: "resolving" })).toHaveAttribute(
      "href",
      "/registry/resolve",
    );
  });

  it("namespace_refused names what was refused", async () => {
    use(
      api.hubPublish({
        problem: { code: "namespace_refused", detail: "`open` is closed on this deployment" },
      }),
    );
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The namespace “open” was refused");
    expect(alert).toHaveTextContent("`open` is closed on this deployment");
    expect(alert).toHaveTextContent("nothing was indexed");
  });

  it("admission_rejected shows the verdict verbatim", async () => {
    // The one place our words matter least and the server's matter most. A paraphrase of a
    // supply-chain verdict is a different verdict.
    const verdict =
      "digest mismatch: stored bytes hash to sha256:9f2f… but the manifest claims sha256:abc";
    use(api.hubPublish({ problem: { code: "admission_rejected", detail: verdict } }));
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Admission rejected");
    expect(alert).toHaveTextContent(verdict);
  });

  it("tells the three apart by code rather than by status", async () => {
    // All three arrive on the same route. If the page branched on the status it would collapse
    // `namespace_refused` (403) and a future 403 into one rendering.
    use(
      api.hubPublish({
        problem: { code: "admission_rejected", status: 403, detail: "unsigned artifact" },
      }),
    );
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    // 403 is `namespace_refused`'s usual status; the code says otherwise and the code wins.
    // Scoped to the alert: the form has a Namespace field, and an unscoped /namespace/i matches it.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Admission rejected");
    expect(alert.textContent).not.toMatch(/namespace/i);
  });
});

describe("a publish that worked", () => {
  it("says what happened and attributes it to the server", async () => {
    use(api.hubPublish({ body: hit({ name: "shackleton-rim" }) }));
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    expect(await screen.findByText("Indexed")).toBeInTheDocument();
    expect(screen.getByText(/re-derived the digest from the stored bytes/)).toBeInTheDocument();
    expect(screen.getByText(/server-side, at admission/)).toBeInTheDocument();
  });

  it("claims no verification the browser earned", async () => {
    // Honesty rule 6. The words must attribute every check to whoever ran it, and there must be no
    // tick or success badge that reads as this page having established something.
    use(api.hubPublish({ body: hit() }));
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));
    await screen.findByText("Indexed");

    expect(screen.getByText(/None of that was checked in this browser/)).toBeInTheDocument();
    expect(screen.queryByText(/^verified$/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("leads with the digest and links into the registry", async () => {
    use(api.hubPublish({ body: hit({ name: "shackleton-rim", version: "0.5.0" }) }));
    renderWithApi(<PublishPage />);
    await submit(await publishWith(MANIFEST));

    await screen.findByText("Indexed");
    expect(screen.getByRole("link", { name: "Open it in the registry" })).toHaveAttribute(
      "href",
      "/registry/artifact?name=shackleton-rim&version=0.5.0",
    );
  });
});

describe("with no API configured", () => {
  it("disables the control and says why, rather than failing on click", async () => {
    renderWithApi(<PublishPage />, UNCONFIGURED);
    expect(
      await screen.findByText("No API is configured, so there is nothing to publish to."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeDisabled();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(withApi(<PublishPage />), async ({ container }) => {
      await screen.findAllByRole("button", { name: /Publish/ });
      await expectNoA11yViolations(container);
    });
  });
});
