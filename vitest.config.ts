import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// THE WORKSPACE TEST RUN (ui#8).
//
// One Vitest process over five projects, replacing `pnpm -r run test`'s five concurrent ones. Two
// reasons, and the first is the one that matters:
//
//   1. **One coverage report.** A floor enforced per package is five floors that can each be moved
//      without anyone noticing the total fell. The issue asks for "coverage floor, enforced rather
//      than reported", and enforcing it across the workspace needs the workspace measured at once.
//   2. **One process.** `pnpm -r` ran five Vitests concurrently over a Windows drive; twice during
//      Wave 28 that run reported a stale file count for one project and exited non-zero, and both
//      times the project passed alone and on re-run. This is not a claimed fix — the cause was
//      never established — but the shape that produced it is gone, and if it recurs here it recurs
//      somewhere much easier to read.
//
// **There is one way to run tests.** `pnpm test` runs everything; `pnpm test --project ui` runs one.
// The per-package `test` scripts are gone rather than kept as a second path, because two ways to run
// a suite is how the two ways end up configured differently.
//
// Each project keeps the configuration that is genuinely its own — `view` disables CSS handling and
// brings its own setup, `console` needs a JSX transform and a path alias that Vitest cannot read
// from its tsconfig — and shares everything else.

const consoleRoot = fileURLToPath(new URL("./apps/console", import.meta.url));
const viewRoot = fileURLToPath(new URL("./packages/view", import.meta.url));

const packageSource = (name: string, entry = "index") =>
  fileURLToPath(new URL(`./packages/${name}/src/${entry}.ts`, import.meta.url));

/**
 * Workspace packages resolved to their SOURCE, never to `dist/`.
 *
 * Without this the suite silently depends on a build: `@astro-mine/ui/testing` resolves through the
 * package manifest to `dist/testing.js`, which is present on a machine that has run `pnpm build` and
 * absent in a CI job that has not. It cost a red lane to find, and the failure — `Cannot find package
 * '@astro-mine/ui/testing'` — points at the import rather than at the missing build.
 *
 * Resolving to source is also the behaviour worth having on its own terms: an edit in
 * `packages/ui/src` is picked up by the next test run instead of the next build, and a test can never
 * pass against a stale `dist/` that no longer matches the code beside it.
 *
 * **Longest specifier first.** These are prefix matches, so `@astro-mine/ui` listed before
 * `@astro-mine/ui/testing` would swallow it and resolve the subpath to the main entry.
 */
const workspaceSource = {
  "@astro-mine/api-client/testing": packageSource("api-client", "testing"),
  "@astro-mine/api-client": packageSource("api-client"),
  "@astro-mine/ui/testing": packageSource("ui", "testing"),
  "@astro-mine/ui": packageSource("ui"),
  "@astro-mine/inspectors": packageSource("inspectors"),
  "@astro-mine/view": packageSource("view"),
};

/** The three projects that render components share this. */
const componentDefaults = {
  environment: "jsdom" as const,
  globals: true,
  include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
};

export default defineConfig({
  test: {
    // **A cap, added when Wave 29 made the suite big enough to need one.**
    //
    // The console project grew from three test files to eighteen, each of which stands up jsdom,
    // an MSW interceptor and a Material UI tree. Vitest's default is one fork per core, and on a
    // machine where those forks are competing for a Windows drive the pool started failing to
    // start workers at all — `[vitest-pool-runner]: Timeout waiting for worker to respond`, which
    // surfaces as an unrelated test file "failing" and reads like a code fault.
    //
    // Four is enough to keep the run parallel and few enough that each worker gets to finish
    // booting. Two was tried and roughly doubled the wall clock for no reliability gain — the
    // intermittency at four turned out to be a `userEvent` pointer-events check racing MUI's menu
    // transition, which is fixed where it happens rather than by starving the pool.
    maxWorkers: 4,

    projects: [
      {
        // `node`, not `jsdom`: nothing in the client touches the DOM. The one browser API it uses —
        // `fetch` — is injected per client, so a test drives it directly rather than via a global.
        test: {
          name: "api-client",
          root: "./packages/api-client",
          environment: "node",
          globals: true,
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: workspaceSource },
        test: {
          ...componentDefaults,
          name: "ui",
          root: "./packages/ui",
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        resolve: { alias: workspaceSource },
        test: {
          ...componentDefaults,
          name: "inspectors",
          root: "./packages/inspectors",
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        resolve: { alias: workspaceSource },
        // View's suite came across from its own repository and runs unchanged, which was the point
        // of the port. `css: false` is not incidental: nothing in the library imports a stylesheet.
        // Its tests live beside the source rather than in `tests/`, which is also how they arrived.
        test: {
          name: "view",
          root: "./packages/view",
          environment: "jsdom",
          globals: true,
          css: false,
          setupFiles: ["vitest.setup.ts"],
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          // The replay suite reads a committed MCAP fixture from the package root. It cannot use
          // `process.cwd()` (one run, one cwd, and it is the workspace root) and it cannot use
          // `import.meta.url` (an `http:` URL at module scope under jsdom), so the root is handed
          // to it. See the comment in `src/replay/mcapSource.test.ts`.
          env: { VIEW_PACKAGE_ROOT: viewRoot },
        },
      },
      {
        // The app's `tsconfig.json` sets `jsx: "preserve"` because **Next compiles the app and
        // `tsc` only checks it**. Vite reads that same file, honours it, and then fails to parse its
        // own output. Naming the transform here is the fix, and it is not a second opinion about the
        // build — nothing in this project goes through Next. (Vite 8 transforms with oxc, so this is
        // the `oxc` key; an `esbuild` block is accepted and then silently ignored.)
        oxc: { jsx: { runtime: "automatic", importSource: "react" } },
        resolve: {
          // The app's own `@/*` mapping, which `tsconfig.json` declares and Next honours. Vitest
          // reads neither — the one place in the workspace a path mapping is written twice.
          alias: { ...workspaceSource, "@": `${consoleRoot}/src` },
        },
        test: {
          ...componentDefaults,
          name: "console",
          root: "./apps/console",
          setupFiles: ["tests/setup.tsx"],
        },
      },
    ],

    coverage: {
      provider: "v8",
      // `text` for the run, `json-summary` for the gate to read, `lcov` for anything that wants to
      // render it later. No HTML: nobody opens it in CI and it is thousands of files in the tree.
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      // What the floor is measured over. Generated trees are excluded because their coverage is a
      // statement about the generator, not about anything a reviewer can act on — and including
      // them lets a large generated file move the total without a line of hand-written code
      // changing, in either direction.
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/console/src/**/*.{ts,tsx}"],
      exclude: [
        "**/generated/**",
        "**/*.d.ts",
        // Barrels: re-export lists with no behaviour. Counting them inflates the number.
        "**/index.ts",
        // The testing harness itself. It is exercised by every test that imports it, and measuring
        // a test helper's coverage is measuring the tests.
        "packages/ui/src/testing.ts",
      ],
      // MEASURED, NOT ASPIRED TO.
      //
      // What the suite actually achieved when this landed:
      //
      //     statements 70.63 · branches 74.42 · functions 69.52 · lines 72.11
      //
      // The floors sit about a point under each, which is deliberate on both sides. A floor set at
      // the measured value flaps — one refactor that moves a branch turns the lane red for a reason
      // nobody chose. A floor set far under is decoration. A point of slack absorbs noise and still
      // fails on a real regression.
      //
      // **The application's route files are inside this measurement and are all at 0%**, because
      // they are `ui#5`'s placeholders that no test mounts. That drags the total down by a lot, and
      // it is the honest number rather than a flattering one: excluding pages would mean the floor
      // stops noticing the day a *real* page ships untested, which is the day it most needs to.
      // Expect these to jump through Wave 29 — raise them as they do, and never lower one without
      // saying why in the commit that does it.
      thresholds: {
        statements: 69,
        branches: 73,
        functions: 68,
        lines: 71,
      },
    },
  },
});
