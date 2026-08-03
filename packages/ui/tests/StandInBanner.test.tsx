// A stand-in must never look like the real thing (ui#3; ui.md §7 rule 1).
//
// The second of the two honesty assertions the CI table names by hand: "a stand-in rendered
// unlabelled" fails the build.

import { describe, expect, it } from "vitest";

import { StandInBanner } from "../src/components/StandInBanner.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

describe("the label", () => {
  it("cannot be rendered unlabelled — the title is required and always shown", () => {
    // There is no arm of this component that renders without saying what the stand-in is. That is
    // the property, and it is a type-level one as much as a runtime one: `title` is required, so a
    // silent stand-in banner does not compile.
    const { getByRole } = renderInMode(
      <StandInBanner title="Scored by a fixture, not by the simulator" />,
      "light",
    );
    expect(getByRole("note")).toHaveTextContent("Scored by a fixture, not by the simulator");
  });

  it("states the consequence when the caller supplies one", () => {
    const { getByRole } = renderInMode(
      <StandInBanner title="Stand-in evaluator">
        These points are deterministic placeholders and were not produced by an optimisation run.
      </StandInBanner>,
      "light",
    );
    expect(getByRole("note")).toHaveTextContent("deterministic placeholders");
  });
});

describe("its place on the page", () => {
  it("is a note rather than a status — it qualifies the content, it is not an event", () => {
    // `status` would announce once and be gone; this is a standing qualification of everything
    // below it, and it is read in place.
    const { getByRole, queryByRole } = renderInMode(
      <StandInBanner title="Fixture-scored" />,
      "light",
    );
    expect(getByRole("note")).toBeInTheDocument();
    expect(queryByRole("alert")).toBeNull();
  });

  it("carries its own severity, not warning's", () => {
    // Nothing is going wrong; something is standing in. Reusing `warning` would tell a reader to
    // look for a risk that does not exist — and would make the banner indistinguishable from the
    // ordinary cautions a page shows.
    const { container } = renderInMode(<StandInBanner title="Fixture-scored" />, "light");
    const alert = container.querySelector('[role="note"]');
    expect(alert?.className).toContain("MuiAlert-colorStandIn");
    expect(alert?.className).not.toContain("MuiAlert-colorWarning");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(
      <StandInBanner title="Scored by a fixture">Not a simulation run.</StandInBanner>,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
