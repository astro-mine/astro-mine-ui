import { defineConfig } from "vitest/config";

// The component lane for the visualization library (ui#6).
//
// Carried over from the repository this package came from rather than rewritten, because the point
// of the port is that **the suite runs unchanged** — 13 files covering the frames maths, the
// conformance vectors, the MCAP content-hash check and the timeline clock. What changed is only
// what had to: the coverage reporter goes (`ui#8` owns the workspace coverage floor), and the
// config no longer sits inside a Vite app config.
//
// `css: false` is kept and is not incidental: nothing in this library imports a stylesheet, and the
// one file that did — the demo harness — did not come across.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
