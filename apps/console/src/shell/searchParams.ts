"use client";

// Identity lives in the search params (ui#5; ui.md §5.1, **normative**).
//
// `output: 'export'` pre-renders every route at build time, so a dynamic segment needs a closed,
// enumerable parameter set — and artifact names, content digests, scenario ids and submission ids
// are none of those. Identity therefore lives in the query string:
//
//     /registry/artifact?name=…&version=…     not  /registry/artifact/[name]/[version]
//     /bench/submission?id=…                  not  /bench/submission/[id]
//
// **This file exists so that eleven pages do not invent eleven conventions.** Reading a param is
// three lines with `useSearchParams`; the reason to have one helper anyway is everything around it
// — the empty state that a bare route is legitimately in, writing a param without discarding the
// others, and the Suspense requirement below, which is the kind of thing that gets discovered once
// and then rediscovered ten times.
//
// **On Suspense, and on how much of a page it costs.** `useSearchParams()` opts its whole subtree
// out of prerendering, and under static export Next fails the build outright unless the caller sits
// inside a `<Suspense>` boundary.
//
// The root layout carries one, so a page that forgets its own still builds. **That backstop is not
// the pattern to copy.** Whatever sits inside a boundary contributes nothing to the exported HTML,
// so calling this hook at the top of a page costs the entire page — its heading, its prose, all of
// it appears only once JavaScript has run. Called around the part that genuinely depends on the
// address, it costs only that part.
//
// So: read identity in a small component, wrap *that* in `<Suspense>`, and let the rest of the page
// prerender. `components/PagePlaceholder.tsx` is the worked example.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/** What a page asked for, param by param. `null` means "absent", which is a state, not an error. */
export type Identity<K extends string> = Readonly<Record<K, string | null>>;

/** A write: a value, or `null` to remove the param. */
export type IdentityPatch = Readonly<Record<string, string | null>>;

/**
 * Read the identity params a page is keyed on.
 *
 * ```ts
 * const { name, version } = useIdentity(["name", "version"] as const);
 * if (name === null) return <EmptyState title="No artifact chosen" … />;
 * ```
 *
 * A missing param is `null` rather than `undefined` or `""`, so `?name=` and no `name` at all read
 * the same — a page should not have to tell an empty string from an absent one to decide whether it
 * has a subject.
 */
export function useIdentity<const K extends readonly string[]>(names: K): Identity<K[number]> {
  const params = useSearchParams();
  // `params.toString()` rather than `params` in the dependency list: Next returns a new
  // `ReadonlyURLSearchParams` object on some renders with identical contents, and keying on the
  // object identity would rebuild this on every render for no reason.
  const serialized = params.toString();
  // The names as a *value* rather than as an array. `["id"]` is written inline at most call sites,
  // so it is a fresh array on every render and would invalidate the memo on each one — and a
  // dependency list may hold only simple expressions, so the flattening cannot live in the
  // brackets. A JSON round trip keys the memo on what the names are rather than on which array
  // object happened to carry them.
  const wanted = JSON.stringify(names);

  return useMemo(() => {
    const read = new URLSearchParams(serialized);
    const out = {} as Record<string, string | null>;
    for (const name of JSON.parse(wanted) as readonly string[]) {
      const value = read.get(name);
      out[name] = value === null || value === "" ? null : value;
    }
    return out as Identity<K[number]>;
  }, [serialized, wanted]);
}

/**
 * Build a URL for a route with identity params applied.
 *
 * Pure, and exported, because links are the common case and a link should not need a hook. Params
 * whose value is `null` are dropped, so one function both sets and clears.
 */
export function hrefWithIdentity(pathname: string, patch: IdentityPatch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null && value !== "") params.set(key, value);
  }
  const query = params.toString();
  return query === "" ? pathname : `${pathname}?${query}`;
}

/**
 * Write identity params on the **current** route, keeping the ones not mentioned.
 *
 * Merging rather than replacing is the behaviour a page wants nine times in ten: changing the
 * version of the artifact being viewed must not silently drop its name. Pass `null` to remove one.
 *
 * The default is `replace`, not `push`: retyping a filter is not a place a reader wants five back
 * presses to escape from. A page that is genuinely navigating — opening a *different* subject —
 * passes `{ history: "push" }` and gets a back button that means something.
 */
export function useSetIdentity(): (
  patch: IdentityPatch,
  options?: { history?: "push" | "replace" },
) => void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const serialized = params.toString();

  return useCallback(
    (patch: IdentityPatch, options?: { history?: "push" | "replace" }) => {
      const next = new URLSearchParams(serialized);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      const url = query === "" ? pathname : `${pathname}?${query}`;
      if (options?.history === "push") router.push(url);
      else router.replace(url);
    },
    [router, pathname, serialized],
  );
}
