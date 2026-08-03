// The four panels (ui#7; ui.md §6, §7 rules 3, 4 and 6).
//
// Each is asserted on the thing it could most plausibly get wrong: showing an absence as a hole,
// inventing a fact the manifest does not carry, or wording "attestations present" as "verified".

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AssetInspector,
  FallbackInspector,
  PolicyInspector,
  WorldInspector,
} from "../../src/index.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "@astro-mine/ui/testing";
import { subject } from "../fixtures.js";

describe("WorldInspector", () => {
  it("renders the globe it is handed", async () => {
    await forEachColorScheme(
      <WorldInspector
        subject={subject({ attributes: { body: "MOON" } })}
        slots={{ globe: <div data-testid="globe" /> }}
      />,
      async ({ container }) => {
        expect(screen.getByTestId("globe")).toBeInTheDocument();
        expect(screen.getByText("MOON")).toBeInTheDocument();
        await expectNoA11yViolations(container);
      },
    );
  });

  it("degrades visibly when the page resolved no terrain", async () => {
    await forEachColorScheme(<WorldInspector subject={subject()} />, async ({ container }) => {
      expect(screen.getByText("No terrain rendered")).toBeInTheDocument();
      // Honesty rule 3: degrade visibly, never blank. The identity survives the missing geometry.
      expect(screen.getByText("shackleton-rim:0.5.0")).toBeInTheDocument();
      await expectNoA11yViolations(container);
    });
  });

  it("says a body is not stated rather than guessing one", () => {
    renderInMode(<WorldInspector subject={subject({ attributes: {} })} />, "light");
    expect(screen.getByText("Not stated on the manifest")).toBeInTheDocument();
  });

  it("ignores a body attribute that is not a string", () => {
    // `manifest.attributes` is an open map: anything can be in it, including the wrong type.
    renderInMode(<WorldInspector subject={subject({ attributes: { body: 7 } })} />, "light");
    expect(screen.getByText("Not stated on the manifest")).toBeInTheDocument();
  });
});

describe("PolicyInspector", () => {
  const policy = subject({
    kind: "policy",
    artifactKind: "policy",
    reference: "excavation-ppo:1.2.0",
    publisher: "astro-mine",
    license: "Apache-2.0",
    capabilityTags: ["excavation", "autonomy_l2"],
    coreInterfaces: [{ interface: "policy", version: "0.1.0" }],
    inputs: ["Observation"],
    outputs: ["Action"],
    attestations: ["cosign_signature", "slsa_provenance"],
  });

  it("renders the declared contract, in both schemes, accessibly", async () => {
    await forEachColorScheme(<PolicyInspector subject={policy} />, async ({ container }) => {
      expect(screen.getByText("policy 0.1.0")).toBeInTheDocument();
      expect(screen.getByText("excavation")).toBeInTheDocument();
      await expectNoA11yViolations(container);
    });
  });

  it("says 'present', never 'verified' (honesty rule 6)", () => {
    const { container } = renderInMode(<PolicyInspector subject={policy} />, "light");
    expect(screen.getByText(/Attestations present in this registry/)).toBeInTheDocument();
    expect(screen.getByText(/Present, not verified/)).toBeInTheDocument();
    // The claim this panel must never make. Asserted as an absence because it is the kind of word
    // that arrives later, in a copy edit, from someone who did not read §7.
    expect(container.textContent).not.toMatch(
      /verified supply chain|signature verified|✓ verified/i,
    );
  });

  it("states an absent attestation set rather than omitting the section", () => {
    renderInMode(<PolicyInspector subject={{ ...policy, attestations: [] }} />, "light");
    expect(screen.getByText("No attestations present")).toBeInTheDocument();
    expect(screen.getByText(/statement about the registry, not a verdict/)).toBeInTheDocument();
  });

  it("puts provenance above the facts it explains (honesty rule 5)", () => {
    // Read from the DOM order of the two labelled groups, not from `textContent`: both labels are
    // accessible names carried on an attribute, so neither appears in the text at all and a
    // string search would compare -1 with -1 and pass for the wrong reason.
    renderInMode(<PolicyInspector subject={policy} />, "light");
    const groups = screen.getAllByRole("group");
    expect(groups[0]).toHaveAccessibleName("Policy provenance");
    expect(groups[1]).toHaveAccessibleName("Declared contract");
  });

  it("does not claim to be a benchmark scorecard", () => {
    // The panel ui.md §6 calls "a scorecard" shows declarations, not scores: a Bench scorecard is
    // addressed by scenario id, and an artifact reference carries none.
    const { container } = renderInMode(<PolicyInspector subject={policy} />, "light");
    expect(screen.getByText(/nothing here is a benchmark result/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/leaderboard|primary metric/i);
  });

  it("declares nothing when the manifest declares nothing", () => {
    const bare = subject({ kind: "policy", artifactKind: "policy" });
    renderInMode(<PolicyInspector subject={bare} />, "light");
    expect(screen.getAllByText("None declared").length).toBeGreaterThan(0);
  });
});

describe("AssetInspector", () => {
  const asset = subject({
    kind: "asset",
    artifactKind: "asset",
    reference: "hauler-mk1:0.3.0",
    capabilityTags: ["hauling"],
    attributes: { asset_kind: "rover" },
  });

  it("reads the vehicle kind off the attribute map, never off the plugin kind", async () => {
    await forEachColorScheme(<AssetInspector subject={asset} />, async ({ container }) => {
      expect(screen.getByText("rover")).toBeInTheDocument();
      // Every asset's PluginKind is `asset`, so a panel that showed the plugin kind here would show
      // the same word for a rover, an orbiter and an excavator.
      expect(screen.queryByText("Vehicle kind")).toBeInTheDocument();
      await expectNoA11yViolations(container);
    });
  });

  it("says an absent geometry is legitimate rather than broken", async () => {
    await forEachColorScheme(<AssetInspector subject={asset} />, async ({ container }) => {
      expect(screen.getByText("No geometry preview")).toBeInTheDocument();
      expect(screen.getByText(/a complete asset, not a broken one/)).toBeInTheDocument();
      await expectNoA11yViolations(container);
    });
  });

  it("renders the preview it is handed", () => {
    renderInMode(
      <AssetInspector subject={asset} slots={{ geometry: <div data-testid="geometry" /> }} />,
      "light",
    );
    expect(screen.getByTestId("geometry")).toBeInTheDocument();
  });
});

describe("FallbackInspector", () => {
  it("names the kind and keeps the identity", async () => {
    await forEachColorScheme(
      <FallbackInspector subject={subject()} kind="prior_recipe" />,
      async ({ container }) => {
        // The kind appears twice and both are wanted: in the words that explain what happened, and
        // as a fact in the identity list beside the container kind it is so easily confused with.
        // Queried exactly rather than by pattern, because a pattern also matches every ancestor
        // whose text contains it and turns a real assertion into an element count.
        expect(screen.getByText(/No inspector for kind/)).toHaveTextContent("prior_recipe");
        expect(screen.getByText("prior_recipe")).toBeInTheDocument();
        expect(screen.getByText("shackleton-rim:0.5.0")).toBeInTheDocument();
        await expectNoA11yViolations(container);
      },
    );
  });

  it("offers no remediation for a record with no kind, because there is none to offer", () => {
    renderInMode(<FallbackInspector subject={subject({ kind: null })} kind={null} />, "light");
    expect(screen.getByText(/declares no Core kind/)).toBeInTheDocument();
    expect(screen.queryByText(/codegen:vocabularies/)).not.toBeInTheDocument();
  });

  it("points at the vocabulary refresh when the kind is simply unknown here", () => {
    renderInMode(<FallbackInspector subject={subject()} kind="trajectory" />, "light");
    expect(screen.getByText(/codegen:vocabularies/)).toBeInTheDocument();
  });
});
