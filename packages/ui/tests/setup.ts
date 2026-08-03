// Test setup for the design system's component project (ui#3; consolidated in ui#8).
//
// The `afterEach` body is `resetColorScheme` from the package's own testing entry, so the three
// projects that render share one definition of "put the DOM back" — including the guard for the
// files that opt into the `node` environment and have no DOM at all. What stays per-project is the
// `cleanup()` call and the jest-dom matcher import, because those are Testing Library's own
// registration and belong where the project registers them.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { resetColorScheme } from "../src/testing.js";

// Vitest does not unmount for us. Without this, a component that registers a timer or a live region
// keeps it across tests, and the failure shows up in whichever test happens to run next — which is
// the hardest kind of flake to read.
afterEach(() => {
  cleanup();
  resetColorScheme();
});
