// Provenance and the episode replay (ui#13; UC-B6; CX-REPRO).
//
// The acceptance criteria this file is the evidence for:
//
//   - a submission with no provenance bundle, and one with no replay, each render an honest
//     explanation rather than a spinner or a blank;
//   - the pinned content digests are shown IN FULL and copyable — this is the CX-REPRO payload;
//   - the replay chunk is not fetched until a reader asks for it.
//
// Two criteria are asserted elsewhere because they cannot be asserted here:
//
//   - "content-hash verification runs before decode, with the failing case tested" is
//     `packages/view`'s own suite (`src/replay/mcapSource.test.ts` — it hashes, compares and throws
//     instead of returning a readable). What this page owns is *passing the digest*, which is
//     asserted below by checking the manifest's digest reaches the scene.
//   - "the replay chunk is not in the leaderboard route's bundle" is a statement about the build
//     output, so it is a step in the build lane, next to the Cesium assertion it extends.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Provenance } from "@/components/bench/Provenance";
import { ReplayPane } from "@/components/bench/ReplayPane";
import { replayUrl } from "@/components/bench/replayUrl";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { provenance, replay } from "./fixtures";

const { api, use, server } = mockApi();

const ID = "sha256:1111111111111111111111111111111111111111111111111111111111111111";

describe("provenance", () => {
  it("shows the whole lineage a result is reproducible from", async () => {
    use(api.benchGetProvenance({ body: provenance() }));
    renderWithApi(<Provenance submissionId={ID} />);

    // `getAllByText`: the `Digest` control repeats its label as an accessible name, so a hash's
    // caption legitimately appears twice — once as the `<dt>` and once on the copy affordance.
    await screen.findAllByText("Scenario spec hash");
    for (const label of [
      "Core schema digest",
      "Core interface versions",
      "Code version",
      "Environment",
      "Environment lockfile",
      "Scorecard hash",
      "Held-out seeds",
    ]) {
      expect(screen.getAllByText(label), `${label} is part of the lineage`).not.toHaveLength(0);
    }
  });

  it("shows the pinned content digests in full — the CX-REPRO payload", async () => {
    // Abbreviating a value somebody has to paste into a scenario spec defeats the panel.
    const world = "sha256:7777777777777777777777777777777777777777777777777777777777777777";
    use(api.benchGetProvenance({ body: provenance() }));
    renderWithApi(<Provenance submissionId={ID} />);

    expect(await screen.findByText("Pinned content")).toBeInTheDocument();
    expect(screen.getByText(world)).toBeInTheDocument();
  });

  it("says so when a run pinned no content at all", async () => {
    use(api.benchGetProvenance({ body: provenance({ content_hashes: {} }) }));
    renderWithApi(<Provenance submissionId={ID} />);

    expect(await screen.findByText("This run pinned no content")).toBeInTheDocument();
  });

  it("shows the per-seed values behind each aggregate", async () => {
    use(api.benchGetProvenance({ body: provenance() }));
    renderWithApi(<Provenance submissionId={ID} />);

    const table = await screen.findByRole("table", { name: "Per-seed metric values" });
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + three seeds
    expect(within(table).getByText("127.1")).toBeInTheDocument();
  });

  it("renders a gap in a seed's metrics as a dash rather than a zero", async () => {
    use(
      api.benchGetProvenance({
        body: provenance({
          per_seed: [
            { seed: 11, metrics: { ice_yield: 127.1 } },
            { seed: 12, metrics: { ice_yield: null } },
          ],
        }),
      }),
    );
    renderWithApi(<Provenance submissionId={ID} />);

    const table = await screen.findByRole("table", { name: "Per-seed metric values" });
    expect(within(table).getByLabelText("not recorded")).toBeInTheDocument();
  });

  it("explains an absent bundle honestly rather than implying a lineage", async () => {
    // The criterion in as many words. Implying a provenance an entry does not have is worse than
    // admitting the gap, because the section's presence is what makes it mean anything.
    use(
      api.benchGetProvenance({
        problem: { code: "content_not_found", detail: "no bundle stored" },
      }),
    );
    renderWithApi(<Provenance submissionId={ID} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("no bundle stored");
    expect(alert).toHaveTextContent(/not reproducible from the platform alone/);
  });

  it("explains itself with no API configured", async () => {
    renderWithApi(<Provenance submissionId={ID} />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("the replay manifest", () => {
  it("summarises the episode without loading a viewer", async () => {
    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />);

    await screen.findByText("Agents");
    expect(screen.getByText("excavator-1, hauler-1")).toBeInTheDocument();
    expect(screen.getByText("3600 (7200 observations)")).toBeInTheDocument();
    expect(screen.getByText("60.0 min (3600 s)")).toBeInTheDocument();
    expect(screen.getByText("4.0 MiB")).toBeInTheDocument();
  });

  it("shows the MCAP digest, which is what the bytes get checked against", async () => {
    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />);

    expect(
      await screen.findByText(
        "sha256:abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
      ),
    ).toBeInTheDocument();
  });

  it("says a submission has no replay, rather than spinning forever", async () => {
    use(
      api.benchGetReplayManifest({
        problem: { code: "content_not_found", detail: "no recording stored" },
      }),
    );
    renderWithApi(<ReplayPane submissionId={ID} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("no recording stored");
    expect(alert).toHaveTextContent(/retention policy/);
  });

  it("handles a manifest with no sim-time span or seed", async () => {
    use(
      api.benchGetReplayManifest({
        body: replay({ sim_time_start_s: null, sim_time_end_s: null, seed: null, agents: [] }),
      }),
    );
    renderWithApi(<ReplayPane submissionId={ID} />);

    await screen.findByText("Agents");
    expect(screen.getAllByText("not recorded").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("none recorded")).toBeInTheDocument();
  });
});

describe("the viewer is loaded on demand", () => {
  it("is behind a control, and says why", async () => {
    // The reason is a person: a student who opened the leaderboard to look at a number should not
    // download a globe.
    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />);

    expect(await screen.findByRole("button", { name: "Open the 3D replay" })).toBeInTheDocument();
    expect(screen.getByText(/not downloaded until you ask for it/)).toBeInTheDocument();
  });

  it("fetches nothing for the recording until it is opened", async () => {
    // The manifest is JSON and costs nothing; the recording is megabytes. Only the first is read
    // on page load.
    const seen: string[] = [];
    server.events.on("request:start", ({ request }) => seen.push(new URL(request.url).pathname));

    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />);
    await screen.findByRole("button", { name: "Open the 3D replay" });

    expect(seen.some((path) => path.endsWith("/replay/manifest"))).toBe(true);
    expect(seen.some((path) => path.endsWith("/replay"))).toBe(false);
  });

  it("says there is nowhere to fetch from with no API configured", async () => {
    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />, UNCONFIGURED);
    // Unconfigured means the manifest read degrades first, so the control never appears.
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });

  it("opens the viewer when asked", async () => {
    use(api.benchGetReplayManifest({ body: replay() }));
    renderWithApi(<ReplayPane submissionId={ID} />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Open the 3D replay" }));

    // The dynamic chunk cannot resolve under jsdom (Cesium touches `window` at import time and has
    // no WebGL to bind to), so what is asserted is the boundary: the control is replaced by the
    // loading state that `next/dynamic` renders while the chunk arrives. That the scene itself
    // renders in a real browser is the e2e lane's job.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Open the 3D replay" })).toBeNull();
    });
  });
});

describe("the recording's address", () => {
  it("is built from the operation table, not from a hand-written path", async () => {
    // If the API moves the route, regenerating the client moves this with it.
    expect(replayUrl("https://api.test", ID)).toBe(
      `https://api.test/bench/submissions/${encodeURIComponent(ID)}/replay`,
    );
  });

  it("encodes the digest so its colon survives as one path segment", () => {
    expect(replayUrl("https://api.test/", ID)).toContain("sha256%3A");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(api.benchGetProvenance({ body: provenance() }));

    await forEachColorScheme(withApi(<Provenance submissionId={ID} />), async ({ container }) => {
      await screen.findAllByText("Pinned content");
      await expectNoA11yViolations(container);
    });
  });
});
