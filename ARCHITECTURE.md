# Architecture — astro-mine-ui

**Astro-Mine-UI is the fourth distribution** ([`conventions.md` §7.1](https://github.com/astro-mine/docs/blob/main/architecture/conventions.md)):
the platform ships one Python wheel, one CLI, one REST tier, and this — the front end. One workspace,
one build, one application.

The **normative design lives in the docs repository**, at
[`architecture/ui.md`](https://github.com/astro-mine/docs/blob/main/architecture/ui.md). This file
records the **repo-local** structure and the decisions taken standing the repository up (`ui#1`); it
summarizes the design rather than restating it.

`docs#92` rewrote `architecture/ui.md` for what is actually built here and retired the separate
console design document — there is no "console" distinct from the application, because the shell
_is_ the app. Its §11 records what went and why. The execution plan is
[the UI rebuild plan](https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md), which is
point-in-time and read as history.

## The layering is the product

```
   api-client      ui      view          packages/  — published, and they know nothing of the app
                    ↖      ↗
                 inspectors
                       ↑
                    console                apps/    — the application. Nothing sits above it.
```

Four rules, and they are the reason this repository is one workspace rather than five:

1. **The application may import any package.** It is the composition root.
2. **A package MUST NOT import the application.** The app is the sink. If the app holds something a
   package needs, the something is in the wrong place — move it down.
3. **A package MUST NOT import a sibling**, with exactly one exception: `inspectors` may import `ui`
   and `view`, because it renders artifacts and so needs the design system and — for a world — the
   globe. Two packages that need the same thing means the thing belongs in `ui` or `view`; and if it
   is _platform behaviour_, it belongs in the platform and then in the API, never in a front-end
   package wearing the wrong clothes.
4. **A restricted third-party package may be reached only by the package that owns it.** There is
   one: **`@mui/x-charts` belongs to `@astro-mine/ui`.** The design system owns every chart the
   application renders, so a page that imports the chart library directly is a chart with no
   uncertainty discipline — see the obligation below. If the chart you need is not in `@astro-mine/ui`,
   add it there, with its tests, and import it from there.

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

### The one permitted sibling edge, and why `inspectors` declines half of it

Rule 3 permits `inspectors → ui` **and** `inspectors → view`. `ui#7` took the first and declined the
second, which is worth recording because the diagram above still draws both.

`@astro-mine/view` publishes exactly one entry, and that entry re-exports its Cesium module — the
package says so deliberately, so that every consumer arrives through the one `"use client"`
boundary. The consequence is that importing _anything_ from it puts Cesium in the importer's graph.
`@astro-mine/inspectors` is imported by the registry pages, so a static import there would put four
megabytes into the first paint of every page that renders an artifact row, and CI already asserts
that the Cesium chunk is preloaded by **no** prerendered route.

The application is where that is solved, once: `apps/console/src/components/Globe.tsx` is the single
`next/dynamic`, `ssr: false`, `CESIUM_BASE_URL` mount, and the layering script's own rejection text
says a second importer inherits none of its care. So an inspector panel **is handed** a mounted
globe through `InspectorSlots` and arranges it; it does not summon one. The edge stays permitted —
a future consumer of View's pure `frames` subtree would take it legitimately — and
`packages/inspectors/tests/surface.test.ts` asserts the manifest declares no dependency on View, so
the decision is a test rather than a memory.

## Vocabularies that live in Python

Two of the front end's types are not the front end's to define. Core owns `PluginKind` — which
interface a plugin implements — and Hub owns the container vocabulary — what shape of payload an
artifact carries. They are **two axes and not one**: they overlap on four names, diverge everywhere
else, and no total map between them exists, because a served surrogate is `field_model` or
`regime_engine` by physics domain. The artifact inspector registry resolves on both.

They are Python — a `StrEnum` and a tuple — and TypeScript can import neither, so they are
**generated** into `packages/inspectors/src/generated/vocabularies.ts` from a pin that records the
platform commit and the members it read. That buys the thing worth having: a contribution for a kind
the platform does not have is a compile error, not a panel that never appears.

- **`pnpm codegen:vocabularies`** — pin → TypeScript. Offline and deterministic; the output is
  committed, so a clean clone builds with no Python in sight.
- **`pnpm codegen:vocabularies --refresh`** — re-read the platform at HEAD and repin.
- **`pnpm check:vocabularies`** — the gate. The committed TypeScript is what the pin generates, and
  the pinned members are what the platform declares **at its default-branch HEAD**.

That last word is the difference between a drift guard and a tamper check, and it is a deliberate
divergence from [`check-core-schema.mjs`](scripts/check-core-schema.mjs), which reads its vendored
files at the SHA its own pin names and therefore cannot see its upstream move. The cost is real: a
`PluginKind` added upstream turns this lane red on an unrelated pull request here. That is the alarm
working, and the fix is one command.

What is vendored is the **members**, not the modules. `hub/registry/_oci.py` is four hundred lines
that change constantly for reasons having nothing to do with the vocabulary, and a byte-equality
guard over it would go red on every unrelated edit — a guard that cries wolf is a guard somebody
mutes. A missing credential, a file that has moved, or a class that has been renamed is a **hard
failure**, never a skip: a compatibility check that goes quiet when its subject disappears has
stopped existing, and it goes quiet on exactly the day nobody is looking.
[`scripts/check-vocabularies.test.mjs`](scripts/check-vocabularies.test.mjs) proves each of those
rejections against fixture sources.

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
scripts/check-vocabularies.mjs  the Core/Hub vocabulary drift gate
```

The workspace root is `private: true` and **publishes nothing**; only the packages that ship carry
the `@astro-mine` scope (`conventions.md` §13). `apps/console` carries the scope too and is
`private: true` with it — it is deployed as a built application, never consumed as a package.

All four packages are filled: `api-client` (`ui#2`), `ui` (`ui#3`, `ui#4`), `view` (`ui#6`) and
`inspectors` (`ui#7`). They were stood up as skeletons that built and typechecked empty, so the
workspace, the build graph and the layering gate were real before any of them was under pressure —
which is how the gates arrived with the packages rather than after them.

### Colour lives in the theme

`packages/ui/src/theme.ts` holds the one theme — light and dark, carried by MUI's `colorSchemes` —
and it is **the only file in the workspace that may contain a colour value**. ESLint rejects colour
literals everywhere else, because a colour written into a component is a colour the gates cannot see.

Two gates measure it, and neither implies the other:

- **`pnpm check:contrast`** — can a mark be seen _against the page_? Every pairing the theme declares,
  measured against WCAG 2.1 in both schemes, with the categorical chart colours held to the non-text
  floor (1.4.11).
- **`pnpm check:palette`** — can two marks be told apart _from each other_? Every pair of the
  categorical ramp, in both schemes, seen through normal vision and through protanopia, deuteranopia
  and tritanopia, measured in CIEDE2000. Five colours can each clear 3:1 against white and be one
  colour to a reader with a red-green deficiency; that is the failure a contrast check cannot see.

Both carry their own proof that they can reject — a contrast pair that fails WCAG, and a pair a
deuteranope cannot separate. The categorical ramp has **five** entries because that is what those two
constraints leave room for; `theme.ts` records the reasoning beside it.

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
enforced only by review is a rule that erodes — which is why it is a test.

`ui#4` landed it. Three charts — `BarChart`, `ScatterChart`, `ParallelCoordinates` — and four things
holding the property that used to hold itself:

- **A null bound renders as an open mark**, dashed and closed by nothing, on every chart that takes a
  bound. A bound of **`0` is a measurement** and draws a real, capped, zero-length interval; the two
  are never collapsed. Asserted per chart, in both colour schemes.
- **A second y-axis is not expressible.** The charts take labels and units, never axis objects.
  Asserted by `packages/ui/tests/types.test-d.ts`, which `tsc` runs as part of `pnpm typecheck`: a
  `@ts-expect-error` that stops erroring fails the build.
- **No page reaches past the design system** — rule 4 above, enforced by the layering gate over both
  manifests and sources, subpaths and type-only imports included.
- **Each chart's words are its own.** MUI X renders its SVG `aria-hidden`, so every chart is a
  `<figure>` whose `<figcaption>` carries the full description — including which values carry no
  measured bound — and interaction is offered through real buttons outside the graphic.

## Stack

| Concern         | Standard                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Framework       | **Next.js 16** (app router), **static export**                                                           |
| Language / UI   | **TypeScript 5.9** · **React 19** · **Material UI 9**                                                    |
| Theme           | One theme, **light and dark only** via MUI `colorSchemes`; colour lives in `packages/ui/src/theme.ts`    |
| Charts          | **MUI X Charts**, behind the honesty wrappers above — private to `packages/ui`                           |
| 3D / replay     | `@astro-mine/view` (Cesium, MCAP), client-only (`ui#6`)                                                  |
| API access      | a generated client from the API's OpenAPI document (`ui#2`)                                              |
| Server state    | `fetch` through the generated client and one `AsyncState` discipline — **deliberately no cache library** |
| Package manager | **pnpm 11.10.0**, pinned in the workspace root                                                           |
| Tests           | **Vitest** + Testing Library + MSW · **Playwright** against the built export · **axe** (`ui#8`)          |

> **`conventions.md` §2.1 is the normative source for these pins**, and it now names exactly the
> numbers above — `docs#92` read them off this repository after it was stood up two majors ahead of
> what the docs then specified. This table is a convenience copy; where the two disagree, the
> convention wins. TypeScript is held below 6.1 because `typescript-eslint` 8 peers `<6.1.0` — a
> live constraint, not a stale pin.

## What this distribution must not do

1. **No platform capability originates here.** Restated because the temptation grows with the page
   count.
2. **No package imports the application**, and no package imports a sibling outside the one permitted
   edge.
3. **No second data-fetching stack.** The baseline ships none deliberately; the loading / error /
   **empty** discipline lives in `@astro-mine/ui`'s `AsyncState`.
4. **No raw chart primitive escapes `packages/ui`** (see the obligation above).
5. **No dynamic route segment** whose parameter set is not closed and enumerable (see identity, above).
