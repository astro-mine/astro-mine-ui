"use client";

// Writing to the API (Wave 29; ui#11, ui#14, ui#15, ui#16, ui#18, ui#19).
//
// A read runs itself; a write waits to be asked. That is the whole difference between this and
// {@link useApiQuery}, and it is why they are two hooks rather than one with a flag — an effect
// that fires on mount and a callback that fires on submit have opposite defaults, and a hook that
// did both would have to be told which on every use.
//
// **The state machine is four arms because a form needs four.** `idle` is a button. `pending` is a
// disabled button and nothing else changed. `done` carries what the server made, which for every
// write in this application is the point: a publish answers with the digest, a submission answers
// with the job to follow. `failed` carries a {@link Failure}, so the caller can render the cause
// rather than a status code — which is what ui#11 asks for when it says the outcomes are rendered
// *per cause, not per status code*.
//
// **A write is never retried automatically.** Not an omission: `POST /hub/publish` and
// `POST /bench/submissions` are not idempotent, and a client that retries one on a timeout can
// publish twice. The reader decides whether to try again.

import type { ApiOperations } from "@astro-mine/api-client";
import { isAbortError } from "@astro-mine/api-client";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRuntimeConfig } from "@/shell/runtimeConfig";

import { failureOf, type Failure } from "./problems";

/** Where a write has got to. */
export type ApiAction<T> =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "done"; readonly data: T }
  | { readonly status: "failed"; readonly failure: Failure };

/**
 * What `invoke` resolves with.
 *
 * **`ok` rather than "the result, or `undefined` on failure".** The shorter contract was here first
 * and it conflates two different things the moment a route answers with no body: `decode` returns
 * `undefined` for a 204 or an empty 200, so a *successful* write becomes indistinguishable from a
 * refusal, and a caller chaining on it treats a completed action as a failure. No route in today's
 * document does that — `DELETE /bench/submissions/{id}` answers with the retracted `Submission` —
 * which is precisely why it is worth fixing now: the ambiguity is invisible until the first 204 is
 * added, and by then several call sites depend on the wrong reading. A flag costs one field.
 */
export type ApiActionResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false };

export interface ApiActionHandle<A extends readonly unknown[], T> {
  readonly state: ApiAction<T>;
  /**
   * Run it.
   *
   * Never rejects: a write that throws out of an event handler is an unhandled rejection in the
   * console and nothing on the screen. The failure is in `state`; the returned {@link
   * ApiActionResult} is for a caller that wants to chain on success.
   */
  readonly invoke: (...args: A) => Promise<ApiActionResult<T>>;
  /** Back to `idle`. For a form that clears its own outcome before being used again. */
  readonly reset: () => void;
  /**
   * Whether there is anything to call. `false` when the deployment has no API configured.
   *
   * A control reads this to disable itself **before** it is clicked, which is what ui#18 asks for
   * — a button that fails on click has already wasted the reader's time.
   */
  readonly ready: boolean;
}

/**
 * Bind a write, and hold what it did.
 *
 * ```ts
 * const publish = useApiAction((api, body: PublishBody) => api.hubPublish({ body }));
 * <Button disabled={!publish.ready || publish.state.status === "pending"}
 *         onClick={() => void publish.invoke(body)} />
 * ```
 *
 * The callback is held in a ref and is not a dependency of anything, so a caller may write it
 * inline without memoizing. `invoke` changes identity only when the API endpoint does.
 */
export function useApiAction<A extends readonly unknown[], T>(
  run: (client: ApiOperations, ...args: A) => Promise<T>,
): ApiActionHandle<A, T> {
  const { client } = useRuntimeConfig();
  const [state, setState] = useState<ApiAction<T>>({ status: "idle" });

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // Nothing may be written after unmount. A publish that resolves into an unmounted form is a
  // React warning and, worse, a success the reader never saw.
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  // **`client` is a dependency, not a ref, and that is a correctness fix rather than a
  // simplification.** Holding it in a ref filled by an effect kept `invoke`'s identity stable, at
  // the cost of a window where `ready` was already `true` — it reads `client` directly — while
  // `invoke` still saw `undefined` and returned without doing anything. A test that waited for the
  // control to enable and then clicked it hit that window intermittently and reported the write as
  // never having happened. An identity that changes when the endpoint changes is the honest one.
  const invoke = useCallback(
    async (...args: A): Promise<ApiActionResult<T>> => {
      if (client === undefined) return { ok: false };

      setState({ status: "pending" });
      try {
        const data = await runRef.current(client, ...args);
        if (live.current) setState({ status: "done", data });
        return { ok: true, data };
      } catch (error: unknown) {
        // An abort here is the component going away mid-write. There is nobody to tell.
        if (live.current && !isAbortError(error)) {
          setState({ status: "failed", failure: failureOf(error) });
        }
        return { ok: false };
      }
    },
    [client],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, invoke, reset, ready: client !== undefined };
}
