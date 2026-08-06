# astro-mine-ui

**The Astro-Mine front end** — the fourth and last of the platform's four distributions. One
workspace, one application, one build.

Astro-Mine is an open-source platform for designing, simulating and operating large heterogeneous
robotic swarms — orbiters, landers, rovers, hoppers, excavators, haulers and ISRU plants — for
exploration and in-situ resource utilization on the Moon, Mars and small bodies. This repository is
its graphical front door: a statically exported Next.js application that calls
[`astro-mine-api`](https://github.com/astro-mine/astro-mine-api) from the browser, plus the
`@astro-mine/*` packages it is built from.

> **Status: the application is built, and it deploys.** Every page in the information architecture
> exists and calls the API through the generated client; the browser lane drives one journey per
> persona against a real seeded `astro-mine-api`, and accessibility is a gate rather than an
> aspiration. The front end was _rebuilt_ — not moved — from the four repositories it used to live
> in, and what remains of that is retiring them
> ([`docs#93`](https://github.com/astro-mine/docs/issues/93)). The work is recorded in
> [the UI rebuild plan](https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md) over
> Waves 28–30.
>
> The repositories are **private during incubation**, so nothing here is installable by an outsider
> yet — see [What this workspace publishes](#what-this-workspace-publishes).

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # → apps/console/out, a static bundle any host can serve
```

Node 24 (`.nvmrc`, `engines`) and pnpm 11.10.0 (`corepack enable`). No registry credential is needed
— see [CONTRIBUTING.md](CONTRIBUTING.md).

To point the dev server or a build at an API, write `apps/console/public/config.json`:

```json
{ "apiBaseUrl": "http://localhost:8000" }
```

It is untracked by construction. Without it the application runs **unconfigured** and every page says
so, with a remedy — that is the honest state, not a broken one.

## What is in here

| Path                  | Package                  | What it is                                                                                              |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `apps/console`        | `@astro-mine/console`    | The application. Next.js 16, app router, static export, Material UI. Private: deployed, never consumed. |
| `packages/api-client` | `@astro-mine/api-client` | The generated TypeScript client for the REST tier. The OpenAPI document is the contract.                |
| `packages/ui`         | `@astro-mine/ui`         | The design system — theme, the honesty kit, and every chart the app renders.                            |
| `packages/view`       | `@astro-mine/view`       | The Cesium globe, MCAP replay, timeline and frames. Client-only.                                        |
| `packages/inspectors` | `@astro-mine/inspectors` | The artifact-kind → panel registry.                                                                     |

## Run what ships

The deployable is a **directory**, and the endpoint is **not in it**.

```bash
pnpm build                                   # → apps/console/out
echo '{"apiBaseUrl":"http://localhost:8000"}' > apps/console/out/config.json
pnpm dlx serve apps/console/out              # or any static host at all
```

No Node process runs behind it. `config.json` is read at boot from the root of the deployment, so
**changing the API address is a file edit, never a rebuild** — the same bundle serves two
deployments, which is what makes it deployable by somebody who did not build it.
`e2e/deployment.spec.ts` asserts exactly that, and sweeps every route for a request that leaves the
origin: no CDN, no font host, no beacon. Cesium's workers and WebAssembly are served by the
deployment, staged into the build rather than fetched.

Because the browser calls the API from another origin, **the API must send CORS headers** or the
application loads and can do nothing.

For the hosted tier there is an image, which adds the one thing a bucket cannot do for itself — put
`config.json` in place at container start:

```bash
docker build -t astro-mine-ui .
docker run --rm -p 8080:8080 astro-mine-ui                                        # unconfigured
docker run --rm -p 8080:8080 -e ASTRO_MINE_API_BASE_URL=https://api.example.org astro-mine-ui
```

An unset variable writes nothing and serves the honest unconfigured state; a mounted `config.json`
is left alone; a malformed URL fails the container at start rather than degrading quietly. See
[ARCHITECTURE.md → How it deploys](ARCHITECTURE.md#how-it-deploys).

## What this workspace publishes

**Nothing, today** — a decision, not an omission.

`@astro-mine/console` is an application: deployed, never consumed. The four libraries build, are
gated, and are **not published**, because the `Surface` contract that gave them external consumers is
retired and `docs#93` retires the repositories that held them; a release train with nothing on the
other end costs a hand-set version and a tag per cut and buys optionality nobody is waiting on. Each
manifest still pins `publishConfig.registry` to GitHub Packages — a safety control, so the scope
cannot resolve to npmjs.com even on a machine holding a public-npm token, and so the destination is
already right the day a consumer appears. The image is likewise built and verified, not pushed.

Public npm publication is deferred to the public flip
([`VERSIONING.md`](https://github.com/astro-mine/docs/blob/main/VERSIONING.md) §6).

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
  normative design, and the front end's design authority.
- [`conventions.md`](https://github.com/astro-mine/docs/blob/main/architecture/conventions.md) —
  cross-cutting standards (§2.1 the front-end baseline, §7.1 the four distributions, §13 naming).

## License

Apache-2.0 — see [LICENSE](LICENSE).
