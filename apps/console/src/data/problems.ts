// A failed call, turned into what a reader is told (Wave 29; api.md §4; ui.md §7 honesty rule 3).
//
// **Every page in Wave 29 needs the same three sentences** — what went wrong, in whose words, and
// what to do about it — and the API already supplies two of the three. `@astro-mine/api-client`
// throws `ApiProblemError` carrying the document verbatim, or `ApiTransportError` when nothing
// usable arrived. What it deliberately does not do is decide how a page should present either,
// because that is a product decision and the client is a leaf.
//
// This file makes that decision once. Without it, twelve pages each invent a mapping, and the ones
// that matter most — a deployment that cannot publish, a write that needs a credential — get
// rendered as *errors* on some pages and as *states* on others. That inconsistency is not cosmetic:
// honesty rule 3 says a missing capability is a state with a remedy, and a page that renders it as
// a red alert is telling the reader something broke when nothing did.
//
// **Three kinds, because a reader can do three different things:**
//
//   degraded  this deployment does not offer that, and no amount of retrying will change it. It
//             has a remedy, and the remedy is a deployment change rather than a user action.
//   refused   the request reached a working deployment and was turned down — the input was wrong,
//             the credential was missing, the namespace was not this publisher's. The reader can
//             act on it.
//   error     something failed that was not supposed to. Includes every transport failure, because
//             an unreachable API is genuinely broken from where the reader is standing.
//
// **`code` is the only member anything here branches on.** `detail` is prose written for a person
// and nothing parses it (api.md §4). That rule is why the per-cause rendering ui#11 asks for is
// possible at all, and why `detail` is passed through **verbatim** rather than paraphrased: for
// `admission_rejected` the detail *is* the supply-chain verdict, and a paraphrase of a verdict is
// a different verdict.

// **API shapes arrive in a dedicated `import type` statement, here and in every page.**
// `scripts/check-no-handwritten-api-types.mjs` looks for a line beginning `type Name` to catch a
// hand-copied mirror of a published schema — and an inline `type ErrorCode,` inside a mixed import
// list is that exact text, so the gate reports a violation for consuming the contract correctly.
// One line, one import kind, no false positive. Worth knowing before writing the next page.
import type { ErrorCode, FieldProblem } from "@astro-mine/api-client";
import { ApiProblemError, ApiTransportError, isApiProblem } from "@astro-mine/api-client";

/** How a failure should read. See the header for what separates the three. */
export type FailureKind = "degraded" | "refused" | "error";

/**
 * A failure, ready to render.
 *
 * `detail` is the server's own sentence and is never rewritten. `remedy` is ours, and exists only
 * where there is one general enough to be true of every deployment — a page with a better remedy
 * for its own case supplies it at the call site rather than adding a special case here.
 */
export interface Failure {
  readonly kind: FailureKind;
  /** A short heading. Ours, not the server's `title`, which is usually just the code. */
  readonly title: string;
  /** What the server said, verbatim — or what the transport layer reported when nothing did. */
  readonly detail: string;
  /** What to do about it, where there is a general answer. */
  readonly remedy?: string;
  /** The machine-readable cause. Absent for a transport failure, which no server named. */
  readonly code?: ErrorCode;
  /** The HTTP status, when one arrived. For the reader who is going to file a bug. */
  readonly status?: number;
  /** Field-level failures from a validation problem. Always an array, so a form can iterate. */
  readonly errors: readonly FieldProblem[];
}

/**
 * How each code reads, and what to say about it.
 *
 * **Exhaustive over `ErrorCode` by construction** — `Record`, not `Partial<Record>` — so the day
 * the API appends a code, this file fails to compile rather than silently rendering the new cause
 * as a generic error. That is the whole reason the table is written out rather than defaulted.
 */
const PRESENTATION: Record<ErrorCode, { kind: FailureKind; title: string; remedy?: string }> = {
  // ── Degraded: the deployment does not offer this ──────────────────────────────────────────────
  publish_unconfigured: {
    kind: "degraded",
    title: "Publishing is not enabled on this deployment",
    remedy:
      "Reading, searching and resolving are unaffected. Publishing needs the deployment's " +
      "registry wiring and signing keys; the CLI can publish against a local registry meanwhile.",
  },
  capability_unavailable: {
    kind: "degraded",
    title: "This deployment does not offer that",
    remedy:
      "The surface is not mounted, or its backing service is not wired up. Nothing on this page " +
      "will work until it is — the other sections are unaffected.",
  },

  // ── Refused: it reached a working deployment, which said no ───────────────────────────────────
  namespace_refused: {
    kind: "refused",
    title: "That namespace was refused",
    remedy: "Publish under a namespace this deployment accepts from you.",
  },
  admission_rejected: {
    // The one case where our words matter least and the server's matter most: this is the
    // supply-chain verdict, and the page shows it as written.
    kind: "refused",
    title: "Admission rejected",
  },
  resolution_failed: {
    kind: "refused",
    title: "Nothing satisfies that specification",
    remedy:
      "Check the name and widen the version specifier — a spec is a query, and this one matched nothing.",
  },
  content_not_found: {
    kind: "refused",
    title: "Not found",
    remedy: "Check the identity in the address. A digest is exact; a tag may have moved.",
  },
  download_denied: {
    kind: "refused",
    title: "Download denied",
    remedy: "This deployment does not grant this artifact's bytes to this caller.",
  },
  validation_failed: {
    kind: "refused",
    title: "That was not accepted",
    remedy: "The fields named below are the ones to correct.",
  },
  invalid_request: {
    kind: "refused",
    title: "That request could not be read",
  },
  not_authenticated: {
    kind: "refused",
    title: "This needs a credential",
    remedy:
      "Reading is open; writing is not. This deployment expects a token on this request — see " +
      "`astro-mine --help` for the command-line path, which carries one.",
  },
  not_authorized: {
    kind: "refused",
    title: "That credential does not permit this",
    remedy:
      "The request was authenticated and refused. A different credential is needed, not a retry.",
  },
  rate_limited: {
    kind: "refused",
    title: "Too many requests",
    remedy: "Wait, then try again. Nothing was changed.",
  },
  submission_rejected: {
    kind: "refused",
    title: "Submission rejected",
  },
  conflict: {
    kind: "refused",
    title: "That conflicts with what is already there",
    remedy:
      "Content-addressed artifacts are immutable. Publish a new version rather than replacing one.",
  },

  // ── Error: something failed that was not supposed to ──────────────────────────────────────────
  method_not_allowed: {
    kind: "error",
    title: "The API refused that method",
    remedy:
      "This is a client/server mismatch rather than anything you did — the generated client and " +
      "the deployed API are probably different versions.",
  },
  internal_error: {
    kind: "error",
    title: "The API failed",
    remedy: "Nothing here can fix it. If it persists, the detail above is what to report.",
  },
};

/** What a transport failure carries. There is no `code`, because no server named one. */
const UNREACHABLE = {
  title: "The API could not be reached",
  remedy:
    "It may be down, unreachable from this origin, or refusing this origin's requests. The " +
    "browser withholds which, deliberately — check `config.json` names the right endpoint, and " +
    "that the API sends CORS headers for it.",
} as const;

/**
 * Turn whatever a call threw into something a page can render.
 *
 * Accepts `unknown` because that is what a `catch` binds. Anything that is not one of the client's
 * two error classes becomes a generic failure carrying its own message — a bug in a page is still
 * something the reader has to be told about, and swallowing it would leave a pane that never
 * resolves.
 *
 * **An abort is not a failure and must never reach here.** A page that navigates away cancels its
 * requests, and the rejection that follows is the page's own doing; `useApiQuery` drops it before
 * this is called. Passing one in would render "something went wrong" for a user who did nothing but
 * click a link.
 */
export function failureOf(error: unknown): Failure {
  if (isApiProblem(error)) {
    const presentation = PRESENTATION[error.code];
    return {
      kind: presentation.kind,
      title: presentation.title,
      detail: error.problem.detail,
      remedy: presentation.remedy,
      code: error.code,
      status: error.status,
      errors: error.errors,
    };
  }

  if (error instanceof ApiTransportError) {
    return {
      kind: "error",
      title: UNREACHABLE.title,
      detail: error.reason,
      remedy: UNREACHABLE.remedy,
      status: error.status,
      errors: [],
    };
  }

  return {
    kind: "error",
    title: "Something went wrong",
    detail: error instanceof Error ? error.message : String(error),
    errors: [],
  };
}

/**
 * The sentence a page hands to `AsyncState`'s `error` arm.
 *
 * `AsyncState` takes one string, by design — it is the *loading/error/empty* discipline, not a
 * failure renderer — so this is the flattening, in one place rather than at every call site.
 */
export function failureMessage(failure: Failure): string {
  return `${failure.title} — ${failure.detail}`;
}

/** Did this failure arrive with the given code? For a page rendering one cause specially. */
export function failedWith(failure: Failure, code: ErrorCode): boolean {
  return failure.code === code;
}

/**
 * Is this the deployment saying "not here", rather than something breaking?
 *
 * The distinction a control needs to make: a degraded capability is disabled with an explanation,
 * where a genuine error is worth a retry. Exported because several pages gate a *button* on it
 * before it is clicked, which ui#18 asks for in as many words.
 */
export function isDegraded(failure: Failure): boolean {
  return failure.kind === "degraded";
}

// Re-exported so a page importing this module for `failureOf` does not also need the client's
// error classes by name just to construct a fixture in its own test.
export { ApiProblemError, ApiTransportError };
