// Test setup for the inspector registry's component project (ui#7; consolidated in ui#8).
//
// The reset comes from `@astro-mine/ui/testing`, so the three rendering projects cannot disagree
// about what "put the DOM back" means.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { resetColorScheme } from "@astro-mine/ui/testing";
import { afterEach } from "vitest";

// Vitest does not unmount for us, and a panel left mounted keeps its live region across tests — the
// failure then shows up in whichever test happens to run next, which is the hardest kind to read.
afterEach(() => {
  cleanup();
  resetColorScheme();
});
