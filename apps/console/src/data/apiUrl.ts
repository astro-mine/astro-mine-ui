// Turning an API-rooted path the server handed us into a URL a browser can fetch (ui#51).
//
// **This exists because the application is a static export.** `ui.md` §5.1: a bundle any host
// serves, with the browser calling the API directly. So the two origins are routinely different —
// `docker/nginx.conf` proxies nothing, and the journeys lane serves the export on `:4174` against
// an API on `:8000` — and a path like `/studio/worlds/files/…/world.json` resolves against the
// *page* rather than against the API. It 404s, and the failure surfaces three layers away as
// "terrain unavailable", which reads as a bad world bundle.
//
// Every read that goes through the generated client already has the base applied. What needs this
// is the other kind: a URL the API puts *in a response body* for something to fetch directly —
// a world's `world.json`, an asset's geometry document — where the fetch is Cesium's rather than
// the client's.
//
// `components/bench/replayUrl.ts` is the same join for the other case: a path this application
// derives from the generated operation table rather than one the server chose. Kept separate
// because what it templates and what it must encode are its own; the `${base}${path}` step is the
// only thing they share, and it is one line.

/** `true` for `https://host/x`, `//host/x` and anything else already carrying its own origin. */
function hasOrigin(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//");
}

/**
 * Resolve `path` against the deployment's API base URL.
 *
 * An absolute URL is returned untouched, on purpose: the API is free to answer with one — an object
 * store, a CDN, a signed URL — and joining a base onto it would corrupt it. What this fixes is the
 * *relative* case, which is what the routes serve today.
 */
export function apiUrl(baseUrl: string, path: string): string {
  if (hasOrigin(path)) return path;
  const base = baseUrl.replace(/\/+$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
