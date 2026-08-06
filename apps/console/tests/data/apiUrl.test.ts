// Resolving an API-rooted path against the deployment's API (ui#51).
//
// This is a four-line function with a defect behind it: the study page fetched a world's
// `world.json` at the *page's* origin for two waves, and nothing noticed, because the scene reports
// a 404 as "terrain unavailable — showing the bare body" and a stand-in bundle draws no terrain
// either way. The cases below are the ones that distinguish the two.

import { describe, expect, it } from "vitest";

import { apiUrl } from "@/data/apiUrl";

const BASE = "https://api.test";

describe("apiUrl", () => {
  it("puts an API-rooted path on the API, not on the page", () => {
    // The whole point. `manifest_url` arrives as a path because the API wrote it as one.
    expect(apiUrl(BASE, "/studio/worlds/files/sha256-abc/world.json")).toBe(
      "https://api.test/studio/worlds/files/sha256-abc/world.json",
    );
  });

  it("does not double the separator when the base carries a trailing slash", () => {
    // `config.json` is hand-written per deployment, so both spellings turn up.
    expect(apiUrl("https://api.test/", "/studio/worlds/files/w/world.json")).toBe(
      "https://api.test/studio/worlds/files/w/world.json",
    );
    expect(apiUrl("https://api.test///", "/a")).toBe("https://api.test/a");
  });

  it("keeps a base that is itself under a path prefix", () => {
    // A deployment behind a reverse proxy mounts the API at a sub-path, and the join must not eat
    // it — the failure would be a 404 on every asset the API describes rather than serves.
    expect(apiUrl("https://example.org/api", "/studio/worlds/files/w/world.json")).toBe(
      "https://example.org/api/studio/worlds/files/w/world.json",
    );
  });

  it("adds the separator when the path has none", () => {
    expect(apiUrl(BASE, "studio/worlds/files/w/world.json")).toBe(
      "https://api.test/studio/worlds/files/w/world.json",
    );
  });

  it("leaves an absolute URL exactly as the API sent it", () => {
    // The API is free to answer with an object-store or signed URL, and joining a base onto one
    // would corrupt it. Absent from the routes today, which is why it is asserted rather than
    // assumed: the fix for the next route to do it must not be to re-read this file.
    for (const absolute of [
      "https://cdn.example.org/w/world.json",
      "http://cdn.example.org/w/world.json",
      "//cdn.example.org/w/world.json",
    ]) {
      expect(apiUrl(BASE, absolute)).toBe(absolute);
    }
  });

  it("does not mistake a path segment containing a colon for a scheme", () => {
    // Content addresses and references are full of colons, and a naive `includes(":")` test would
    // hand `/hub/artifacts/name:1.0.0` back unjoined — a bug that only shows up on the artifacts
    // whose names have versions in them, which is all of them.
    expect(apiUrl(BASE, "/studio/worlds/commons/rim:0.5.0")).toBe(
      "https://api.test/studio/worlds/commons/rim:0.5.0",
    );
  });
});
