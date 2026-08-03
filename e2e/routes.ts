// Every route the export serves, read from the export (ui#8).
//
// Read rather than listed, because a hand-maintained list is a list that goes stale silently — a
// route added in Wave 29 would simply never be visited by the browser lane, and nothing would say
// so. Reading the directory means a new page is swept the moment it exists.

import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXPORT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps/console/out",
);

function* htmlFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

/**
 * Every prerendered route, as a URL path.
 *
 * `404.html` is excluded: a static host serves it as the fallback for an unmatched URL rather than
 * as a page, so visiting it directly asserts nothing a real user would meet.
 */
export function exportedRoutes(): string[] {
  const routes: string[] = [];
  for (const file of htmlFiles(EXPORT_DIR)) {
    const rel = relative(EXPORT_DIR, file)
      .split("\\")
      .join("/")
      .replace(/\.html$/, "");
    if (rel === "404") continue;
    routes.push(`/${rel.replace(/(^|\/)index$/, "")}`.replace(/(.)\/$/, "$1"));
  }
  return routes.sort();
}
