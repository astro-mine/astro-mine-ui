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
    // **No `maxWorkers` override, and that is a decision with a scar.**
    //
    // Wave 29 grew the console project from three test files to twenty-three, each standing up
    // jsdom, an MSW interceptor and a Material UI tree. On the authoring machine — many cores, a
    // Windows drive — the pool began failing to start workers at all, and capping it at four fixed
    // that. It also quietly broke CI, where `ubuntu-latest` has four vCPUs and Vitest's own default
    // is one fewer than that: a cap of four is a *raise*, and under v8 coverage instrumentation the
    // over-subscription pushed sixteen assertions past their four-second ceiling. The unit lane was
    // red for two pushes before the shape of it was legible.
    //
    // Vitest's default already scales to the machine it is on. If the local pool starves again, run
    // one project at a time (`pnpm test --project console`) rather than reaching for a number that
    // is right on one machine and wrong on the other.

    // **The test budget has to be larger than the assertion budget, and it was not.**
    //
    // `apps/console/tests/setup.tsx` raises Testing Library's async ceiling to four seconds,
    // because a page test here resolves the runtime configuration, builds a client, goes through an
    // MSW interceptor and re-renders a Material UI tree. Vitest's default `testTimeout` is *five*
    // seconds — so a single four-second wait consumed almost the whole test, and anything that
    // needed a second one failed on the clock rather than on the assertion.
    //
    // Locally that was rare enough to look like flake. On CI, with v8 coverage instrumenting every
    // module, it took out sixteen tests at once — every one of them reporting almost exactly
    // 5000 ms, which is what a `testTimeout` failure looks like and is how the real cause was
    // finally legible.
    //
    // Twenty seconds is not "wait longer until it passes": it is headroom over the four-second
    // ceiling that actually governs, so a genuinely hung assertion still fails as an assertion,
    // with its own message, rather than as an anonymous timeout.
    testTimeout: 20_000,
    hookTimeout: 20_000,

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
        // THE 3D PANE, WHICH THIS LANE IS FORBIDDEN TO EXECUTE.
        //
        // `conventions.md` §11: "WebGL has no `jsdom` context, so anything touching a canvas belongs
        // in Playwright, not Vitest." `ui#68` enforced that — `apps/console/tests/setup.tsx` stubs
        // `GlobeScene`, `EntityLayer` and `SwarmLayer`, and turns Cesium's `Viewer` into a
        // constructor that throws naming the rule — but left these modules inside the measurement.
        //
        // So the floor was being computed over 89 functions that the lane is *required* not to run.
        // They sat at 0%, dragged every metric down by six to eight points, and functions landed at
        // 74.53 against a floor of 75 the first time CI was able to execute the lane at all. That is
        // the same objection this list already makes about generated trees: their coverage is a
        // statement about something other than the code under test, and no reviewer can act on it.
        //
        // Excluded by the property that puts them in the other lane — each one mounts into, reads
        // from, or renders a component that needs a live Cesium `Viewer`. Not "imports cesium":
        // `appearance.ts`, `ellipsoid.ts` and `assetGeometry.ts` import it for arithmetic, run fine
        // under jsdom, and are tested here at 100/88/25%. And not `InspectionScene.tsx`, which
        // renders `GlobeScene` but is itself exercised through the stub.
        //
        // **These are covered, in the Playwright lane, against the built export.** Excluding them
        // here narrows what this floor claims to what this lane can actually check; it does not
        // narrow what is tested. If one of them ever becomes reachable under jsdom, take it off this
        // list and let the floor rise.
        "packages/view/src/globe/GlobeScene.tsx",
        "packages/view/src/globe/EntityLayer.tsx",
        "packages/view/src/globe/SwarmLayer.tsx",
        "packages/view/src/globe/AssetModel.tsx",
        "packages/view/src/globe/AssetPreview.tsx",
        "packages/view/src/globe/CoordinateReadout.tsx",
        "packages/view/src/globe/ReplayLayer.tsx",
        "packages/view/src/globe/useWorldTerrain.ts",
        "packages/view/src/globe/context.ts",
        "apps/console/src/components/Globe.tsx",
        "apps/console/src/components/bench/ReplayScene.tsx",
      ],
      // MEASURED, NOT ASPIRED TO.
      //
      // What the suite achieves — 875 tests over 66 files, over the exclusions above:
      //
      //     statements 85.71 · branches 84.35 · functions 80.56 · lines 87.01
      //
      // Up from 77.35 / 77.10 / 74.53 / 79.02 measured over the *old* set, and that difference is
      // not a single new test: it is the eleven 3D-pane modules leaving a measurement they could
      // never have contributed to. See the exclusion note above.
      //
      // **The previous numbers here were never measured on CI, though this comment said they were.**
      // The org was out of Actions minutes for the whole of Waves 28–32, so every run was refused in
      // three seconds without executing a step; `78.38 / 78.41 / 76.08 / 79.96` was a workstation
      // figure, taken before `ui#68` moved the 3D pane to Playwright and never retaken. The first
      // run that actually executed this lane came in under the functions floor. The numbers above
      // are reproduced identically on a runner and on the authoring machine, which is what makes
      // them safe to sit a point under.
      //
      // The floors sit about a point under each measurement, which is deliberate on both sides. A
      // floor set at the measured value flaps — one refactor that moves a branch turns the lane red
      // for a reason nobody chose. A floor set far under is decoration. A point of slack absorbs
      // noise and still fails on a real regression.
      //
      // **Never lower one without saying why in the commit that does it.**
      thresholds: {
        statements: 84,
        branches: 83,
        functions: 79,
        lines: 86,
      },
    },
  },
});
