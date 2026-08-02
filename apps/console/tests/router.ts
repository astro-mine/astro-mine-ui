// The router, as the tests drive it (ui#5).
//
// The shell reads three things from Next's navigation hooks — the pathname, the query string and a
// way to move — and every acceptance criterion about focus, announcement, active entries and chords
// is a statement about what happens when one of them changes. So they are a mutable object a test
// writes to, rather than a real router: the alternative is mounting the app router in jsdom, which
// is a great deal of machinery to observe three values.
//
// `tests/setup.tsx` binds `next/navigation` to this. A test sets `router.pathname`, re-renders, and
// asserts.

import { vi } from "vitest";

export interface TestRouter {
  pathname: string;
  searchParams: URLSearchParams;
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
}

export const router: TestRouter = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

/** Put the router back where every test expects to find it. Called from the global `afterEach`. */
export function resetRouter(): void {
  router.pathname = "/";
  router.searchParams = new URLSearchParams();
  router.push.mockReset();
  router.replace.mockReset();
  router.prefetch.mockReset();
  router.back.mockReset();
  router.forward.mockReset();
  router.refresh.mockReset();
}

/** Point the router at a location, query string included. */
export function goTo(url: string): void {
  const [pathname, query = ""] = url.split("?");
  router.pathname = pathname ?? "/";
  router.searchParams = new URLSearchParams(query);
}
