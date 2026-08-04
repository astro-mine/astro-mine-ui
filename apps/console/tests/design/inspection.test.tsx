// The world and the 3D candidate inspection (ui#17; UC-F5, UC-C4; studio.md §6).
//
// The acceptance criteria this file is the evidence for:
//
//   - terrain is reachable FROM A CONTROL; no capability requires editing a URL by hand;
//   - each of the four no-swarm cases renders its own explanation;
//   - the design-time layout disclosure is present whenever a swarm is drawn;
//   - a missing registry renders the backend's reason and the pane survives.
//
// The fifth — "the 3D pane is code-split and absent from bundles that do not use it" — is a
// statement about the build output, so it is asserted in the build lane beside the replay one.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InspectionPane } from "@/components/design/InspectionPane";
import { arrange, noSwarmReason, unitCount } from "@/components/design/layout";
import type { DesignCandidate } from "@/components/design/types";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { resolvedWorld, world } from "./fixtures";

const { api, use } = mockApi();

const WORLDS = api.studioListWorlds({ body: [world()] });

const candidate = (over: Partial<DesignCandidate> = {}): DesignCandidate => ({
  id: "Two excavators",
  swarm: [{ sadf_ref: "commons/excavator:1.0.0", count: 2 }],
  decision_vector: {},
  infrastructure: [],
  policy_refs: {},
  ...over,
});

/** Choose the world from the picker — which is the point, so the tests do it that way too. */
async function chooseWorld(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("combobox", { name: /World/ }));
  await user.click(await screen.findByRole("option", { name: /commons\/shackleton-rim/ }));
}

describe("terrain is reachable from a control", () => {
  it("lists the deployment's worlds in a picker", async () => {
    // The criterion exists because the retired console needed a URL parameter edited to change
    // worlds — a capability that exists and that nobody can find.
    use(WORLDS);
    renderWithApi(<InspectionPane />);

    const picker = await screen.findByRole("combobox", { name: /World/ });
    await userEvent.setup({ delay: null }).click(picker);
    expect(
      await screen.findByRole("option", { name: /commons\/shackleton-rim/ }),
    ).toBeInTheDocument();
  });

  it("resolves the chosen world and shows the digest it resolved to", async () => {
    use(WORLDS);
    use(api.studioResolveWorld({ body: resolvedWorld() }));
    renderWithApi(<InspectionPane candidate={candidate()} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    expect(await screen.findByText("shackleton-rim")).toBeInTheDocument();
    expect(screen.getByText(/sha256:world/)).toBeInTheDocument();
  });

  it("says this deployment has no worlds, rather than showing an empty control", async () => {
    use(api.studioListWorlds({ body: [] }));
    renderWithApi(<InspectionPane />);

    expect(await screen.findByText("This deployment publishes no worlds")).toBeInTheDocument();
  });
});

describe("the four no-swarm cases each get their own reason", () => {
  it("no candidate selected", async () => {
    use(WORLDS);
    renderWithApi(<InspectionPane />);
    expect(await screen.findByText("No candidate selected")).toBeInTheDocument();
  });

  it("no world resolved", async () => {
    use(WORLDS);
    renderWithApi(<InspectionPane candidate={candidate()} />);
    expect(await screen.findByText("No world resolved")).toBeInTheDocument();
  });

  it("a world bundle that publishes no site anchor", async () => {
    // The terrain can still draw; there is simply nowhere on the body to place anything relative
    // to. That is a property of the world, not of the candidate, and the words say so.
    use(WORLDS);
    use(api.studioResolveWorld({ body: resolvedWorld({ site: null }) }));
    renderWithApi(<InspectionPane candidate={candidate()} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    expect(
      await screen.findByText("This world bundle publishes no site anchor"),
    ).toBeInTheDocument();
    expect(screen.getByText(/property of the world, not of the candidate/)).toBeInTheDocument();
  });

  it("a candidate that declares no units", async () => {
    use(WORLDS);
    use(api.studioResolveWorld({ body: resolvedWorld() }));
    renderWithApi(<InspectionPane candidate={candidate({ swarm: [] })} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    expect(await screen.findByText("This candidate declares no units")).toBeInTheDocument();
  });

  it("distinguishes all four as a pure function, in priority order", () => {
    expect(noSwarmReason(undefined, undefined)).toBe("no-candidate");
    expect(noSwarmReason(candidate(), undefined)).toBe("no-world");
    expect(noSwarmReason(candidate(), resolvedWorld({ site: null }))).toBe("no-anchor");
    expect(noSwarmReason(candidate({ swarm: [] }), resolvedWorld())).toBe("no-units");
    expect(noSwarmReason(candidate(), resolvedWorld())).toBeNull();
  });
});

describe("the design-time layout disclosure", () => {
  it("is present whenever a swarm is drawn", async () => {
    use(WORLDS);
    use(api.studioResolveWorld({ body: resolvedWorld() }));
    use(
      api.studioPreviewAsset({
        body: {
          reference: "commons/excavator:1.0.0",
          digest: "sha256:a",
          document_url: "https://api.test/asset.json",
        },
      }),
    );
    renderWithApi(<InspectionPane candidate={candidate()} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    expect(
      await screen.findByText("These positions are a design-time convention, not a simulated pose"),
    ).toBeInTheDocument();
    expect(screen.getByText(/never where any of them stands/)).toBeInTheDocument();
  });

  it("is absent when there is no swarm to disclose anything about", async () => {
    use(WORLDS);
    use(api.studioResolveWorld({ body: resolvedWorld() }));
    renderWithApi(<InspectionPane candidate={candidate({ swarm: [] })} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    await screen.findByText("This candidate declares no units");
    expect(screen.queryByText(/design-time convention/)).toBeNull();
  });
});

describe("the arrangement itself", () => {
  it("places one pose per declared unit", () => {
    const placements = arrange(
      candidate({
        swarm: [
          { sadf_ref: "commons/excavator:1.0.0", count: 2 },
          { sadf_ref: "commons/hauler:1.0.0", count: 1 },
        ],
      }),
      resolvedWorld(),
    );
    expect(placements).toHaveLength(3);
    expect(placements.map((p) => p.assetRef)).toEqual([
      "commons/excavator:1.0.0",
      "commons/excavator:1.0.0",
      "commons/hauler:1.0.0",
    ]);
  });

  it("is deterministic, so two readers see the same picture", () => {
    const a = arrange(candidate(), resolvedWorld());
    const b = arrange(candidate(), resolvedWorld());
    expect(a).toEqual(b);
  });

  it("places nothing when the world names no site", () => {
    // Rather than fabricating a pose at the body's origin, which would draw a swarm at the centre
    // of the Moon.
    expect(arrange(candidate(), resolvedWorld({ site: null }))).toEqual([]);
  });

  it("counts units across every asset in the swarm", () => {
    expect(
      unitCount(
        candidate({
          swarm: [
            { sadf_ref: "a", count: 3 },
            { sadf_ref: "b", count: 4 },
          ],
        }),
      ),
    ).toBe(7);
  });
});

describe("a deployment without its registry wiring", () => {
  it("renders the backend's own reason and the pane survives", async () => {
    use(WORLDS);
    use(
      api.studioResolveWorld({
        problem: { code: "capability_unavailable", detail: "no registry configured for worlds" },
      }),
    );
    renderWithApi(<InspectionPane candidate={candidate()} />);

    await chooseWorld(userEvent.setup({ delay: null }));
    expect(await screen.findByText("That world could not be resolved")).toBeInTheDocument();
    expect(screen.getByText("no registry configured for worlds")).toBeInTheDocument();
    // The pane survives: the picker is still there and still usable.
    expect(screen.getByRole("combobox", { name: /World/ })).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    renderWithApi(<InspectionPane />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(WORLDS);
    await forEachColorScheme(withApi(<InspectionPane />), async ({ container }) => {
      await screen.findAllByRole("combobox", { name: /World/ });
      await expectNoA11yViolations(container);
    });
  });
});
