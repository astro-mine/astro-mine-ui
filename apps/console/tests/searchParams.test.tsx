// Identity in the search params (ui#5; ui.md §5.1, normative).
//
// The rule this file holds: a page's subject travels in the query string, a page with no subject is
// in a legitimate empty state rather than an error, and writing one param never loses the others.

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { hrefWithIdentity, useIdentity, useSetIdentity } from "@/shell/searchParams";

import { goTo, router } from "./router";

describe("reading identity", () => {
  it("reads the params a page is keyed on", () => {
    goTo("/registry/artifact?name=shackleton&version=0.5.0");
    const { result } = renderHook(() => useIdentity(["name", "version"] as const));
    expect(result.current).toEqual({ name: "shackleton", version: "0.5.0" });
  });

  it("reports an absent param as null — a state, not an error", () => {
    goTo("/registry/artifact");
    const { result } = renderHook(() => useIdentity(["name", "version"] as const));
    expect(result.current).toEqual({ name: null, version: null });
  });

  it("treats an empty param as absent", () => {
    // `?name=` and no `name` at all mean the same thing to a reader, and a page should not have to
    // tell them apart to decide whether it has a subject.
    goTo("/registry/artifact?name=&version=0.5.0");
    const { result } = renderHook(() => useIdentity(["name", "version"] as const));
    expect(result.current.name).toBeNull();
    expect(result.current.version).toBe("0.5.0");
  });

  it("ignores params the page did not ask for", () => {
    goTo("/bench/submission?id=42&utm_source=somewhere");
    const { result } = renderHook(() => useIdentity(["id"] as const));
    expect(result.current).toEqual({ id: "42" });
  });

  it("decodes what the address carried", () => {
    goTo(`/registry/artifact?name=${encodeURIComponent("astro-mine/worlds")}`);
    const { result } = renderHook(() => useIdentity(["name"] as const));
    expect(result.current.name).toBe("astro-mine/worlds");
  });

  it("reads a digest, which is the case the whole rule exists for", () => {
    // A content address cannot be a pre-rendered path segment: the set is not closed, and `sha256:`
    // carries a colon. It is exactly what the query string is for.
    const digest = "sha256:9f2c1d4e5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f";
    goTo(`/registry/artifact?name=w&version=1.0.0&digest=${encodeURIComponent(digest)}`);
    const { result } = renderHook(() => useIdentity(["digest"] as const));
    expect(result.current.digest).toBe(digest);
  });
});

describe("building a link", () => {
  it("omits the query string entirely when there is nothing to say", () => {
    expect(hrefWithIdentity("/registry", {})).toBe("/registry");
    expect(hrefWithIdentity("/registry", { q: null })).toBe("/registry");
    expect(hrefWithIdentity("/registry", { q: "" })).toBe("/registry");
  });

  it("encodes values rather than pasting them in", () => {
    expect(hrefWithIdentity("/registry", { q: "shackleton dem" })).toBe(
      "/registry?q=shackleton+dem",
    );
    expect(hrefWithIdentity("/registry/artifact", { name: "astro-mine/worlds" })).toBe(
      "/registry/artifact?name=astro-mine%2Fworlds",
    );
  });
});

describe("writing identity", () => {
  it("keeps the params it was not asked to change", () => {
    // The failure this prevents: changing the version of the artifact being viewed and silently
    // dropping its name, which leaves the page with no subject and the reader with no idea why.
    goTo("/registry/artifact?name=shackleton&version=0.5.0");
    const { result } = renderHook(() => useSetIdentity());
    result.current({ version: "0.6.0" });

    expect(router.replace).toHaveBeenCalledTimes(1);
    const url = new URL(router.replace.mock.calls[0]![0] as string, "https://example.org");
    expect(url.pathname).toBe("/registry/artifact");
    expect(url.searchParams.get("name")).toBe("shackleton");
    expect(url.searchParams.get("version")).toBe("0.6.0");
  });

  it("removes a param set to null", () => {
    goTo("/registry?q=ice&kind=world");
    const { result } = renderHook(() => useSetIdentity());
    result.current({ q: null });

    const url = new URL(router.replace.mock.calls[0]![0] as string, "https://example.org");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("kind")).toBe("world");
  });

  it("drops the `?` when the last param goes", () => {
    goTo("/registry?q=ice");
    const { result } = renderHook(() => useSetIdentity());
    result.current({ q: null });
    expect(router.replace).toHaveBeenCalledWith("/registry");
  });

  it("replaces by default, and pushes when the page says it is navigating", () => {
    // Retyping a filter should not cost five back presses to escape; opening a different subject
    // should give the back button something to mean.
    goTo("/registry");
    const { result } = renderHook(() => useSetIdentity());

    result.current({ q: "ice" });
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    result.current({ q: "regolith" }, { history: "push" });
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
