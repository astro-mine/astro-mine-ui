// Publish the campaign, and open a published one (ui#18; UC-F6).
//
// The acceptance criteria this file is the evidence for:
//
//   - a campaign is published from the GUI and the result opens in the registry by digest;
//   - THE PAGE ASSEMBLES NO CAMPAIGN DOCUMENT OF ITS OWN;
//   - with publishing unavailable, the control says so and the rest of the study page still works;
//   - a published campaign is reachable by URL alone and renders its lineage.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CampaignPage } from "@/components/design/CampaignPage";
import { PublishPane } from "@/components/design/PublishPane";
import { artifactHrefFor } from "@/components/design/campaignLinks";
import type { DesignCandidate } from "@/components/design/types";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { campaign, captured, comparison } from "./fixtures";

const { api, use, server } = mockApi();

/**
 * A user that does not re-check `pointer-events` before every click.
 *
 * **This is a jsdom fidelity problem, not a lowered standard.** MUI's `Select` opens its menu
 * behind a transition, and for the frame or two that transition is running the option inherits
 * `pointer-events: none`. `userEvent`'s check reads that and throws *immediately* — so the failure
 * is a fast one that looks like a missing element, appears only when the machine is loaded enough
 * for the transition to still be in flight, and passes every time the file is run alone. That cost
 * an afternoon of chasing timeouts that were not timeouts.
 *
 * A real browser would have completed the transition. Everything else about the interaction is
 * unchanged: same events, same order, same target.
 */
const menuUser = () => userEvent.setup({ delay: null, pointerEventsCheck: 0 });

const HEALTHY = api.healthz({
  body: {
    component: "astro-mine-api",
    status: "ok",
    version: "0.5.0",
    surfaces: ["hub", "bench", "studio"],
  },
});

const NO_STUDIO = api.healthz({
  body: {
    component: "astro-mine-api",
    status: "ok",
    version: "0.5.0",
    surfaces: ["hub", "bench"],
  },
});

const candidates: DesignCandidate[] = [
  {
    id: "Two excavators",
    swarm: [{ sadf_ref: "commons/excavator:1.0.0", count: 2 }],
    decision_vector: {},
    infrastructure: [],
    policy_refs: {},
  },
];

const pane = (
  <PublishPane
    view={comparison()}
    objective={captured().document}
    candidates={candidates}
    world={{
      reference: "commons/shackleton-rim:0.5.0",
      digest: "sha256:world",
      world_id: "shackleton-rim",
      manifest_url: "https://api.test/world.json",
      site: null,
    }}
  />
);

async function publishAs(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("combobox", { name: /Candidate/ }));
  await user.click(await screen.findByRole("option", { name: /Two excavators/ }));
  await user.type(screen.getByRole("textbox", { name: /Campaign name/ }), name);
  const button = screen.getByRole("button", { name: /Publish the campaign/ });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

describe("publishing", () => {
  it("sends the objective, the choice and the world — and NO campaign document", async () => {
    // The acceptance criterion, and the one that matters most: a campaign's value is its lineage,
    // and a lineage the browser wrote is a lineage the browser vouches for.
    let sent: Record<string, unknown> | undefined;
    server.events.on("request:start", async ({ request }) => {
      if (new URL(request.url).pathname === "/studio/campaigns/publish") {
        sent = (await request.clone().json()) as Record<string, unknown>;
      }
    });

    use(HEALTHY);
    use(
      api.studioPublishCampaign({
        body: {
          reference: "commons/polar-ice:0.1.0",
          digest: "sha256:campaign",
          content_digest: "sha256:contentcontentcontentcontent",
          kind: "campaign",
        },
      }),
    );
    renderWithApi(pane);
    await publishAs(menuUser(), "polar-ice");

    await screen.findByText("Published");
    expect(sent?.campaign).toBeNull();
    expect(sent?.objective).toBeDefined();
    expect(sent?.world_ref).toBe("commons/shackleton-rim:0.5.0");
  });

  it("leads with the reference and the digest, and links into the registry", async () => {
    use(HEALTHY);
    use(
      api.studioPublishCampaign({
        body: {
          reference: "commons/polar-ice:0.1.0",
          digest: "sha256:campaign",
          content_digest: "sha256:contentcontentcontentcontent",
          kind: "campaign",
        },
      }),
    );
    renderWithApi(pane);
    await publishAs(menuUser(), "polar-ice");

    expect(await screen.findByText("commons/polar-ice:0.1.0")).toBeInTheDocument();
    expect(screen.getByText("sha256:campaign")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open it in the registry" })).toHaveAttribute(
      "href",
      "/registry/artifact?name=polar-ice&version=0.1.0",
    );
  });

  it("offers the front members first and badges them", async () => {
    use(HEALTHY);
    renderWithApi(pane);

    await userEvent
      .setup({ delay: null })
      .click(await screen.findByRole("combobox", { name: /Candidate/ }));
    const options = await screen.findAllByRole("option");
    // `comparison()` puts "One hauler" first and off the front; the front member is offered first.
    expect(options[0]).toHaveTextContent("Two excavators · on the front");
  });

  it("says which world will be recorded, so a reviewer need not infer it", async () => {
    use(HEALTHY);
    renderWithApi(pane);
    expect(
      await screen.findByText(/is recorded on the campaign, so a reviewer can tell/),
    ).toBeInTheDocument();
  });

  it("says when no world will be recorded", async () => {
    use(HEALTHY);
    renderWithApi(
      <PublishPane view={comparison()} objective={captured().document} candidates={candidates} />,
    );
    expect(await screen.findByText(/No world is resolved/)).toBeInTheDocument();
  });

  it("renders the API's refusal as the backend wrote it", async () => {
    use(HEALTHY);
    use(
      api.studioPublishCampaign({
        problem: { code: "capability_unavailable", detail: "no registry wiring for campaigns" },
      }),
    );
    renderWithApi(pane);
    await publishAs(menuUser(), "polar-ice");

    expect(await screen.findByText("no registry wiring for campaigns")).toBeInTheDocument();
  });
});

describe("the control reflects availability before it is clicked", () => {
  it("disables itself and says why when Studio is not mounted", async () => {
    // `/healthz` names the mounted surfaces, which is the only thing in the contract that lets a
    // page know before it tries.
    use(NO_STUDIO);
    renderWithApi(pane);

    expect(await screen.findByText("This deployment does not mount Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish the campaign/ })).toBeDisabled();
  });

  it("does not disable itself merely because the answer has not arrived", async () => {
    // `hasSurface` returns `undefined` while unknown rather than `false`. Treating the two the same
    // would disable the control for a moment on every cold load, which reads as a broken
    // deployment.
    use(HEALTHY);
    renderWithApi(pane);
    await screen.findByRole("combobox", { name: /Candidate/ });
    expect(screen.queryByText("This deployment does not mount Studio")).toBeNull();
  });
});

describe("opening a published campaign", () => {
  it("renders its lineage from the address alone", async () => {
    use(api.studioPullCampaign({ body: campaign() }));
    goTo("/design/campaign?ref=commons%2Fpolar-ice%3A0.1.0");
    renderWithApi(<CampaignPage />);

    expect(await screen.findByRole("heading", { name: "Lineage" })).toBeInTheDocument();
    expect(screen.getByText("sha256:objective")).toBeInTheDocument();
    expect(screen.getByText("commons/shackleton-rim:0.5.0")).toBeInTheDocument();
  });

  it("badges a stand-in evaluator, so a reviewer reads it before the design", async () => {
    use(api.studioPullCampaign({ body: campaign({ evaluator: "fixture/example" }) }));
    goTo("/design/campaign?ref=x");
    renderWithApi(<CampaignPage />);

    expect(await screen.findByText(/fixture\/example · stand-in/)).toBeInTheDocument();
  });

  it("says so when no world was recorded, rather than leaving a blank", async () => {
    use(api.studioPullCampaign({ body: campaign({ world_ref: null }) }));
    goTo("/design/campaign?ref=x");
    renderWithApi(<CampaignPage />);

    expect(await screen.findByText(/None recorded/)).toBeInTheDocument();
  });

  it("shows the chosen candidate's swarm", async () => {
    use(api.studioPullCampaign({ body: campaign() }));
    goTo("/design/campaign?ref=x");
    renderWithApi(<CampaignPage />);

    const table = await screen.findByRole("table", { name: /swarm/i });
    expect(table).toHaveTextContent("commons/excavator:1.0.0");
  });

  it("says a campaign with no phases has none", async () => {
    use(api.studioPullCampaign({ body: campaign() }));
    goTo("/design/campaign?ref=x");
    renderWithApi(<CampaignPage />);

    expect(await screen.findByText("This campaign declares no phases")).toBeInTheDocument();
  });

  it("is a state, not an error, with no reference in the address", async () => {
    goTo("/design/campaign");
    renderWithApi(<CampaignPage />);
    expect(await screen.findByText("No campaign in the address")).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    goTo("/design/campaign?ref=x");
    renderWithApi(<CampaignPage />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("linking a reference into the registry", () => {
  it("splits a namespaced reference into the name and version the route takes", () => {
    expect(artifactHrefFor("commons/polar-ice:0.1.0")).toBe(
      "/registry/artifact?name=polar-ice&version=0.1.0",
    );
  });

  it("handles a reference with no namespace", () => {
    expect(artifactHrefFor("polar-ice:0.1.0")).toBe(
      "/registry/artifact?name=polar-ice&version=0.1.0",
    );
  });

  it("falls back to a search when there is no version to address", () => {
    // The artifact route cannot be addressed without a version, so a link that works beats one
    // that 404s.
    expect(artifactHrefFor("polar-ice")).toBe("/registry?q=polar-ice");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(api.studioPullCampaign({ body: campaign() }));
    goTo("/design/campaign?ref=x");

    await forEachColorScheme(withApi(<CampaignPage />), async ({ container }) => {
      await screen.findAllByRole("heading", { name: "Lineage" });
      await expectNoA11yViolations(container);
    });
  });
});
