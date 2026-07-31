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

  prettier,
];

export default config;
