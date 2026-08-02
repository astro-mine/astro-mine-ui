import { render, screen } from "@testing-library/react";

import { Placeholder } from "./Placeholder";

// The Vitest + jsdom lane: pure DOM logic, no WebGL. Cesium/globe/replay rendering is verified in
// the Playwright lane (see e2e/), since jsdom has no WebGL context (VIEW-01 design note).
describe("Placeholder", () => {
  it("renders its label as an accessible region", () => {
    render(<Placeholder label="hello view" />);
    const region = screen.getByTestId("view-placeholder");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-label", "hello view");
    expect(screen.getByText("hello view")).toBeInTheDocument();
  });

  it("defaults its label and renders slot children", () => {
    render(<Placeholder>inner content</Placeholder>);
    expect(screen.getByText("astro-mine-view")).toBeInTheDocument();
    expect(screen.getByText("inner content")).toBeInTheDocument();
  });
});
