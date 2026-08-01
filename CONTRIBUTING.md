# Contributing to astro-mine-ui

Org-wide policy — governance, the code of conduct, security reporting and export control — lives in
[`astro-mine/.github`](https://github.com/astro-mine/.github). This file is the repo-local part.

## Prerequisites

- **Node ≥ 20.19** (see `.nvmrc`).
- **pnpm 11.10.0** — pinned in `package.json` (`packageManager`); `corepack enable` picks it up.

No registry credential is needed to build this repository: every `@astro-mine` dependency here is a
`workspace:*` link. The scope mapping in `.npmrc` is for publishing and for consumers.

## Setup & workflow

```bash
pnpm install
pnpm dev            # the console app at http://localhost:3000
```

Before pushing, run what CI runs — the whole chain works **offline after the first install**
(CX-LOCAL), with no network fetch at build or check time:

```bash
pnpm check:layering       # the enforced dependency direction
pnpm check:layering:test  # ...and proof that check can fail
pnpm format:check         # prettier
pnpm typecheck            # tsc, every package and the app
pnpm lint                 # eslint, 0 warnings
pnpm build                # the packages, then the static export into apps/console/out
```

The full eight-lane matrix — unit/component on Vitest + MSW, the OpenAPI contract lane, the honesty
assertions, Playwright against the built export, and axe over every route in both modes — arrives
with `ui#8`. What is above is the floor, and the floor must never be red.

## Where code goes

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first; the layering rule there is enforced by a script, not
by review, and it is the single thing most likely to reject a well-meant change.

| You are adding                                | It goes in                                                      |
| --------------------------------------------- | --------------------------------------------------------------- |
| a page or a route                             | `apps/console/src/app/`                                         |
| a component two pages share                   | `packages/ui`                                                   |
| anything that talks to the API                | `packages/api-client` (generated — regenerate, don't hand-edit) |
| a globe, a replay, a timeline, a frame helper | `packages/view`                                                 |
| a panel for an artifact kind                  | `packages/inspectors`                                           |
| a **new platform capability**                 | not here. The platform, then the API, then a page.              |

Two things that will bite, both consequences of the static export and both explained in
`ARCHITECTURE.md`: **route identity lives in the query string**, not in a dynamic segment; and
**every chart goes through `packages/ui`**, which exports no raw chart primitive.

## Conventions

- **Commits** are imperative and explain _why_ in the body, referencing the issue (`Refs #12`). Keep
  a commit to one coherent change.
- **Pull requests** are draft until the work is ready, carry `Closes #N`, and state what was actually
  verified — not what was intended.
- **Traceability**: cite `RM-*` roadmap items, `LUNAR-*`/`AST-*` scenario requirements and
  `conventions.md §N` where they apply.

### Two environment facts that look like defects and are not

- **Playwright cannot launch a browser in the WSL workspace** this project is developed in (a missing
  system library). A red browser lane _there_ is environmental; unit tests, typecheck, lint and build
  are the local truth, and CI is the arbiter.
- **`jsdom` does not implement every `File` method**, so a page reading an uploaded file must use an
  API `jsdom` has (`FileReader`, not `File.text()`).

### `next-env.d.ts` is generated and untracked

Do not commit `apps/console/next-env.d.ts`, and do not restore it citing the Next.js convention to
track it. That convention predates the typed-routes reference, which makes the file's contents differ
between commands — `next dev` and `next build` each write a different path into it — so there is no
single correct committed state, and tracking it left `git status` permanently dirty and aborted
`git checkout` after `pnpm dev`. Both commands regenerate it, and `pnpm typecheck` passes without it.

### Why `react` is a root devDependency

The root renders nothing. It is there for the tooling that runs at the root: `eslint-plugin-react`'s
`version: "detect"` needs `react` resolvable, and the packages declare React as a _peer_, so they
need a development copy to typecheck against. The application resolves its own copy.
