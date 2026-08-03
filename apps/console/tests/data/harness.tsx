// Mounting a page-level hook with a configured deployment behind it (Wave 29).
//
// Every data hook reads the runtime configuration through `useRuntimeConfig`, so a test that wants
// a client has to put a provider above it — and `RuntimeConfigProvider` takes an injectable loader
// precisely so no test has to stub global `fetch` to do that.
//
// **The base URL matches `mockApi()`'s default** (`https://api.test`), which is what makes the two
// halves of the harness meet: the fake intercepts that origin, and the provider builds a client
// pointed at it.

import type { RuntimeConfigState } from "@astro-mine/api-client";
import { renderLight } from "@astro-mine/ui/testing";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import { RuntimeConfigProvider } from "@/shell/runtimeConfig";

/** The origin `mockApi()` binds its handlers to. */
export const API_BASE_URL = "https://api.test";

export const CONFIGURED: RuntimeConfigState = {
  status: "configured",
  config: { apiBaseUrl: API_BASE_URL },
};

export const UNCONFIGURED: RuntimeConfigState = {
  status: "unconfigured",
  reason: "No `config.json` was found beside the application.",
  remedy: 'Create `config.json` containing {"apiBaseUrl": "https://your-api.example.org"}.',
};

/** A loader that resolves to one state — `config.json`, standing still. */
export const loaderFor = (state: RuntimeConfigState) => vi.fn(async () => state);

/** A loader that never resolves — the cold-load window, held open. */
export const neverLoads = () => vi.fn(() => new Promise<RuntimeConfigState>(() => {}));

/**
 * `ui`, wrapped in a deployment — as an element, not rendered.
 *
 * For `forEachColorScheme`, which renders what it is given: handing it a bare page would mount one
 * with no `RuntimeConfigProvider` above it, so every read would sit at `loading` forever and the
 * axe run would assert against a spinner.
 */
export function withApi(ui: ReactElement, state: RuntimeConfigState = CONFIGURED): ReactElement {
  return <RuntimeConfigProvider load={loaderFor(state)}>{ui}</RuntimeConfigProvider>;
}

/** Render `ui` under a deployment in the given configuration state. */
export function renderWithApi(
  ui: ReactElement,
  state: RuntimeConfigState = CONFIGURED,
): RenderResult {
  return renderLight(withApi(ui, state));
}

/** Render `ui` under a deployment whose configuration has not resolved yet. */
export function renderWhileLoading(ui: ReactElement): RenderResult {
  return renderLight(<RuntimeConfigProvider load={neverLoads()}>{ui}</RuntimeConfigProvider>);
}
