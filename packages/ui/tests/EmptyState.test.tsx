// Title and hint, never an empty div (ui#3; ui.md §2).

import { describe, expect, it } from "vitest";

import Button from "@mui/material/Button";
import { EmptyState } from "../src/components/EmptyState.js";
import { expectNoA11yViolations } from "./a11y.js";
import { forEachColorScheme, renderInMode } from "./render.js";

describe("what it renders", () => {
  it("says what is empty", () => {
    const { getByText } = renderInMode(<EmptyState title="No candidate swarms yet" />, "light");
    expect(getByText("No candidate swarms yet")).toBeInTheDocument();
  });

  it("offers a way forward rather than a dead end", () => {
    const { getByText, getByRole } = renderInMode(
      <EmptyState
        title="No candidate swarms yet"
        hint="Run a study to generate candidates."
        action={<Button>Open the objective</Button>}
      />,
      "light",
    );
    expect(getByText("Run a study to generate candidates.")).toBeInTheDocument();
    expect(getByRole("button", { name: "Open the objective" })).toBeInTheDocument();
  });

  it("is announced, so an empty result is not heard as continued silence", () => {
    // Without a live region a screen-reader user gets no signal when a fetch resolves to nothing,
    // and "empty" is indistinguishable from "still loading".
    const { getByRole } = renderInMode(<EmptyState title="Nothing here yet" />, "light");
    expect(getByRole("status")).toHaveTextContent("Nothing here yet");
  });

  it("is never an empty div, even with no hint and no action", () => {
    const { container } = renderInMode(<EmptyState title="Nothing here yet" />, "light");
    expect(container.textContent?.trim()).not.toBe("");
  });

  it("titles without becoming a heading (ui#7)", () => {
    // MUI maps `subtitle1` to `<h6>`, so the default would make this title a level-six heading. It
    // looked harmless while this package was the only caller — a lone `<h6>` has no predecessor,
    // and axe's `heading-order` rule needs one to compare against, so nothing here could fail. The
    // first component to render a real `<h2>` above it (an inspector panel) skipped four levels and
    // axe said so. Asserted here, in the package that owns the decision, so it stays decided.
    const { queryByRole, getByText } = renderInMode(
      <EmptyState title="Nothing here yet" />,
      "light",
    );
    expect(queryByRole("heading")).toBeNull();
    expect(getByText("Nothing here yet").tagName).toBe("P");
  });

  it("composes under a page heading without breaking the outline", async () => {
    // The composition that found it. `EmptyState` never appears alone in a real page.
    const { container } = renderInMode(
      <>
        <h2>A panel</h2>
        <EmptyState title="Nothing here yet" hint="Publish something." />
      </>,
      "light",
    );
    await expectNoA11yViolations(container);
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    await forEachColorScheme(
      <EmptyState title="Nothing here yet" hint="Publish an artifact to see it listed." />,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
