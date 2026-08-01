import { defineConfig } from "vitest/config";

// The component lane for the design system (ui#3).
//
// Deliberately minimal, exactly as `packages/api-client`'s config is: `ui#8` owns the workspace-wide
// harness — the shared MSW server, the coverage floor, the bundle budget and the Playwright and
// route-level axe lanes. What is here is what this package's own acceptance criteria need in order
// to mean anything.
//
// `jsdom`, because this package renders (conventions.md §2.1). Note the standing limit that comes
// with it: jsdom has no layout or paint, so axe's own `color-contrast` rule cannot run here. Colour
// contrast is gated separately and authoritatively by `tests/contrast.test.ts`, which measures the
// theme's declared pairings rather than sampling pixels — see `tests/a11y.ts`.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    globals: true,
  },
});
