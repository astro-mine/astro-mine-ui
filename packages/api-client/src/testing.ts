// @astro-mine/api-client/testing — the fake, generated from the same document as the client.
//
// A separate entry point, and that separation is load-bearing: `msw` is a request interceptor, and
// a page bundle must never carry one. Importing this from application code would pull it in, which
// is why `msw` is an optional peer dependency and why nothing under `./index.js` reaches here.
//
// Every component test in this workspace runs against these handlers (ui-rebuild-plan §6). Because
// the reply type is the document's response type, a fixture that stops matching the API fails to
// compile — the fake cannot drift any more than the client can.
//
// `mockApi()` is the front door — it stands the server up and registers its own lifecycle, so a test
// spends its lines on the assertion rather than on `listen`/`resetHandlers`/`close`:
//
//     const { api, use } = mockApi();
//     use(api.hubSearch({ body: [...] }));
//
// `createMockApi` and `notStubbedHandlers` remain exported for the suites that drive `setupServer`
// themselves — the client's own tests do, because they are testing the transport rather than using
// it.

export { mockApi } from "./harness.js";
export type { MockApiHarness } from "./harness.js";
export { createMockApi, notStubbedHandlers } from "./generated/msw.gen.js";
export type { MockApi } from "./generated/msw.gen.js";
export { toMswPath } from "./msw-runtime.js";
export type { ProblemInit, Reply, ReplyOrResolver } from "./msw-runtime.js";
