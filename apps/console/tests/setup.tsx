// Test setup for the application's component lane (ui#5).

import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { resetColorScheme } from "@astro-mine/ui/testing";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, vi } from "vitest";

import { resetRouter } from "./router";

// **Testing Library's one-second default is too tight for what these tests actually do**, and the
// symptom was a suite that failed roughly one run in three on assertions that were never wrong.
//
// A page test here is not "render and assert": it resolves the runtime configuration, builds a
// client, issues one or more requests through an MSW interceptor, and re-renders a tree of MUI
// controls — all under jsdom, on a Windows drive. Four seconds is comfortably inside that and still
// far short of Vitest's own per-test timeout, so a genuinely hung assertion still fails as a
// failure rather than sitting there.
//
// This raises the ceiling; it does not add a wait. A passing assertion still resolves on its first
// poll.
configure({ asyncUtilTimeout: 4000 });

// **`next/navigation`, bound to the test router.** An async factory with a dynamic import, rather
// than a factory closing over an imported binding: `vi.mock` is hoisted above the imports, so a
// direct reference would be read before it exists.
vi.mock("next/navigation", async () => {
  const { router } = await import("./router");
  return {
    usePathname: () => router.pathname,
    useSearchParams: () => router.searchParams,
    useRouter: () => router,
  };
});

// **`next/link`, as the anchor it renders to.** The real one reaches for the app router's context
// for prefetching, which does not exist outside a Next application — and what every test here cares
// about is the `href` it renders and the click it handles, both of which a plain anchor has.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// **The globe never mounts in this lane, and reaching Cesium fails loudly rather than flakily.**
//
// `conventions.md` §11: "The two lanes stay separate — WebGL has no `jsdom` context, so anything
// touching a canvas belongs in Playwright, not Vitest." Nothing enforced that here, and
// `GlobeScene` constructs a real Cesium `Viewer` in a `useEffect`. jsdom has no WebGL, so the
// widget threw, the component unmounted, and whatever the test was actually asserting never
// rendered.
//
// It failed *intermittently* — one or two tests depending on machine load — because the effect only
// reaches the constructor if it fires before the test finishes. That is the dangerous shape: a
// violated rule that reads as flake and gets retried rather than fixed (ui#68).
//
// Two mocks, doing different jobs:
//
// 1. The globe components render inert. `GlobeScene`'s children are layer components that resolve
//    a Cesium scene through context, so they are stubbed too — `SwarmLayer` calls
//    `useEntityLayer()`, which throws without an `<EntityLayer>` above it. Everything else in the
//    package stays real, `geodeticToCartesian` and `IDENTITY_QUAT` included: those are arithmetic,
//    the console imports them, and they have no business being stubbed.
//
// 2. Cesium's `Viewer` becomes a constructor that throws *naming the rule*. This is the enforcement
//    half. If a future test reaches a real viewer by some other path, it fails immediately with an
//    actionable message instead of a WebGL error three frames deep in a widget. The rest of Cesium
//    is left alone, because the package still has to import.
//
// The 3D pane's real coverage is the Playwright lane, against the built export, and is untouched.
vi.mock("cesium", async (importOriginal) => {
  const actual = await importOriginal<typeof import("cesium")>();
  return {
    ...actual,
    Viewer: class {
      constructor() {
        throw new Error(
          "A Vitest test constructed a Cesium Viewer. WebGL has no jsdom context, so anything " +
            "touching a canvas belongs in the Playwright lane, not this one (conventions.md §11). " +
            "If a component under test renders a globe, stub it — see apps/console/tests/setup.tsx.",
        );
      }
    },
  };
});

vi.mock("@astro-mine/view", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@astro-mine/view")>();
  return {
    ...actual,
    GlobeScene: ({ children }: { children?: ReactNode }) => (
      <div data-testid="globe-scene-stub">{children}</div>
    ),
    EntityLayer: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SwarmLayer: () => null,
  };
});

// jsdom implements no layout, so `matchMedia` is absent — and MUI asks for it. Every query answers
// "no", which is the honest answer for a viewport that does not exist: the responsive drawer is
// asserted through the props that drive it rather than through a media query that cannot resolve.
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
  resetRouter();
  resetColorScheme();
});
