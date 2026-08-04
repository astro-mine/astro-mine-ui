"use client";

// What a design session is holding (ui#15, extended by ui#16).
//
// **`sessionStorage`, and the choice is deliberate on both sides.** A captured objective and its
// candidates have to survive the walk from `/design/new` to `/design/study`, which is a navigation,
// so component state cannot carry them. They must *not* survive as a permanent record either: this
// is a static front end with no account and no server-side session, and the durable artifact is the
// one the backend already made — `POST /studio/intent` answers a **content-addressed**
// `CapturedObjective`, and `POST /studio/campaigns/publish` answers a signed campaign. Anything
// here is a convenience on the way to those; storing it forever would create a second, unversioned
// copy of state whose relationship to the real artifacts nobody could explain later.
//
// So: one tab, one session, gone when it closes. `ui#16`'s `/design` page is explicit that what it
// lists is "the studies a *session* has".
//
// Every read is defensive. `sessionStorage` is shared with whatever else ran on this origin, a
// reader can edit it, and a stale entry from a previous build is a real possibility — so a value
// that does not parse is discarded rather than thrown.

import type { CapturedObjective, DesignCandidate } from "./types";

const KEY = "astro-mine.design.session";

/** What one session has composed and launched. */
export interface DesignSession {
  /** The Core-validated objective the backend made, with its digest. */
  readonly objective?: CapturedObjective;
  /** The candidate swarms composed against it. */
  readonly candidates?: readonly DesignCandidate[];
  /** Study ids this session launched or opened, most recent first. */
  readonly studies?: readonly string[];
}

const EMPTY: DesignSession = {};

function storage(): Storage | null {
  // Absent during prerender, and a browser may refuse it outright (private mode, blocked storage).
  // A design session that cannot be stored is a degraded convenience, not an error.
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSession(): DesignSession {
  const store = storage();
  if (store === null) return EMPTY;
  const raw = store.getItem(KEY);
  if (raw === null) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY;
    return parsed as DesignSession;
  } catch {
    // Not ours, or from a build that shaped it differently. Discard rather than throw: a corrupt
    // convenience must not take the page with it.
    return EMPTY;
  }
}

/** Merge into the session. Returns what it now holds, so a caller can render it immediately. */
export function writeSession(patch: DesignSession): DesignSession {
  const next = { ...readSession(), ...patch };
  const store = storage();
  if (store !== null) {
    try {
      store.setItem(KEY, JSON.stringify(next));
    } catch {
      // Quota, or a browser refusing to store. The page still works; only the walk between pages
      // loses its memory.
    }
  }
  return next;
}

/** Record a study id, most recent first and without duplicates. */
export function rememberStudy(studyId: string): DesignSession {
  const seen = readSession().studies ?? [];
  return writeSession({ studies: [studyId, ...seen.filter((id) => id !== studyId)].slice(0, 20) });
}
