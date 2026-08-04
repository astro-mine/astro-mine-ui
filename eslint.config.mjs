// One ESLint config for the whole workspace (flat config, ESLint 9).
//
// `eslint-config-next` v16 exports a flat config array natively, so there is no `FlatCompat` shim.
// It is applied workspace-wide rather than scoped to apps/console on purpose: three of the four
// packages are React libraries, so its react / react-hooks / jsx-a11y rules are exactly what they
// want, and the `@next/next/*` rules only fire on Next-specific patterns. `settings.next.rootDir`
// tells those rules where the application actually lives, which they cannot infer in a monorepo.
//
// It registers the TypeScript parser but sets no TypeScript rules, so `typescript-eslint`'s
// recommended set is layered on top; both resolve the same `typescript-eslint` install.
// `eslint-config-prettier` goes last and turns off everything that fights the formatter.

import js from "@eslint/js";
import next from "eslint-config-next";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const config = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "**/next-env.d.ts",
      // Cesium's runtime assets, staged into the app before every build (ui#6). Megabytes of
      // third-party workers and minified bundles that are *copied*, never compiled — linting them
      // reported 3,300 problems in code this repository does not own and cannot change.
      "apps/console/public/cesium/**",
      // The journey suite's configured copy of the built export (ui#20) — `apps/console/out` plus
      // one `config.json`. It is the *same emitted bundle* the `out/**` entry above already
      // ignores, so linting it means linting minified third-party chunks under a second name.
      "apps/*/.e2e/**",
    ],
  },

  js.configs.recommended,
  ...next,
  ...tseslint.configs.recommended,

  {
    settings: {
      next: { rootDir: "apps/console" },
    },
  },

  // The gate scripts are plain Node ESM run by `node`, not bundled — Node globals, no TS project.
  {
    files: ["scripts/**/*.mjs", "*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" },
    },
  },

  // NO COLOUR OUTSIDE THE THEME (ui#3; ui.md §2, conventions.md §11).
  //
  // A hex value written into a component is a colour no contrast check can see. `packages/ui`'s
  // gate measures the pairings the theme declares, in both schemes — and it is measuring the wrong
  // thing the moment a page paints something itself. This is the acceptance criterion "no hard-coded
  // colour value exists outside the theme, asserted by lint".
  //
  // The rule is on the *literal*, not on a property name, because the failure mode is not `color:
  // "#f00"` specifically — it is a colour arriving anywhere: a `sx` value, an SVG `stroke`, a
  // template string, a constant at the top of a file. Components reach for colour through the theme
  // instead (`sx={{ color: "text.secondary" }}`, `theme.palette.standIn.main`, or
  // `currentColor` in an SVG).
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    ignores: [
      // The one file colour is allowed to exist in, and the gates that measure it.
      "packages/ui/src/theme.ts",
      "packages/ui/src/contrast.ts",
      // The same arrangement, one package over (ui#6). `@astro-mine/view` cannot reach the theme —
      // a package may not import a sibling — and its overlays sit on a rendered planet rather than
      // on any surface the theme describes, so it owns its colours. What the rule actually wants is
      // that they live in one auditable place per package, which is what this is; and
      // `palette.test.ts` measures every pairing against WCAG AA, so they are audited rather than
      // merely collected.
      "packages/view/src/palette.ts",
      "packages/view/src/palette.test.ts",
      // The gates' own proofs, which need deliberately-bad colours to reject: a contrast pair that
      // fails WCAG, and a categorical pair that a deuteranope cannot separate (ui#4).
      "packages/ui/tests/contrast*.test.ts",
      "packages/ui/tests/palette*.test.ts",
      // Generated from the OpenAPI document; not hand-written, and not ours to lint.
      "packages/api-client/src/generated/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/^\\s*(#[0-9a-fA-F]{3,8}|(rgb|hsl|hwb|lab|lch|oklab|oklch|color)a?\\s*\\()/]",
          message:
            "No colour literal outside the theme. Declare the role in packages/ui/src/theme.ts — " +
            "with its contrast pairing — and reach for it through the theme (sx={{ color: " +
            "'text.secondary' }}) or use currentColor. A colour written here is a colour the " +
            "contrast gate cannot see.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s(:,])(#[0-9a-fA-F]{3,8}\\b|(rgb|hsl|hwb|lab|lch|oklab|oklch|color)a?\\s*\\()/]",
          message:
            "No colour literal outside the theme, including inside a template string. See " +
            "packages/ui/src/theme.ts.",
        },
      ],
    },
  },

  prettier,
];

export default config;
