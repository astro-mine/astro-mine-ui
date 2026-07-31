# astro-mine-ui

**The Astro-Mine front end** — the fourth and last of the platform's four distributions. One
workspace, one application, one build.

Astro-Mine is an open-source platform for designing, simulating and operating large heterogeneous
robotic swarms — orbiters, landers, rovers, hoppers, excavators, haulers and ISRU plants — for
exploration and in-situ resource utilization on the Moon, Mars and small bodies. This repository is
its graphical front door: a statically exported Next.js application that calls
[`astro-mine-api`](https://github.com/astro-mine/astro-mine-api) from the browser, plus the
`@astro-mine/*` packages it is built from.

> **Status: stood up, not yet built out.** The workspace, the application shell, the package
> skeletons and the CI gates exist. **No page has been written and nothing calls the API yet.** The
> front end is being _rebuilt_ — not moved — from the four repositories it used to live in; the work
> is tracked in
> [the UI rebuild plan](https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md) over
> Waves 28–30.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # → apps/console/out, a static bundle any host can serve
```

Node ≥ 20.19 and pnpm 11.10.0 (`corepack enable`). No registry credential is needed —
see [CONTRIBUTING.md](CONTRIBUTING.md).

## What is in here

| Path                  | Package                  | What it is                                                                                              |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `apps/console`        | `@astro-mine/console`    | The application. Next.js 16, app router, static export, Material UI. Private: deployed, never consumed. |
| `packages/api-client` | `@astro-mine/api-client` | The generated TypeScript client for the REST tier. The OpenAPI document is the contract.                |
| `packages/ui`         | `@astro-mine/ui`         | The design system — theme, the honesty kit, and every chart the app renders.                            |
| `packages/view`       | `@astro-mine/view`       | The Cesium globe, MCAP replay, timeline and frames. Client-only.                                        |
| `packages/inspectors` | `@astro-mine/inspectors` | The artifact-kind → panel registry.                                                                     |

The four packages are deliberately **empty skeletons**: each builds and typechecks so the workspace,
the build graph and the layering gate are real now, rather than being assembled later under pressure.
Each `src/index.ts` names the issue that fills it.

## The one rule

Dependencies point one way — the application may import any package, no package may import the
application, and no package may import a sibling except `inspectors`, which may use `ui` and `view`.

That is enforced by [`scripts/check-layering.mjs`](scripts/check-layering.mjs) in CI, not by review,
and [its own tests](scripts/check-layering.test.mjs) prove it can fail. See
[ARCHITECTURE.md](ARCHITECTURE.md) for that and for the other consequence worth knowing before you
write a route: because the app is a **static export**, page identity lives in the **query string**,
not in a dynamic path segment.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — the repo-local structure and the decisions behind it.
- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, the check chain, and where code goes.
- [`architecture/ui.md`](https://github.com/astro-mine/docs/blob/main/architecture/ui.md) — the
  normative design. _Currently describes the retired front end; `docs#92` rewrites it._
- [`conventions.md`](https://github.com/astro-mine/docs/blob/main/architecture/conventions.md) —
  cross-cutting standards (§2.1 the front-end baseline, §7.1 the four distributions, §13 naming).

## License

Apache-2.0 — see [LICENSE](LICENSE).
