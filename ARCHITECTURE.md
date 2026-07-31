# Architecture — astro-mine-ui

**Astro-Mine-UI is the fourth distribution** ([`conventions.md` §7.1](https://github.com/astro-mine/docs/blob/main/architecture/conventions.md)):
the platform ships one Python wheel, one CLI, one REST tier, and this — the front end. One workspace,
one build, one application.

The **normative design lives in the docs repository**, at
[`architecture/ui.md`](https://github.com/astro-mine/docs/blob/main/architecture/ui.md). This file
records the **repo-local** structure and the decisions taken standing the repository up (`ui#1`); it
summarizes the design rather than restating it.

> **Read `architecture/ui.md` with today's date in mind.** It currently describes the _retired_
> front end — a Vite single-page shell composing `Surface` plugin packages, three derived themes,
> visx and `react-router`. All of that is gone. `docs#92` rewrites it for what is actually built
> here; until that lands, the plan of record is
> [the UI rebuild plan](https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md).

## The layering is the product

```
   api-client      ui      view          packages/  — published, and they know nothing of the app
                    ↖      ↗
                 inspectors
                       ↑
                    console                apps/    — the application. Nothing sits above it.
```

Three rules, and they are the reason this repository is one workspace rather than five:

1. **The application may import any package.** It is the composition root.
2. **A package MUST NOT import the application.** The app is the sink. If the app holds something a
   package needs, the something is in the wrong place — move it down.
3. **A package MUST NOT import a sibling**, with exactly one exception: `inspectors` may import `ui`
   and `view`, because it renders artifacts and so needs the design system and — for a world — the
   globe. Two packages that need the same thing means the thing belongs in `ui` or `view`; and if it
   is _platform behaviour_, it belongs in the platform and then in the API, never in a front-end
   package wearing the wrong clothes.

**This is not merely documented.** [`scripts/check-layering.mjs`](scripts/check-layering.mjs) fails
the build on any violation, checking both what a package _declares_ in its manifest and what its
sources actually _import_ — including `import type`, because a type dependency is still a direction
in the graph, and including dynamic `import(...)`, because Cesium and the replay layer mount that
way and would otherwise be an unchecked back door. The permitted edges are an explicit allowlist in
that script; widening the graph is a deliberate edit to it, with a reason beside it.

[`scripts/check-layering.test.mjs`](scripts/check-layering.test.mjs) proves the gate can fail. A
check nobody has seen reject anything is a check nobody should trust, and with four skeleton packages
the real tree has no live violation to demonstrate — so each failure mode is proven against fixture
trees instead.

## Identity lives in the search params

The application is a **static export** (`output: 'export'`): a bundle any host serves, with no Node
process to run. The browser calls [`astro-mine-api`](https://github.com/astro-mine/astro-mine-api)
directly.

That choice has a consequence worth stating loudly, because it will look like an oddity to anyone
who arrives expecting idiomatic Next.js routing. `output: 'export'` pre-renders every route at build
time, so a **dynamic segment needs a closed, enumerable set of parameters** — and artifact names,
content digests, scenario ids and submission ids are none of those.

**So identity lives in the query string, not in the path:**

```
/registry/artifact?name=…&version=…     not  /registry/artifact/[name]/[version]
/bench/submission?id=…                  not  /bench/submission/[id]
```

This is enumerable, shareable, and honest about what the page is: a client of a live API, not a
pre-rendered document. Where a set genuinely _is_ closed, `generateStaticParams` is available;
nothing else may use a dynamic segment.

The other consequences of static export, so nobody rediscovers them: no server components doing data
work, no route handlers, no image optimizer (hence `images.unoptimized`), and **the API must send
CORS headers or the application is inert**.

## Layout

```
apps/console/                @astro-mine/console     the Next.js application (private, deployed)
packages/api-client/         @astro-mine/api-client  generated from the API's OpenAPI document
packages/ui/                 @astro-mine/ui          MUI theme + the honesty kit + every chart
packages/view/               @astro-mine/view        Cesium globe, MCAP replay, timeline, frames
packages/inspectors/         @astro-mine/inspectors  the artifact-kind → panel registry
scripts/check-layering.mjs   the dependency-direction gate
```

The workspace root is `private: true` and **publishes nothing**; only the packages that ship carry
the `@astro-mine` scope (`conventions.md` §13). `apps/console` carries the scope too and is
`private: true` with it — it is deployed as a built application, never consumed as a package.

The four packages are **skeletons today**, deliberately: each one builds and typechecks empty so the
workspace, the build graph and the layering gate are real before any of them is under pressure. Each
`src/index.ts` names the issue that fills it.

## The rules that outlive any one page

These are not decoration. Each exists because the platform found a way to mislead a reader, and each
is a named acceptance criterion on the issues that touch it
([the rebuild plan](https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md) §5):

1. **A stand-in must never look like the real thing** — labelled in place, not in a footnote.
2. **Uncertainty renders as uncertainty.** A null bound is an open mark, never a zero-length error
   bar, which asserts a precision nobody measured.
3. **Degrade visibly, never blank.** A missing backend is a _state_, with a reason and a remedy, and
   it stays in the navigation.
4. **The digest is the identity.** A tag is a query; the content address is what a reader pins.
5. **Provenance before interpretation.** What produced a number is read before the number is.
6. **Verification is claimed only where it happened.** Attestations _present in a registry_ are not a
   verified supply chain, and the words differ.
7. **Accessibility is a build gate**, not an aspiration.

And the one that governs every future page: **no platform capability originates in the front end**
(`conventions.md` §2). A page that needs new behaviour needs it in the platform, then in the API,
then here.

### The obligation the chart library creates

The old design used visx, where a second y-axis was unrepresentable and a null uncertainty bound
rendered as an open mark _by construction_. **MUI X Charts guarantees neither and ships no error
bars.** So the discipline becomes ours to enforce: `packages/ui` owns every chart the application
renders, exports no raw chart primitive, and carries unit tests asserting both properties. A rule
enforced only by review is a rule that erodes — which is why it is a test. It lands with `ui#4`.

## Stack

| Concern         | Standard                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Framework       | **Next.js 16** (app router), **static export**                                                           |
| Language / UI   | **TypeScript 5.9** · **React 19** · **Material UI 9**                                                    |
| Charts          | **MUI X Charts**, behind the honesty wrappers above (`ui#4`)                                             |
| 3D / replay     | `@astro-mine/view` (Cesium, MCAP), client-only (`ui#6`)                                                  |
| API access      | a generated client from the API's OpenAPI document (`ui#2`)                                              |
| Server state    | `fetch` through the generated client and one `AsyncState` discipline — **deliberately no cache library** |
| Package manager | **pnpm 11.10.0**, pinned in the workspace root                                                           |
| Tests           | **Vitest** + Testing Library + MSW · **Playwright** against the built export · **axe** (`ui#8`)          |

> **These pins are ahead of the docs.** `conventions.md` §2.1 and `architecture/ui.md` still specify
> Next 15, MUI 7 and React 18.3 with Vite and visx. Next 15 and MUI 7 were already two majors behind
> the registry when this repository was created, and a repository born two majors behind starts life
> owing an upgrade. TypeScript is held at 5.9 rather than 6 or 7 because `typescript-eslint` peers
> `<6.1.0`. `docs#92` records these numbers normatively; this table is the interim source of truth,
> and where the two disagree, **the docs are the ones to correct**.

## What this distribution must not do

1. **No platform capability originates here.** Restated because the temptation grows with the page
   count.
2. **No package imports the application**, and no package imports a sibling outside the one permitted
   edge.
3. **No second data-fetching stack.** The baseline ships none deliberately; the loading / error /
   **empty** discipline lives in `@astro-mine/ui`'s `AsyncState`.
4. **No raw chart primitive escapes `packages/ui`** (see the obligation above).
5. **No dynamic route segment** whose parameter set is not closed and enumerable (see identity, above).
