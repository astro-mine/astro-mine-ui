// Test setup for the design system's component lane (ui#3).

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not unmount for us. Without this, a component that registers a timer or a live region
// keeps it across tests, and the failure shows up in whichever test happens to run next — which is
// the hardest kind of flake to read.
afterEach(() => {
  cleanup();

  // Setup runs for every file, including the ones that opt into the `node` environment and have no
  // DOM at all. Guarding is what keeps a DOM-cleanup step from failing a test file that renders
  // nothing.
  if (typeof window === "undefined") return;

  // The colour mode is *persisted* by design, which in a test file means one test's choice leaks
  // into the next one's `defaultMode` and silently wins. Clearing storage is what keeps
  // `renderInMode` meaning what it says.
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-mui-color-scheme");
});
