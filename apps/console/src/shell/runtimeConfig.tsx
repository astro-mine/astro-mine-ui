"use client";

// The deployment's configuration, and the client built from it (ui#5; ui.md §7 honesty rule 3).
//
// **A missing backend is a state, not a missing feature.** The application ships with no endpoint
// baked in — that is the point of a static export, and `apps/console/public/config.json` is
// untracked by construction — so the very first thing a reader can encounter is an application with
// nothing to talk to. What they must not encounter is a blank page, a hidden nav, or a spinner that
// never resolves.
//
// So this provider does three things and no more: read `config.json` once, hold the outcome as a
// **state** with a reason and a remedy, and hand pages a client when there is one to hand them. It
// opens no request of its own — `loadRuntimeConfig` is the api-client's job, and the workspace gate
// (`scripts/check-no-handwritten-api-types.mjs`) enforces that nothing outside that package does.
//
// **`load` is injectable** so tests drive the four outcomes without stubbing global `fetch`. That is
// not only a testing convenience: a test that reaches for `globalThis.fetch` is a test that would
// keep passing if a page started opening its own requests, which is the thing the gate exists to
// stop.

import {
  createApiClient,
  isAbortError,
  loadRuntimeConfig,
  type ApiOperations,
  type RuntimeConfigState,
} from "@astro-mine/api-client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * What the shell knows about the backend.
 *
 * `loading` is its own arm rather than a null state, because "we have not looked yet" and "we
 * looked and there is nothing" call for different words on the screen, and collapsing them is how a
 * correctly-configured deployment ends up flashing "not configured" on every cold load.
 */
export type RuntimeConfigStatus = { status: "loading" } | RuntimeConfigState;

export interface RuntimeConfigValue {
  readonly state: RuntimeConfigStatus;
  /** The client, when there is an endpoint to point it at. `undefined` otherwise. */
  readonly client: ApiOperations | undefined;
}

const RuntimeConfigContext = createContext<RuntimeConfigValue>({
  state: { status: "loading" },
  client: undefined,
});

export interface RuntimeConfigProviderProps {
  readonly children: ReactNode;
  /** Overridden by tests. Defaults to the api-client's own loader. */
  readonly load?: typeof loadRuntimeConfig;
}

export function RuntimeConfigProvider({
  children,
  load = loadRuntimeConfig,
}: RuntimeConfigProviderProps) {
  const [state, setState] = useState<RuntimeConfigStatus>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    void load({ signal: controller.signal }).then(
      (result) => {
        if (live) setState(result);
      },
      (error: unknown) => {
        // The loader's contract is that it rejects only on an abort the caller asked for. Anything
        // else arriving here is a bug in the loader, and swallowing it would hide it — so it is
        // re-raised rather than folded into a tidy "unconfigured".
        if (!isAbortError(error)) throw error;
      },
    );

    return () => {
      live = false;
      controller.abort();
    };
  }, [load]);

  const value = useMemo<RuntimeConfigValue>(
    () => ({
      state,
      client:
        state.status === "configured"
          ? createApiClient({ baseUrl: state.config.apiBaseUrl })
          : undefined,
    }),
    [state],
  );

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
}

/** The configuration state — what to say to the reader when there is nothing to talk to. */
export function useRuntimeConfig(): RuntimeConfigValue {
  return useContext(RuntimeConfigContext);
}

/**
 * The API client, or `undefined` when the deployment has none.
 *
 * Deliberately not a throwing accessor. A page that cannot reach the API still has to render — with
 * its navigation, its heading and an explanation — and an accessor that threw would push every page
 * into a try/catch to achieve what a nullable value achieves by being read.
 */
export function useApiClient(): ApiOperations | undefined {
  return useContext(RuntimeConfigContext).client;
}
