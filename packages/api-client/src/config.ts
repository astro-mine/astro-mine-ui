// Runtime configuration (ui#2; ui.md §7 honesty rule 3).
//
// **The API endpoint is never baked into the bundle.** `next build` emits a static export — one
// directory of files that any host serves — and the whole value of that is that the person who
// deploys it need not be the person who built it. An endpoint compiled in would mean a rebuild per
// environment, and a rebuild per environment means the artifact that was tested is not the
// artifact that ships.
//
// So the app fetches `/config.json` at boot, from beside itself. `.gitignore` keeps
// `apps/console/public/config.json` out of the tree deliberately: the repository ships **no**
// endpoint, so an unconfigured build degrades visibly out of the box instead of pretending to be
// configured and failing later, somewhere less obvious.
//
// **A missing configuration is not an error.** It is a state, with a reason and a remedy, and
// nothing here throws into a blank page — honesty rule 3, and an acceptance criterion of ui#2.

/** The file the application reads at boot. Relative, so it resolves under any base path. */
export const RUNTIME_CONFIG_PATH = "config.json";

/** What a deployment must tell the application. */
export interface RuntimeConfig {
  /** The API's origin, e.g. `https://api.example.org`. */
  apiBaseUrl: string;
}

/**
 * The outcome of reading it.
 *
 * Three arms rather than two, because the remedies differ: nobody wrote the file (write one), or
 * somebody wrote it wrong (fix it). Collapsing them would send a deployer to create a file that
 * already exists.
 */
export type RuntimeConfigState =
  | { status: "configured"; config: RuntimeConfig }
  | { status: "unconfigured"; reason: string; remedy: string }
  | { status: "invalid"; reason: string; remedy: string };

const WRITE_ONE =
  `Create \`${RUNTIME_CONFIG_PATH}\` beside the deployed application, containing ` +
  `{"apiBaseUrl": "https://your-api.example.org"}.`;

const FIX_IT =
  `Correct \`${RUNTIME_CONFIG_PATH}\` beside the deployed application: it must be a JSON object ` +
  `with an \`apiBaseUrl\` that is an absolute http(s) URL.`;

/** An absolute http(s) URL — the only thing a browser can use as an API origin. */
function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Read the deployment's configuration.
 *
 * Never rejects except on an abort the caller asked for: every other outcome — no file, no
 * network, malformed JSON, a URL that is not one — is a returned state carrying what went wrong
 * and what to do about it. The application renders that state; it does not have to interpret an
 * exception to find out what a user should be told.
 */
export async function loadRuntimeConfig(options?: {
  /** Where to read it from. Defaults to `config.json`, relative to the deployed page. */
  url?: string;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}): Promise<RuntimeConfigState> {
  const url = options?.url ?? RUNTIME_CONFIG_PATH;
  const doFetch = options?.fetch ?? globalThis.fetch;

  let response: Response;
  try {
    response = await doFetch(url, { credentials: "omit", signal: options?.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    return {
      status: "unconfigured",
      reason: `\`${url}\` could not be read.`,
      remedy: WRITE_ONE,
    };
  }

  if (response.status === 404) {
    return {
      status: "unconfigured",
      reason: `No \`${url}\` was found beside the application.`,
      remedy: WRITE_ONE,
    };
  }
  if (!response.ok) {
    return {
      status: "unconfigured",
      reason: `\`${url}\` answered ${response.status}.`,
      remedy: WRITE_ONE,
    };
  }

  let document: unknown;
  try {
    document = await response.json();
  } catch {
    // A static host answering the SPA's index.html for a missing file is the common case here, and
    // it is worth naming: the symptom is HTML where JSON was expected, and the cause is a file
    // that was never written.
    return {
      status: "invalid",
      reason: `\`${url}\` is not JSON.`,
      remedy: FIX_IT,
    };
  }

  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return { status: "invalid", reason: `\`${url}\` is not a JSON object.`, remedy: FIX_IT };
  }

  const { apiBaseUrl } = document as Record<string, unknown>;
  if (apiBaseUrl === undefined || apiBaseUrl === null || apiBaseUrl === "") {
    return {
      status: "unconfigured",
      reason: `\`${url}\` names no \`apiBaseUrl\`.`,
      remedy: WRITE_ONE,
    };
  }
  if (typeof apiBaseUrl !== "string" || !isAbsoluteHttpUrl(apiBaseUrl)) {
    return {
      status: "invalid",
      reason: `\`${url}\` has an \`apiBaseUrl\` that is not an absolute http(s) URL.`,
      remedy: FIX_IT,
    };
  }

  return { status: "configured", config: { apiBaseUrl } };
}
