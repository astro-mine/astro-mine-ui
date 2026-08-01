// @vitest-environment node
//
// THE EXPORT SURFACE IS A CONTRACT (ui#3; ui.md §2, §7.1, §10.4).
//
// `node`, not the `jsdom` default: nothing here renders, and under jsdom `import.meta.url` is an
// `http:` URL rather than a `file:` one, so reading the manifest beside this file fails outright.
//
// Two acceptance criteria of this issue are about what the package does *not* export, and neither
// can be checked by looking at any one file:
//
//   - "No page in the repository defines its own loading, error or empty markup; `AsyncState` is the
//     only one, asserted by ... the absence of alternatives in the export surface." A rule holds
//     because there is nothing else to reach for, not because a reviewer remembered it.
//   - "No raw chart primitive escapes `@astro-mine/ui`" (ui.md §7.1). `ui#4` added the chart layer,
//     and what it must never add is a re-export of a MUI X chart: a chart reached directly is a
//     chart with no uncertainty discipline, because MUI X guarantees neither the open mark nor the
//     single axis. The three charts this package exports share their *names* with MUI X components
//     and must not share their identity, which is asserted here object-by-object.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { BarChart as MuiBarChart } from "@mui/x-charts/BarChart";
import { ScatterChart as MuiScatterChart } from "@mui/x-charts/ScatterChart";
import { describe, expect, it } from "vitest";

import * as surface from "../src/index.js";

const exported = Object.keys(surface).sort();

/**
 * The package manifest, read rather than imported.
 *
 * A JSON import types the file as the exact literal it is today, so asking whether it has a
 * `dependencies` key is a type error rather than the question this file is trying to answer — and
 * the answer "it does not, yet" is precisely what these assertions are checking for.
 */
const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as Record<string, Record<string, string> | undefined>;

const allDependencies = (...fields: string[]) =>
  fields.flatMap((field) => Object.keys(manifest[field] ?? {}));

describe("the honesty kit", () => {
  it("exports exactly the components this issue ships", () => {
    // `InspectorSlot` is named in ui.md §2's kit and lands with ui#7, which owns the artifact
    // inspector registry it is the extension point for.
    expect(exported).toEqual(
      [
        "AsyncState",
        "BarChart",
        "COLOR_SCHEMES",
        "COLOR_SCHEME_ATTRIBUTE",
        "CONTRAST_PAIRS",
        "CONTRAST_THRESHOLDS",
        "ColorModeToggle",
        "DECORATIVE_ROLES",
        "DegradedState",
        "Digest",
        "EmptyState",
        "PALETTES",
        "ParallelCoordinates",
        "ProvenanceList",
        "RunnerBadge",
        "ScatterChart",
        "StandInBanner",
        "ThemeRegistry",
        "UncertaintyValue",
        "abbreviateDigest",
        "theme",
      ].sort(),
    );
  });
});

describe("one loading / error / empty discipline", () => {
  it("offers no alternative to AsyncState", () => {
    // The previous front end hand-wrote these three branches in seven places and they diverged.
    // Anything on this list would be a second way to do it, and a second way is how the first one
    // stops being the rule.
    const alternatives = [
      "Spinner",
      "Loading",
      "LoadingState",
      "Loader",
      "ErrorState",
      "ErrorMessage",
      "ErrorBoundary",
      "Placeholder",
      "Skeleton",
      "NoData",
    ];

    const found = alternatives.filter((name) => exported.includes(name));
    expect(found, `these would compete with AsyncState: ${found.join(", ")}`).toEqual([]);
  });

  it("keeps EmptyState, which is a different question", () => {
    // Not a competing discipline: `AsyncState` renders it, and a page also needs it for content
    // that is empty without a request having been made.
    expect(exported).toContain("EmptyState");
  });
});

describe("no raw chart primitive escapes", () => {
  it("exports nothing that is a chart, an axis, a scale or a series", () => {
    // Deliberately a pattern rather than a list: the failure mode is a name nobody thought to
    // forbid, and `ui#4` will add several legitimate chart *wrappers* whose names this must not
    // reject — hence matching the primitive vocabulary (`XAxis`, `LineSeries`, `scaleLinear`) rather
    // than the word "chart".
    const primitives = exported.filter((name) =>
      /^(?:x|y)axis$|axis$|^scale|series$|^svg|^grid$|^tooltip$|^legend$|^plot/i.test(name),
    );
    expect(
      primitives,
      `raw chart primitives must not leave this package (ui.md §7.1): ${primitives.join(", ")}`,
    ).toEqual([]);
  });

  it("re-exports nothing from MUI X Charts", () => {
    // The other half of the same rule: a wrapper that passes a MUI X component straight through is
    // the same hole with a nicer name, and `BarChart` and `ScatterChart` are exactly the two names
    // where the swap would go unnoticed in review.
    expect(surface.BarChart).not.toBe(MuiBarChart);
    expect(surface.ScatterChart).not.toBe(MuiScatterChart);
  });

  it("keeps the chart library a private dependency, never a peer", () => {
    // A peer dependency is an instruction to the consumer to install it — which would put
    // `@mui/x-charts` in the application's own node_modules and make the layering gate the only
    // thing standing between a page and a raw chart. As a plain dependency it is this package's,
    // and pnpm's isolated layout means a page cannot resolve it even by accident.
    expect(Object.keys(manifest.dependencies ?? {})).toContain("@mui/x-charts");
    expect(allDependencies("peerDependencies").filter((n) => n.includes("x-charts"))).toEqual([]);
  });
});

describe("the layering", () => {
  it("declares no @astro-mine sibling — this package is a leaf", () => {
    // `scripts/check-layering.mjs` enforces this workspace-wide; asserting it here too is cheap and
    // fails in the lane a package author is already watching.
    const declared = allDependencies("dependencies", "peerDependencies", "devDependencies");
    expect(declared.filter((name) => name.startsWith("@astro-mine/"))).toEqual([]);
  });
});
