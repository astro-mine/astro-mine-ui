import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// The component lane for the application (ui#5).
//
// Deliberately minimal, exactly as `packages/ui`'s and `packages/api-client`'s are, and for the same
// reason: `ui#8` owns the workspace-wide harness — the shared MSW server, the coverage floor, the
// bundle budget, and the Playwright and route-level axe lanes. What is here is what this issue's own
// acceptance criteria need in order to mean anything, and no more.
//
// `pnpm -r run test` picks this up as soon as the package declares a `test` script, so CI gains the
// lane without a workflow edit.
export default defineConfig({
  // The app's `tsconfig.json` sets `jsx: "preserve"` because **Next compiles the app and `tsc` only
  // checks it** — the JSX is meant to survive for the framework's own transform. Vite reads that
  // same file, honours it, and then fails to parse its own output: "the content contains invalid JS
  // syntax". Naming the transform here is the fix, and it is not a second opinion about the build —
  // nothing in this lane goes through Next.
  // (Vite 8 transforms with oxc, so this is the `oxc` key — an `esbuild` block is accepted and then
  // ignored, with a warning that is easy to read past.)
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  resolve: {
    alias: {
      // The app's own `@/*` path mapping, which `tsconfig.json` declares and Next honours. Vitest
      // reads neither, so it is restated here — the one place in the workspace where a path mapping
      // has to be written twice.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.tsx"],
    globals: true,
  },
});
