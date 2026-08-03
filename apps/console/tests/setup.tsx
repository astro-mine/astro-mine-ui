// Test setup for the application's component lane (ui#5).

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { resetColorScheme } from "@astro-mine/ui/testing";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, vi } from "vitest";

import { resetRouter } from "./router";

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
