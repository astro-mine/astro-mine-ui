// The MSW server lifecycle, wired once (ui#8).
//
// `ui#2` generated the handlers; what was still hand-written in every suite that wanted them was the
// three-line `listen`/`resetHandlers`/`close` dance plus a `setupServer` call. `ui#8`'s acceptance
// criterion is that **a component test can mount any page with a faked API in under ten lines**, and
// three of those ten being lifecycle boilerplate is three lines each test can get subtly wrong —
// forgetting `resetHandlers` is the classic one, and it makes tests pass in file order and fail
// alone.
//
// This lives in `@astro-mine/api-client` and can live nowhere else. `@astro-mine/ui/testing` carries
// the render half of the harness, but a package may not import a sibling (ui.md §3), so `ui` cannot
// reach the client and the two halves cannot merge. A test imports one from each — which is the
// layering being visible rather than in the way.
//
// It is exported from `./testing`, never from `./index.js`: `msw` is a request interceptor and a
// page bundle must never carry one.

import { setupServer } from "msw/node";
import type { HttpHandler } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";

import { createMockApi, notStubbedHandlers, type MockApi } from "./generated/msw.gen.js";

export interface MockApiHarness {
  /** The typed per-operation handler factories, bound to `baseUrl`. */
  readonly api: MockApi;
  /** Install handlers for this test. Reset automatically after it. */
  readonly use: (...handlers: HttpHandler[]) => void;
  /** The underlying server, for the rare test that needs `boundary` or an event listener. */
  readonly server: ReturnType<typeof setupServer>;
}

/**
 * Stand up the faked API for a test file, and register its lifecycle.
 *
 * Call it at module scope; it registers `beforeAll`/`afterEach`/`afterAll` itself.
 *
 *     const { api, use } = mockApi();
 *
 *     it("renders what the registry returned", async () => {
 *       use(api.hubSearch({ body: [hit({ name: "excavator" })] }));
 *       renderLight(<ArtifactList />);
 *       expect(await screen.findByText("excavator")).toBeInTheDocument();
 *     });
 *
 * **`onUnhandledRequest: "error"` is the point of the whole thing.** A request the test did not stub
 * is a request the test did not think about, and the default — warn, then let it through to the real
 * network — turns that into a hang, a flake, or a silent pass. `notStubbedHandlers` is installed
 * underneath so an un-stubbed *known* operation answers a legible problem document rather than
 * falling through to the interceptor's own error.
 */
export function mockApi(baseUrl = "https://api.test"): MockApiHarness {
  const server = setupServer(...notStubbedHandlers(baseUrl));

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  // Back to the not-stubbed baseline between tests, so one test's stub cannot satisfy the next
  // test's assertion — the failure mode that makes a suite pass in order and fail in isolation.
  afterEach(() => server.resetHandlers(...notStubbedHandlers(baseUrl)));
  afterAll(() => server.close());

  return {
    api: createMockApi(baseUrl),
    use: (...handlers: HttpHandler[]) => server.use(...handlers),
    server,
  };
}
