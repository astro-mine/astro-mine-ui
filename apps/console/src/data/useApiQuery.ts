"use client";

// Reading from the API, once, in the shape every page needs (Wave 29).
//
// `@astro-mine/api-client` ships no React binding on purpose — it is a leaf in the layering graph,
// and `conventions.md` §2.1 carries no data-fetching library because these screens are read-mostly
// and human-paced. That decision is right and this file is what it costs: the effect, abort and
// state machine that would otherwise be written into twelve pages.
//
// **Written twelve times, it would be got subtly wrong at least twice.** The three mistakes this
// exists to make unavailable:
//
//   1. **A request outliving its page.** Every query aborts on unmount and on any dependency
//      change. ui#14 makes this an acceptance criterion in as many words, and it is equally true of
//      a reader typing in the search box: without it, an early response can land after a late one
//      and the page shows the wrong results with no way to tell.
//   2. **Rendering an abort as an error.** A page that navigates away cancels its own requests, and
//      the rejection that follows is not a failure to report. Shown, it reads as "something went
//      wrong" to a reader who did nothing but click a link.
//   3. **Confusing "no API configured" with "the API said no".** The remedies could not be more
//      different — one is a deployment that was never wired up, the other is a live answer — and
//      collapsing them is honesty rule 3's exact failure mode. `unconfigured` is its own arm, and
//      it carries the loader's reason and remedy rather than a message of ours.
//
// **Only the settled outcome is state; every other arm is derived during render.** That is not a
// stylistic preference — it is what makes this hook free of `setState` in an effect body, which
// `react-hooks/set-state-in-effect` rejects and which really would cost a cascading render on every
// mount. The settled value is stored *with the signature of the request that produced it*, so a
// result belonging to a superseded request simply fails to match and reads as `loading` again. No
// reset, no second render, and no window in which last query's answer is displayed under this
// query's question.
//
// What this is not: a cache, a retry policy, or a store. Two pages reading the same artifact issue
// two requests, and that is fine at this scale. When it stops being fine, that is a documented
// change to the baseline rather than an import (`conventions.md` §2.1).

// API shapes are imported in a dedicated `import type` statement, here and everywhere in the
// application. `scripts/check-no-handwritten-api-types.mjs` scans for a line beginning `type Name`
// to catch a hand-copied schema mirror, and an inline `type Foo,` inside a mixed import list is
// indistinguishable from one to that scan. One line, one import kind, no false positive.
import type { ApiOperations, RuntimeConfigState } from "@astro-mine/api-client";
import { isAbortError } from "@astro-mine/api-client";
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

import { useRuntimeConfig } from "@/shell/runtimeConfig";

import { failureOf, type Failure } from "./problems";

/**
 * What a page knows about one read.
 *
 * `idle` and `loading` are separate arms rather than one nullable, for the same reason
 * `RuntimeConfigProvider` splits them: *we have not asked* and *we asked and are waiting* call for
 * different words. A page keyed on a query string with no subject in the address is `idle` — that
 * is a legitimate state with its own empty message, not a spinner that never resolves.
 */
export type ApiQuery<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  /** There is no client to call with. Carries the loader's own reason and remedy. */
  | { readonly status: "unconfigured"; readonly config: RuntimeConfigState }
  | { readonly status: "failed"; readonly failure: Failure }
  | { readonly status: "ready"; readonly data: T };

/** The two arms a request can actually finish in. The rest are properties of the situation. */
type Settled<T> =
  | { readonly status: "failed"; readonly failure: Failure }
  | { readonly status: "ready"; readonly data: T };

export interface ApiQueryOptions<T> {
  /**
   * Whether to run at all. Defaults to `true`.
   *
   * The escape hatch for a page whose subject comes from the address: `/registry/artifact` with no
   * `name` has nothing to fetch, and firing a request with `undefined` interpolated into the path
   * would turn a legitimately empty page into a 404 the reader has to interpret.
   */
  readonly enabled?: boolean;
  /**
   * Re-run this often, in milliseconds. Omit — or pass `undefined` — for a one-shot read.
   *
   * **The interval is the caller's, and stopping is the caller's too.** A job that has reached a
   * terminal state must stop being polled, and only the page knows what terminal means for its
   * route; passing `undefined` once it does is how that is expressed. The timer is cleared on
   * unmount and whenever the subject changes, so ui#14's *"polling stops when the page is left; no
   * request outlives its page"* holds by construction rather than by a page remembering to tear
   * down its own timer.
   *
   * **A poll does not flash a spinner.** The tick is deliberately outside the request's signature,
   * so a refresh replaces the settled value in place; including it would make every poll look like
   * a fresh load and the panel would blink once a second.
   */
  readonly refreshMs?: number;
  /**
   * Keep polling only while this says so. Evaluated against the most recent successful answer.
   *
   * ```ts
   * { refreshMs: 3000, refreshWhile: (job) => !TERMINAL.has(job.status) }
   * ```
   *
   * **The stopping condition belongs here rather than in the page**, because a page that computes
   * it has to feed its own result back into its own options — which is either a render-phase
   * `setState` or a second copy of the same query. Neither is worth it for a boolean the hook can
   * see. A page that keeps polling a job that finished twenty minutes ago is a page nobody notices
   * is spending a request every three seconds.
   */
  readonly refreshWhile?: (data: T) => boolean;
}

/** React's own dependency comparison: same length, `Object.is` element-wise. */
function sameSignature(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Run one operation and report what happened.
 *
 * ```ts
 * const query = useApiQuery((api, signal) => api.hubSearch({ query: { text } }, { signal }), [text]);
 * ```
 *
 * `deps` is the dependency list for the *request*, exactly as `useEffect`'s is: list every value
 * the callback closes over that should cause a refetch. The callback itself is deliberately **not**
 * a dependency — it is a fresh closure on every render, and depending on it would refetch forever.
 * That is the one thing a caller must get right, and it is why `deps` is required rather than
 * optional.
 */
export function useApiQuery<T>(
  run: (client: ApiOperations, signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options?: ApiQueryOptions<T>,
): ApiQuery<T> {
  const { state: config, client } = useRuntimeConfig();
  const enabled = options?.enabled ?? true;
  const refreshMs = options?.refreshMs;

  // Everything that identifies *this* request. A change to any of it makes whatever is stored the
  // answer to a different question.
  const signature: DependencyList = [client, config, enabled, ...deps];

  // The poll counter. **Outside the signature on purpose** — a tick asks the same question again,
  // so the previous answer stays on screen until the new one arrives rather than being discarded
  // into a spinner once per interval.
  const [tick, setTick] = useState(0);

  const [tracked, setTracked] = useState<{
    signature: DependencyList;
    settled: Settled<T>;
  } | null>(null);

  // Read through the signature rather than resetting on change. A stale entry is never displayed
  // because it never matches — which is the same guarantee a reset gives, without the extra render
  // or the render-phase state write that would earn it.
  const settled =
    tracked !== null && sameSignature(tracked.signature, signature) ? tracked.settled : null;

  // Whether there is any point asking again. Computed from the answer already in hand, as a plain
  // boolean so the effect below depends on the *decision* rather than on a value whose identity
  // changes every poll.
  const keepPolling =
    refreshMs !== undefined &&
    enabled &&
    client !== undefined &&
    (options?.refreshWhile === undefined ||
      settled === null ||
      settled.status !== "ready" ||
      options.refreshWhile(settled.data));

  useEffect(() => {
    if (!keepPolling || refreshMs === undefined) return;
    const timer = setInterval(() => setTick((n) => n + 1), refreshMs);
    // Cleared on unmount, on any change to the subject, and the moment `keepPolling` goes false.
    // This is the whole of "no request outlives its page": the timer stops, and the in-flight
    // request the effect below started is aborted by its own cleanup.
    return () => clearInterval(timer);
  }, [keepPolling, refreshMs]);

  // The latest callback, without making it a dependency.
  //
  // Updated in an effect rather than during render, because writing a ref during render is a side
  // effect in a function React may call twice. Effects run in declaration order within a commit, so
  // this one lands before the request effect below reads it.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    // Nothing to ask, nobody to ask, or not asked yet — all three are rendered from the situation
    // rather than recorded, so the effect has no work and writes no state.
    if (!enabled || config.status === "loading" || client === undefined) return;

    const controller = new AbortController();
    // `live` as well as the signal: aborting stops the *request*, and this stops a response that
    // was already in flight from recording a result after the page moved on.
    let live = true;

    void runRef.current(client, controller.signal).then(
      (data) => {
        if (live) setTracked({ signature, settled: { status: "ready", data } });
      },
      (error: unknown) => {
        // The abort we asked for on the way out. Not a failure, and rendering it as one would
        // report an error to a reader who only clicked a link.
        if (!live || isAbortError(error)) return;
        setTracked({ signature, settled: { status: "failed", failure: failureOf(error) } });
      },
    );

    return () => {
      live = false;
      controller.abort();
    };
    // `run` is intentionally absent — see the doc comment. `signature` is spread rather than passed
    // as an array so the list has a constant length between renders, which React requires; it is
    // captured by the closure above at the same values. `tick` is a dependency here and *not* part
    // of the signature: it re-runs the request without invalidating the answer already on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...signature, tick]);

  if (!enabled) return { status: "idle" };
  // Still reading `config.json`. Not "unconfigured" — saying so here is how a correctly configured
  // deployment blames itself for a moment on every cold load.
  if (config.status === "loading") return { status: "loading" };
  if (client === undefined) return { status: "unconfigured", config };
  return settled ?? { status: "loading" };
}

/**
 * A token to put in a query's `deps`, and the function that changes it.
 *
 * The reload primitive, kept out of {@link useApiQuery} so its signature stays one thing. A page
 * that has just changed server state — retracted a submission, published an artifact — calls
 * `reload()` and its reads run again:
 *
 * ```ts
 * const [token, reload] = useReloadToken();
 * const trail = useApiQuery((api, signal) => api.benchAuditTrail({}, { signal }), [token]);
 * ```
 *
 * A counter rather than a boolean, so two reloads in a row are two refetches rather than one.
 */
export function useReloadToken(): readonly [number, () => void] {
  const [token, setToken] = useState(0);
  const reload = useCallback(() => setToken((n) => n + 1), []);
  return [token, reload];
}
