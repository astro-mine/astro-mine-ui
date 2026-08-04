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

import type { CapturedObjective, DesignCandidate, TradeStudy } from "./types";

const KEY = "astro-mine.design.session";

/** What one session has composed and launched. */
export interface DesignSession {
  /** The Core-validated objective the backend made, with its digest. */
  readonly objective?: CapturedObjective;
  /** The candidate swarms composed against it. */
  readonly candidates?: readonly DesignCandidate[];
  /**
   * The trade studies this session ran, by id, most recent first.
   *
   * **The whole document, not just the id, and that is forced by the API rather than chosen.**
   * There is no `GET /studio/studies/{id}`: a comparison is computed by `POST
   * /studio/studies/comparison`, which takes the `TradeStudy` **as its body**. So a browser that
   * wants to render a study has to be holding the study. The consequence — a study link only
   * resolves in the session that ran it — is stated on the page rather than hidden behind a
   * spinner, and it is the first thing a `GET` route would fix.
   */
  readonly studies?: readonly TradeStudy[];
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

/** Record a trade study, most recent first and without duplicates. */
export function rememberStudy(study: TradeStudy): DesignSession {
  const seen = readSession().studies ?? [];
  return writeSession({
    studies: [study, ...seen.filter((held) => held.id !== study.id)].slice(0, 20),
  });
}

/**
 * The study with this id, if this session ran it — or the seeded example.
 *
 * The example resolves without having been "launched", which is the point of it: a reader who
 * follows its link before running anything gets a comparison rather than the not-in-this-session
 * notice. It is still unmistakably an example, because it carries a stand-in evaluator and the
 * comparison page banners that through its ordinary path.
 *
 * `undefined` otherwise, and that is a state rather than an error — see `StudyComparison`.
 */
export function readStudy(studyId: string): TradeStudy | undefined {
  if (studyId === EXAMPLE_STUDY_ID) return exampleStudy();
  return readSession().studies?.find((study) => study.id === studyId);
}

/**
 * The seeded example, which is **badged as an example wherever a number of its appears**.
 *
 * ui#16 asks for a study to look at before you have run one, and is equally clear that it must
 * never be passed off as the reader's own result. So it is a real `TradeStudy` document with a
 * deliberately unmistakable id and a **stand-in evaluator**, which means the comparison page's
 * first honesty statement fires on it for the ordinary reason rather than as a special case: no
 * physics was run, and the page already knows how to say that.
 */
export const EXAMPLE_STUDY_ID = "example-lunar-ice";

export function exampleStudy(): TradeStudy {
  return {
    id: EXAMPLE_STUDY_ID,
    objective_hash: "sha256:example",
    backend: "example",
    // `fixture/…` — so `isStandInEvaluator` recognises it through the same namespace rule the
    // leaderboard uses, and the banner is the real one rather than a second mechanism.
    evaluator: "fixture/example",
    seeds: [1],
    evaluated: [],
    pareto_front: ["two-excavators"],
    provenance: { core_interface_versions: {}, engine_versions: {}, input_hashes: [] },
  };
}
