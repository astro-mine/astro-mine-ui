// A version spec, resolved (ui#11; UC-G1).
//
// The rule under test is honesty rule 4 applied to a query: a specifier names a *set*, the digest
// is the one answer, and the page must lead with the answer rather than with the question.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ResolvePage } from "@/components/registry/ResolvePage";
import { DownloadControl } from "@/components/registry/DownloadControl";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { digestFor } from "./fixtures";

const { api, use, server } = mockApi();

async function resolveFor(name: string, spec = "") {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /Name/ }), name);
  if (spec !== "") {
    await user.type(screen.getByRole("textbox", { name: /Version specifier/ }), spec);
  }
  const button = screen.getByRole("button", { name: /Resolve/ });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
  return user;
}

describe("resolution", () => {
  it("leads with the digest, in full", async () => {
    const digest = digestFor("c");
    use(
      api.hubResolve({
        body: { reference: "commons/shackleton-rim:0.5.0", digest, version: "0.5.0" },
      }),
    );
    renderWithApi(<ResolvePage />);
    await resolveFor("shackleton-rim", ">=0.5,<0.6");

    expect(await screen.findByText("Resolved to")).toBeInTheDocument();
    expect(screen.getByText(digest)).toBeInTheDocument();
  });

  it("says the resolution is a snapshot, not a pin", async () => {
    use(
      api.hubResolve({
        body: { reference: "commons/x:1.0.0", digest: digestFor("d"), version: "1.0.0" },
      }),
    );
    renderWithApi(<ResolvePage />);
    await resolveFor("x");

    expect(await screen.findByText(/This resolution is a snapshot/)).toBeInTheDocument();
  });

  it("sends the spec, the capability tags and the interfaces as the API models them", async () => {
    let sent: unknown;
    server.events.on("request:start", async ({ request }) => {
      sent = await request.clone().json();
    });
    use(
      api.hubResolve({
        body: { reference: "commons/x:1.0.0", digest: digestFor("e"), version: "1.0.0" },
      }),
    );

    renderWithApi(<ResolvePage />);
    const user = await resolveFor("excavator", ">=1.0");
    await screen.findByText("Resolved to");

    void user;
    expect(sent).toMatchObject({ name: "excavator", version_spec: ">=1.0" });
  });

  it("drops a half-written interface pair rather than sending a constraint nothing satisfies", async () => {
    // `policy=` with no version would be read as "require version ''", which refuses everything —
    // a silently empty result from a typo.
    let sent: { interfaces?: unknown } | undefined;
    server.events.on("request:start", async ({ request }) => {
      sent = (await request.clone().json()) as { interfaces?: unknown };
    });
    use(
      api.hubResolve({
        body: { reference: "commons/x:1.0.0", digest: digestFor("f"), version: "1.0.0" },
      }),
    );

    renderWithApi(<ResolvePage />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /Name/ }), "x");
    await user.type(screen.getByRole("textbox", { name: /Core interfaces/ }), "policy=");
    await user.click(screen.getByRole("button", { name: /Resolve/ }));
    await screen.findByText("Resolved to");

    expect(sent?.interfaces).toBeNull();
  });

  it("says nothing satisfies the spec, in the API's own words", async () => {
    use(
      api.hubResolve({
        problem: { code: "resolution_failed", detail: "no version of excavator satisfies >=9" },
      }),
    );
    renderWithApi(<ResolvePage />);
    await resolveFor("excavator", ">=9");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no version of excavator satisfies >=9",
    );
  });

  it("stays usable when the deployment cannot publish — resolving is a read", async () => {
    // ui#11: browsing, searching and resolving stay account-free when publishing is unavailable.
    // This page shares no state with the publish form and never asks whether publishing works.
    use(
      api.hubResolve({
        body: { reference: "commons/x:1.0.0", digest: digestFor("g"), version: "1.0.0" },
      }),
    );
    renderWithApi(<ResolvePage />);
    await resolveFor("x");

    expect(await screen.findByText("Resolved to")).toBeInTheDocument();
  });

  it("disables the control with no API rather than failing on click", async () => {
    renderWithApi(<ResolvePage />, UNCONFIGURED);
    expect(
      await screen.findByText("No API is configured, so there is nothing to resolve against."),
    ).toBeInTheDocument();
  });
});

describe("the download gate", () => {
  const control = (
    <DownloadControl
      name="shackleton-rim"
      version="0.5.0"
      reference="commons/shackleton-rim:0.5.0"
    />
  );

  it("says it checks a gate and does not claim to transfer bytes", async () => {
    // The route is called download and answers a DownloadGrant. A button that says "Download" and
    // produces no file is a bug report; this one says what it does.
    renderWithApi(control);
    expect(
      await screen.findByRole("button", { name: /Check the download gate/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/it does not transfer anything/)).toBeInTheDocument();
    expect(
      screen.getByText(/astro-mine hub pull commons\/shackleton-rim:0.5.0/),
    ).toBeInTheDocument();
  });

  it("shows the policy that granted it, because that is what a consumer records", async () => {
    use(
      api.hubDownload({
        body: { digest: digestFor("h"), policy_engine: "opa", policy_version: "2026.03.1" },
      }),
    );
    renderWithApi(control);

    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: /Check the download gate/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("Granted")).toBeInTheDocument();
    expect(screen.getByText("opa")).toBeInTheDocument();
    expect(screen.getByText("2026.03.1")).toBeInTheDocument();
  });

  it("renders a denial as the policy answer it is", async () => {
    use(
      api.hubDownload({
        problem: { code: "download_denied", detail: "export-control policy refuses this licence" },
      }),
    );
    renderWithApi(control);

    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: /Check the download gate/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "export-control policy refuses this licence",
    );
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(withApi(<ResolvePage />), async ({ container }) => {
      await screen.findAllByRole("button", { name: /Resolve/ });
      await expectNoA11yViolations(container);
    });
  });
});
