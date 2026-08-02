"use client";

// Mounting the globe (ui#6).
//
// **The one place Cesium is allowed into the application**, and the shape every page that wants a
// globe should copy — `ui#13`'s replay and `ui#17`'s candidate inspection both arrive through here.
//
// Two things have to be true before `@astro-mine/view` is even fetched, and neither is optional:
//
// 1. **No server evaluation.** Cesium touches `window` at *import* time. `next/dynamic` with
//    `ssr: false` is what keeps the module off the server entirely — the package's own
//    `"use client"` is the second belt, not the first. Under `output: 'export'` a server evaluation
//    is not a runtime error a user sees, it is a **build failure**, which is the better place for it.
//
// 2. **`CESIUM_BASE_URL` before the import resolves.** Cesium fetches its workers, web assembly and
//    widget assets at runtime from `window.CESIUM_BASE_URL`, *not* through the bundler. It reads the
//    global when its module body runs, so setting it after the import is setting it too late. That
//    is why the assignment sits in the loader callback, above the `import`, rather than in an effect.
//
// The assets themselves are staged into `public/cesium` by `scripts/copy-cesium-assets.mjs`, which
// the build runs before `next build`. Nothing is fetched from a CDN in either mode — that is CX-LOCAL,
// and it is why the copy exists rather than a script tag.

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

/** Where `scripts/copy-cesium-assets.mjs` stages Cesium's runtime files, served as static bytes. */
export const CESIUM_BASE_URL = "/cesium/";

const GlobeScene = dynamic(
  async () => {
    // Before the import, never after: Cesium reads this global as its module body runs.
    (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;
    const view = await import("@astro-mine/view");
    return view.GlobeScene;
  },
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          color: "text.secondary",
        }}
      >
        {/* A spinner is honest here in a way it is not on a data panel: this is a large chunk
            arriving over the network, and there is nothing to say about it except "still coming". */}
        <CircularProgress size={24} aria-label="Loading the globe" />
      </Box>
    ),
  },
);

export type GlobeProps = ComponentProps<typeof GlobeScene>;

export { GlobeScene as Globe };
