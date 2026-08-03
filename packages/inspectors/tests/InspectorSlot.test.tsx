// The extension point, and the two things it must never do (ui#7; ui.md §2, §6).
//
//   - render blank when nothing claims a subject
//   - resolve an ambiguity silently

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InspectorSlot, createInspectorRegistry, defaultInspectorRegistry } from "../src/index.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "@astro-mine/ui/testing";
import { subject, tiedAlpha, tiedBeta, worldsFieldModel } from "./fixtures.js";

describe("a resolved subject", () => {
  it("renders the winning panel", () => {
    const registry = createInspectorRegistry([worldsFieldModel]);
    renderInMode(
      <InspectorSlot registry={registry} subject={subject({ kind: "field_model" })} />,
      "light",
    );
    expect(screen.getByTestId("panel")).toHaveTextContent("worlds.field-model");
  });

  it("passes the slots through to the panel", () => {
    renderInMode(
      <InspectorSlot
        registry={defaultInspectorRegistry}
        subject={subject()}
        slots={{ globe: <div data-testid="globe">a mounted globe</div> }}
      />,
      "light",
    );
    expect(screen.getByTestId("globe")).toBeInTheDocument();
  });
});

describe("no match", () => {
  it("names the kind — never a blank panel", async () => {
    await forEachColorScheme(
      <InspectorSlot
        registry={defaultInspectorRegistry}
        subject={subject({ kind: "comms_model", artifactKind: "plugin" })}
      />,
      async ({ container }) => {
        // In the explanation and again in the identity list — see the fallback panel's own test.
        expect(screen.getByText(/No inspector for kind/)).toHaveTextContent("comms_model");
        expect(screen.getByText("comms_model")).toBeInTheDocument();
        // "Never blank" is the criterion, so assert there is something rather than only that the
        // right words are present.
        expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
        await expectNoA11yViolations(container);
      },
    );
  });

  it("says something different when the artifact declares no kind at all", async () => {
    await forEachColorScheme(
      <InspectorSlot registry={defaultInspectorRegistry} subject={subject({ kind: null })} />,
      async ({ container }) => {
        expect(screen.getByText(/declares no Core kind/)).toBeInTheDocument();
        await expectNoA11yViolations(container);
      },
    );
  });
});

describe("ambiguity", () => {
  const tiedSubject = subject({ kind: "metric", artifactKind: null });
  const registry = createInspectorRegistry([tiedBeta, tiedAlpha]);

  it("renders the ambiguity rather than swallowing it", async () => {
    await forEachColorScheme(
      <InspectorSlot registry={registry} subject={tiedSubject} />,
      async ({ container }) => {
        expect(screen.getByText(/Two inspectors claim this artifact equally/)).toBeInTheDocument();
        // Both ids are named, because "one of them needs a discriminator" is only actionable if the
        // reader knows which two.
        expect(screen.getByText(/alpha\.metric and beta\.metric/)).toBeInTheDocument();
        await expectNoA11yViolations(container);
      },
    );
  });

  it("still renders a panel — the reader is not left with only the complaint", () => {
    renderInMode(<InspectorSlot registry={registry} subject={tiedSubject} />, "light");
    expect(screen.getByTestId("panel")).toHaveTextContent("alpha.metric");
  });

  it("announces without interrupting", () => {
    // `role="status"`, not `alert`: a standing property of the build, not an event.
    renderInMode(<InspectorSlot registry={registry} subject={tiedSubject} />, "light");
    expect(screen.getByRole("status")).toHaveTextContent(/Two inspectors claim/);
  });
});
