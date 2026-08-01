import { defineConfig } from "vitest/config";

// The unit lane for the client (ui#2). Deliberately minimal: ui#8 owns the workspace-wide harness —
// the component environment, the shared MSW server, the coverage floor and the remaining CI lanes.
// What is here is what this package's own acceptance criteria need in order to mean anything.
//
// `node`, not `jsdom`: nothing in this package touches the DOM. The one browser API it does use —
// `fetch` — is injected per client, so a test drives it directly rather than through a global.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
