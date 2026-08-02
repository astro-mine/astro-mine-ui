"use client";

// The keyboard contract (ui#5; ui.md §7 honesty rule 7).
//
// Two bindings, carried over from the retired shell because they earned their place there:
//
//   `g` then a letter — jump to a high-traffic destination. The chord is the keyboard equal of "the
//   leaderboard is one click from anywhere", and it is a *chord* rather than a bare letter so that
//   no single keystroke can move a reader who was only trying to type.
//
//   `/` — focus the global search. Universal enough in web applications that a reader tries it
//   before looking for the box.
//
// **Neither fires while the reader is typing.** A shortcut that steals a keystroke from a text field
// is worse than no shortcut, and this is the failure mode a naive `window.addEventListener` has by
// default. The guard covers inputs, textareas, selects and anything `contenteditable`.
//
// **Modified keystrokes are left alone.** `Ctrl`/`Cmd`/`Alt` combinations belong to the browser and
// to assistive technology — a screen reader's own commands are modified keystrokes, and shadowing
// one is an accessibility defect rather than a convenience.
//
// The chord's second key must arrive within the timeout, otherwise a `g` typed minutes ago would
// still be armed and an innocent `l` would navigate.

import { useEffect, type RefObject } from "react";

import { CHORDS } from "./navigation";

/** How long the chord stays armed after `g`. Long enough to be deliberate, short enough to forget. */
const CHORD_TIMEOUT_MS = 1200;

function isTyping(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  if (node === null) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

export interface NavigationShortcutsOptions {
  /** Where to send the reader. The router's `push`, or a test's spy. */
  readonly navigate: (href: string) => void;
  /** The global search field, focused by `/`. */
  readonly searchRef: RefObject<HTMLInputElement | null>;
}

/**
 * Bind the shell's shortcuts for as long as the shell is mounted.
 *
 * Returns nothing: there is no state a caller needs, and exposing the armed flag would invite a
 * component to render differently mid-chord — a flicker keyed to a keystroke nobody has finished.
 */
export function useNavigationShortcuts({ navigate, searchRef }: NavigationShortcutsOptions): void {
  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const disarm = () => {
      armed = false;
      clearTimeout(timer);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/" && !armed) {
        const search = searchRef.current;
        if (search !== null) {
          event.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      if (armed) {
        const href = CHORDS.get(`g ${event.key}`);
        disarm();
        if (href !== undefined) {
          event.preventDefault();
          navigate(href);
        }
        return;
      }

      if (event.key === "g") {
        armed = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          armed = false;
        }, CHORD_TIMEOUT_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [navigate, searchRef]);
}
