// Degrade visibly, never blank (ui#3; ui.md §7 rule 3).

import { describe, expect, it } from "vitest";

import { DegradedState } from "../src/components/DegradedState.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

describe("what it says", () => {
  it("carries a reason AND a remediation", () => {
    // The pair is the whole component. A reason with no remedy tells a reader they are stuck; a
    // remedy with no reason tells them to do something without saying why.
    const { getByRole } = renderInMode(
      <DegradedState
        title="The registry is not configured"
        reason="This deployment has no apiBaseUrl, so no artifact can be resolved."
        remediation="Write config.json beside the application with an apiBaseUrl."
      />,
      "light",
    );

    const state = getByRole("status");
    expect(state).toHaveTextContent("The registry is not configured");
    expect(state).toHaveTextContent("no apiBaseUrl");
    expect(state).toHaveTextContent("Write config.json beside the application");
  });

  it("renders without a remediation when there genuinely is no user-side fix", () => {
    // Optional in the type, but only because inventing a remedy would be worse than admitting
    // there is none.
    const { getByRole } = renderInMode(
      <DegradedState title="Replay is unavailable" reason="This browser has no WebGL context." />,
      "light",
    );
    expect(getByRole("status")).toHaveTextContent("This browser has no WebGL context.");
  });
});

describe("what it is not", () => {
  it("is not an error — nothing failed, so it does not interrupt", () => {
    // `role="status"` rather than `alert`. A standing condition announced as an alert reads as an
    // event that just happened, and sends a reader looking for a fault that is not there.
    const { getByRole, queryByRole } = renderInMode(
      <DegradedState title="Not configured" reason="No endpoint." />,
      "light",
    );
    expect(getByRole("status")).toBeInTheDocument();
    expect(queryByRole("alert")).toBeNull();
  });

  it("wears its own severity rather than error's red", () => {
    const { container } = renderInMode(
      <DegradedState title="Not configured" reason="No endpoint." />,
      "light",
    );
    expect(container.querySelector('[role="status"]')?.className).toContain(
      "MuiAlert-colorDegraded",
    );
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(
      <DegradedState
        title="The registry is not configured"
        reason="No apiBaseUrl."
        remediation="Write config.json."
      />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
