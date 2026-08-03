import { defineConfig } from "vitest/config";

// The component lane for the inspector registry (ui#7).
//
// The same minimal shape `packages/ui` uses: `ui#8` owns the workspace-wide harness — the shared MSW
// server, the coverage floor, the bundle budget, the Playwright and route-level axe lanes. What is
// here is what this package's own acceptance criteria need in order to mean anything.
//
// `jsdom`, because the panels render. The resolution tests do not need a DOM and would run faster in
// `node`, but splitting the environment per file buys milliseconds and costs a reader having to know
// which file runs where.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    globals: true,
  },
});
