import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The property the old front end had and this one keeps: a static bundle any host serves, with no
  // Node process to run. The browser calls astro-mine-api directly. The costs are stated rather than
  // discovered — no server components, no route handlers, no image optimizer, and route identity in
  // the query string (ARCHITECTURE.md → "Identity lives in the search params").
  output: "export",

  // Static export ships no image optimizer; without this, `next/image` fails the build rather than
  // silently degrading.
  images: { unoptimized: true },

  // Emit `registry/artifact/index.html` rather than `registry/artifact.html`, so a plain static host
  // serves `/registry/artifact` as a directory without per-host rewrite rules.
  trailingSlash: true,

  reactStrictMode: true,

  // Workspace packages are consumed as their built `dist/` output — pnpm's topological build order
  // guarantees they exist before `next build` runs — so no `transpilePackages` entry is needed here.
};

export default nextConfig;
