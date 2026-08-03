"use client";

// Rendering what a read produced (Wave 29; ui.md §7 honesty rules 3 and 6).
//
// **This is not a second loading/error/empty discipline.** `@astro-mine/ui`'s export surface
// deliberately offers no alternative to `AsyncState`, and its own test asserts the absence
// (`packages/ui/tests/surface.test.ts`). What this file adds is *routing*: an `ApiQuery` has two
// arms `AsyncState` has never heard of — a deployment with no API at all, and a failure the API
// itself calls a missing capability — and both of those are **degraded states**, not errors.
//
// Sending them to `AsyncState`'s error arm is the mistake it exists to prevent. A red "something
// went wrong" for a deployment that simply does not mount the Studio surface tells the reader to
// look for a fault that is not there. So:
//
//   unconfigured           → DegradedState, carrying the loader's own reason and remedy
//   failed, kind degraded  → DegradedState, carrying the API's own reason
//   failed, otherwise      → AsyncState's error arm — the one error discipline, unchanged
//   loading / ready        → AsyncState, unchanged
//
// Every branch that renders words renders **the server's or the loader's** words, never a paraphrase
// (honesty rule 6, and ui#11's requirement that an admission verdict is shown verbatim).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AsyncState, DegradedState, EmptyState } from "@astro-mine/ui";
import type { ReactNode } from "react";

import { failureMessage, type Failure } from "./problems";
import type { ApiQuery } from "./useApiQuery";

/** The field-level failures inside a validation problem, as a list rather than a sentence. */
function FieldProblems({ failure }: { failure: Failure }) {
  if (failure.errors.length === 0) return null;
  return (
    <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
      {failure.errors.map((problem) => (
        <Typography component="li" variant="body2" key={`${problem.field}:${problem.type}`}>
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {problem.field}
          </Box>
          {" — "}
          {problem.message}
        </Typography>
      ))}
    </Box>
  );
}

export interface FailureNoticeProps {
  readonly failure: Failure;
  /**
   * A remedy for this page's case, replacing the general one.
   *
   * `problems.ts` carries only remedies that are true of every deployment. A page that knows better
   * — "publishing is unavailable, but browsing still works, and here is the link" — says so here.
   */
  readonly remedy?: ReactNode;
}

/**
 * One failure, rendered as its kind.
 *
 * Exported because writes need it too: `useApiAction`'s `failed` arm carries the same `Failure`,
 * and a publish form rendering its refusal differently from the way the page renders a read
 * failure is exactly the inconsistency this module exists to remove.
 */
export function FailureNotice({ failure, remedy }: FailureNoticeProps) {
  const remediation = remedy ?? failure.remedy;

  if (failure.kind === "degraded") {
    return (
      <DegradedState
        title={failure.title}
        // The API's sentence, not ours. For `capability_unavailable` it is the only thing that says
        // *which* capability.
        reason={failure.detail}
        remediation={remediation}
      />
    );
  }

  return (
    <AsyncState
      state={{ status: "error", error: failureMessage(failure) }}
      errorRemedy={
        remediation === undefined && failure.errors.length === 0 ? undefined : (
          <>
            {remediation}
            <FieldProblems failure={failure} />
          </>
        )
      }
    >
      {() => null}
    </AsyncState>
  );
}

export interface ApiResultProps<T> {
  readonly query: ApiQuery<T>;
  readonly children: (data: T) => ReactNode;
  /**
   * What to show before the page has asked for anything.
   *
   * The state a page keyed on the query string is in with no subject in the address — legitimate,
   * and its own empty message rather than a spinner. Defaults to nothing, because a page with
   * `enabled` left alone never reaches it.
   */
  readonly idle?: ReactNode;
  /** What to show when the read succeeded and produced nothing. */
  readonly empty?: ReactNode;
  /**
   * Whether a successful result counts as empty.
   *
   * Defaults to "an array with no elements", which is what most of these reads return. A page whose
   * result is an object with a list inside it passes its own.
   */
  readonly isEmpty?: (data: T) => boolean;
  readonly loadingLabel?: string;
  /** A remedy specific to this page, passed through to {@link FailureNotice}. */
  readonly remedy?: ReactNode;
}

function emptyByDefault(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

/**
 * Render an {@link ApiQuery}.
 *
 * ```tsx
 * <ApiResult query={hits} empty={<EmptyState title="Nothing matched" hint="…" />}>
 *   {(rows) => <ResultsTable rows={rows} />}
 * </ApiResult>
 * ```
 */
export function ApiResult<T>({
  query,
  children,
  idle,
  empty,
  isEmpty = emptyByDefault,
  loadingLabel,
  remedy,
}: ApiResultProps<T>) {
  switch (query.status) {
    case "idle":
      return <>{idle ?? null}</>;

    case "unconfigured":
      // Never `AsyncState`'s error arm. A deployment nobody pointed at an API has not failed; it
      // has not been finished, and the remedy is a file to write rather than a fault to chase.
      return (
        <DegradedState
          title="No API is configured"
          reason={
            query.config.status === "configured"
              ? "The API endpoint could not be used."
              : query.config.reason
          }
          remediation={query.config.status === "configured" ? undefined : query.config.remedy}
        />
      );

    case "failed":
      return <FailureNotice failure={query.failure} remedy={remedy} />;

    case "loading":
      return (
        <AsyncState state={{ status: "loading" }} loadingLabel={loadingLabel}>
          {() => null}
        </AsyncState>
      );

    case "ready":
      return (
        <AsyncState
          state={isEmpty(query.data) ? { status: "empty" } : { status: "ready", data: query.data }}
          empty={empty ?? <EmptyState title="Nothing here yet" />}
        >
          {children}
        </AsyncState>
      );
  }
}
