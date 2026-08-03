// Test setup for the inspector registry's component lane (ui#7).

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not unmount for us, and a panel left mounted keeps its live region across tests — the
// failure then shows up in whichever test happens to run next, which is the hardest kind to read.
afterEach(() => {
  cleanup();
  if (typeof window === "undefined") return;
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-mui-color-scheme");
});
