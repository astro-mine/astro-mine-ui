// @vitest-environment node
//
// The navigation table and the rules derived from it (ui#5).
//
// `node`, not the `jsdom` default: nothing here renders. The table is data, and the point of it
// being data is that these properties can be asserted without a DOM.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CHORDS,
  NAV_ENTRIES,
  NAV_GROUPS,
  activeHref,
  childrenOf,
  crumbsFor,
  entryFor,
  normalizePathname,
  requireEntry,
  titleFor,
} from "@/shell/navigation";

const APP_DIR = fileURLToPath(new URL("../src/app", import.meta.url));

/**
 * Routes that are deliberately not in the navigation.
 *
 * **Each entry carries a reason and an expiry — this is not a hole in the check.** An unlisted
 * scaffold is better than a nav entry pointing at a development page, and better than no way at all
 * to see a behaviour render.
 *
 * `/dev/globe` (`ui#6`) was here and **has been deleted by `ui#17`**, which was its stated expiry:
 * `/design/study` now mounts a globe on a page a user actually visits, so the scaffold's reason —
 * "a globe has to mount somewhere to prove Cesium renders in the built export" — is served by a
 * real page. The exception went with the route rather than outliving it.
 *
 * - `/dev/inspector` (`ui#7`) — the artifact inspector registry's most user-visible behaviour is
 *   what a reader meets when *nothing* claims their artifact, or when two things claim it equally.
 *   No page renders a panel until `ui#10`, so without this those states could only be asserted in
 *   jsdom. **Delete when `ui#10` lands.**
 *
 * **The pattern is the thing to watch.** Each of these is honest on its own; several would be a
 * sign that scaffolds are how this application gets built, rather than how a behaviour is checked
 * once before a real page exists. An exception nobody removes becomes the precedent for the next
 * one — which is why the list going from two to one here matters more than the deletion itself.
 */
const UNLISTED_ROUTES: readonly string[] = ["/dev/inspector"];

/** Every route the filesystem actually serves, derived from where the `page.tsx` files are. */
function routesOnDisk(dir = APP_DIR, prefix = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...routesOnDisk(path, `${prefix}/${entry.name}`));
    } else if (entry.name === "page.tsx") {
      routes.push(prefix === "" ? "/" : prefix);
    }
  }
  return routes;
}

describe("the active entry is the most specific match", () => {
  // THE NAMED REGRESSION. The retired shell resolved the active entry with a plain prefix test, so
  // a section index lit up alongside its own children and a reader saw two highlighted entries with
  // no way to tell which page they were on. Every group in this application leads with its own
  // index, so the bug would now be reachable from four places rather than one.
  it("does not light a section index alongside its own child", () => {
    expect(activeHref("/registry/artifact")).toBe("/registry/artifact");
    expect(activeHref("/bench/leaderboard")).toBe("/bench/leaderboard");
    expect(activeHref("/design/study")).toBe("/design/study");
    expect(activeHref("/compute/backends")).toBe("/compute/backends");
  });

  it("lights the section index when the reader is actually on it", () => {
    expect(activeHref("/registry")).toBe("/registry");
    expect(activeHref("/bench")).toBe("/bench");
    expect(activeHref("/compute")).toBe("/compute");
  });

  it("matches a path prefix only at a segment boundary", () => {
    // Without the `+ "/"`, `/bench` would claim `/benchmarking` — a different section, silently.
    expect(activeHref("/benchmarking")).toBeUndefined();
    expect(activeHref("/registry-archive")).toBeUndefined();
  });

  it("matches Home exactly and never as a prefix", () => {
    // `/` is a prefix of every path in the application. Treated as one, an unknown route would
    // highlight Home rather than highlighting nothing.
    expect(activeHref("/")).toBe("/");
    expect(activeHref("/nothing-here")).toBeUndefined();
  });

  it("ignores the trailing slash the export serves", () => {
    // `trailingSlash: true` means the browser reports `/bench/leaderboard/`.
    expect(activeHref("/bench/leaderboard/")).toBe("/bench/leaderboard");
    expect(normalizePathname("/bench/")).toBe("/bench");
    expect(normalizePathname("/")).toBe("/");
  });

  it("resolves an unknown descendant to its nearest section", () => {
    // A page under a section that this build does not have is still *in* that section, and saying
    // so is better than highlighting nothing.
    expect(activeHref("/bench/leaderboard/extra")).toBe("/bench/leaderboard");
    expect(activeHref("/registry/unknown")).toBe("/registry");
  });
});

describe("breadcrumbs", () => {
  it("names the section and links it to the section's own page", () => {
    expect(crumbsFor("/bench/leaderboard")).toEqual([
      { label: "Home", href: "/" },
      { label: "Benchmark", href: "/bench" },
      { label: "Leaderboard", href: "/bench/leaderboard" },
    ]);
  });

  it("does not repeat the section when the reader is on its index", () => {
    // "Benchmark / Scenarios" would read as two levels where there is one.
    expect(crumbsFor("/bench")).toEqual([
      { label: "Home", href: "/" },
      { label: "Benchmark", href: "/bench" },
    ]);
  });

  it("is just Home at the root, and at an unknown route", () => {
    expect(crumbsFor("/")).toEqual([{ label: "Home", href: "/" }]);
    expect(crumbsFor("/nothing-here")).toEqual([{ label: "Home", href: "/" }]);
  });

  it("uses the table's labels rather than title-casing the path", () => {
    // `/design/new` is "New study", which no amount of slug formatting produces.
    expect(crumbsFor("/design/new").at(-1)).toEqual({
      label: "New study",
      href: "/design/new",
    });
  });

  it("never links to a route that does not exist", () => {
    const routes = new Set(routesOnDisk());
    for (const entry of NAV_ENTRIES) {
      for (const crumb of crumbsFor(entry.href)) {
        expect(routes, `${entry.href} breadcrumbs to ${crumb.href}`).toContain(crumb.href);
      }
    }
  });
});

describe("the table and the filesystem agree", () => {
  // The property that keeps "every route is reachable" true as pages are added: a route with no
  // entry is unreachable from the sidebar, and an entry with no route is a link to a 404.
  it("has a page on disk for every navigation entry", () => {
    const routes = new Set(routesOnDisk());
    for (const entry of NAV_ENTRIES) {
      expect(routes, `no page.tsx serves ${entry.href}`).toContain(entry.href);
    }
  });

  it("has a navigation entry for every page on disk", () => {
    const hrefs = new Set(NAV_ENTRIES.map((entry) => entry.href));
    for (const route of routesOnDisk()) {
      if (UNLISTED_ROUTES.includes(route)) continue;
      expect(hrefs, `${route} has no navigation entry`).toContain(route);
    }
  });

  it("keeps the unlisted list to routes that actually exist", () => {
    // The exception must not outlive the route it excuses — and it did not: `/dev/globe` was
    // deleted by ui#17 and this check is what would have caught the entry being left behind. A
    // stale exception is a licence the next unlisted page inherits without anybody granting it.
    const routes = new Set(routesOnDisk());
    for (const route of UNLISTED_ROUTES) {
      expect(routes, `${route} is excused from the navigation but does not exist`).toContain(route);
    }
  });

  it("keeps every unlisted route out of the navigation", () => {
    // The other direction: an unlisted route that gains a nav entry is no longer an exception, and
    // the exception should go rather than sit there agreeing with the rule.
    const hrefs = new Set(NAV_ENTRIES.map((entry) => entry.href));
    for (const route of UNLISTED_ROUTES) {
      expect(hrefs, `${route} is in the navigation, so it needs no exception`).not.toContain(route);
    }
  });
});

describe("the table itself", () => {
  it("gives every entry a unique href", () => {
    const hrefs = NAV_ENTRIES.map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("leads every group with its own section index", () => {
    // What makes the longest-match rule load-bearing, and what makes a breadcrumb's middle step a
    // real destination rather than dead text.
    for (const group of NAV_GROUPS) {
      const index = group.entries[0];
      expect(index, `${group.label} has no entries`).toBeDefined();
      for (const entry of group.entries.slice(1)) {
        expect(
          entry.href.startsWith(`${index!.href}/`),
          `${entry.href} is not under ${index!.href}`,
        ).toBe(true);
      }
    }
  });

  it("gives every entry a distinct label", () => {
    // Two links with the same accessible name and different destinations are ambiguous to anyone
    // reading a list of links out of context — which is exactly how a screen reader offers them.
    // `/bench/jobs` and `/compute/jobs` were both "Jobs" until this caught it.
    const labels = NAV_ENTRIES.map((entry) => entry.label);
    expect(new Set(labels).size, `duplicate labels in ${labels.join(", ")}`).toBe(labels.length);
  });

  it("gives every entry a label and a summary", () => {
    for (const entry of NAV_ENTRIES) {
      expect(entry.label.length, entry.href).toBeGreaterThan(0);
      expect(entry.summary.length, entry.href).toBeGreaterThan(0);
    }
  });

  it("keeps every chord unique and reachable", () => {
    const hrefs = new Set(NAV_ENTRIES.map((entry) => entry.href));
    const declared = NAV_ENTRIES.filter((entry) => entry.chord !== undefined);
    expect(CHORDS.size).toBe(declared.length);
    for (const href of CHORDS.values()) expect(hrefs).toContain(href);
  });

  it("lists the children of a section", () => {
    expect(childrenOf("/compute").map((entry) => entry.href)).toEqual([
      "/compute/jobs",
      "/compute/backends",
    ]);
    // A leaf has none, and nothing is its own child.
    expect(childrenOf("/help")).toEqual([]);
  });
});

describe("titles", () => {
  it("is the active entry's label, so the sidebar and the announcement cannot disagree", () => {
    expect(titleFor("/bench/leaderboard")).toBe("Leaderboard");
    expect(titleFor("/design/new")).toBe("New study");
    expect(titleFor("/")).toBe("Home");
  });

  it("falls back to the application's name where there is no entry", () => {
    // `not-found` and the error boundary are pages a reader genuinely arrives at, and announcing
    // nothing would leave them with no signal that anything moved.
    expect(titleFor("/nothing-here")).toBe("Astro-Mine");
  });
});

describe("requireEntry", () => {
  it("returns the entry for a route in the table", () => {
    expect(requireEntry("/help").label).toBe("Help");
    expect(entryFor("/help")).toEqual(requireEntry("/help"));
  });

  it("throws for a route that is not, so a page cannot ship unnavigable", () => {
    expect(() => requireEntry("/invented")).toThrow(/No navigation entry/);
  });
});

describe("the section indexes exist on disk", () => {
  it("serves every group's index route", () => {
    // `/bench` and `/compute` are owned by no Wave-29 issue, which is exactly why this is asserted:
    // a route nobody is scheduled to touch is the one that quietly disappears.
    const routes = routesOnDisk();
    for (const href of ["/registry", "/bench", "/design", "/compute"]) {
      expect(routes).toContain(href);
      expect(statSync(join(APP_DIR, href, "page.tsx")).isFile()).toBe(true);
    }
  });
});
