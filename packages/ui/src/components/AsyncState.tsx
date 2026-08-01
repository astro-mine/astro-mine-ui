import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { EmptyState } from "./EmptyState.js";

/**
 * The state of a request, as the user should see it (ui#3; ui.md §2, §9; conventions.md §2.1).
 *
 * The platform deliberately ships **no** data-fetching or client-cache library. That is not an
 * omission to be worked around — the discipline that matters is *what the reader is shown* while a
 * request is in flight or has failed, not how the request was made. This union is that discipline's
 * vocabulary, and {@link AsyncState} is the only thing that renders it.
 *
 * **Four arms, not three.** `empty` is separate from `ready` with an empty array because they mean
 * different things to a reader and deserve different words: "this returned nothing" is an answer,
 * and rendering it as an empty table is not.
 */
export type Async<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly data: T };

export interface AsyncStateProps<T> {
  readonly state: Async<T>;
  /** Renders the data. Called only in the `ready` arm, so it never sees a partial value. */
  readonly children: (data: T) => ReactNode;
  /** What is loading, for assistive technology and for anyone watching a slow request. */
  readonly loadingLabel?: string;
  /** Replaces the default empty state — pass an {@link EmptyState} with words that fit the page. */
  readonly empty?: ReactNode;
  /** What to try, when the caller knows something better than "try again". */
  readonly errorRemedy?: ReactNode;
}

/**
 * **The one loading / error / empty discipline in the application.**
 *
 * The acceptance criterion attached to this component is unusual and worth stating where the code
 * is: *no page in the repository may define its own loading, error or empty markup.* The previous
 * front end hand-wrote those three branches in seven places, and they diverged — some spun without
 * saying what they were waiting for, some rendered a failed request as a blank pane, and one
 * rendered "no results" identically to "the backend is down". Centralising them is how "never a
 * blank pane" stops depending on every author remembering.
 *
 * `tests/surface.test.ts` asserts the package exports no alternative, so the rule is enforced by
 * the absence of a second option rather than by review.
 */
export function AsyncState<T>({
  state,
  children,
  loadingLabel = "Loading…",
  empty,
  errorRemedy,
}: AsyncStateProps<T>) {
  switch (state.status) {
    case "loading":
      return (
        // A live region, so the wait is announced rather than merely animated. `aria-busy` is what
        // tells assistive technology this is a pending state and not a static one.
        <Stack
          direction="row"
          spacing={1.5}
          role="status"
          aria-busy="true"
          sx={{ alignItems: "center", px: 1, py: 2, color: "text.secondary" }}
        >
          <CircularProgress size={18} aria-hidden="true" />
          <Typography variant="body2">{loadingLabel}</Typography>
        </Stack>
      );

    case "error":
      return (
        <Alert severity="error" role="alert">
          <AlertTitle>Something went wrong</AlertTitle>
          {/* The message the request actually produced, not a paraphrase of it. A reader who has
              to report this needs the words the system used. */}
          <Typography variant="body2" component="p">
            {state.error}
          </Typography>
          {errorRemedy === undefined ? null : (
            <Typography variant="body2" component="p" sx={{ mt: 1 }}>
              {errorRemedy}
            </Typography>
          )}
        </Alert>
      );

    case "empty":
      return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

    case "ready":
      return <>{children(state.data)}</>;
  }
}
