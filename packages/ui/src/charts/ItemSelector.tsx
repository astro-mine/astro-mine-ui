"use client";

// Selecting a mark, for everyone who is not holding a mouse (ui#4; ui.md §7 rule 7).
//
// **Why the marks themselves are not the control.** MUI X renders its SVG `aria-hidden`, and the
// hand-built parallel-coordinates plot is `aria-hidden` for the same reason — the chart's words live
// in `ChartFrame`'s figcaption, so the marks would otherwise be read twice. A focusable element
// inside an `aria-hidden` subtree is one assistive technology cannot reach, and axe rejects it
// (`aria-hidden-focus`). So the keyboard path is what it should have been anyway: real buttons, in a
// real list, outside the graphic.
//
// **It reveals on focus rather than staying hidden.** A control a sighted keyboard user can operate
// but cannot see is its own failure — they would be tabbing into nothing. Hidden until focus, then
// visible: one list, both audiences, and nothing added to the page for a reader who is using the
// mouse the marks already answer to.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { VISUALLY_HIDDEN } from "./ChartFrame.js";

export interface SelectableItem {
  readonly id: string;
  /** The visible button text. */
  readonly label: string;
  /**
   * The button's accessible name. **Must begin with `label`** — an accessible name that does not
   * contain the visible one breaks WCAG 2.5.3 and leaves a voice-control user unable to say the
   * thing they can see.
   */
  readonly description: string;
}

export interface ItemSelectorProps {
  readonly items: readonly SelectableItem[];
  readonly selectedId: string | null;
  /** Called with an id, or `null` when the selected item is chosen again. */
  readonly onSelect: (id: string | null) => void;
  /** Names the list, e.g. "Select a candidate". */
  readonly listLabel: string;
}

export function ItemSelector({ items, selectedId, onSelect, listLabel }: ItemSelectorProps) {
  return (
    <Box
      component="ul"
      aria-label={listLabel}
      sx={{
        ...VISUALLY_HIDDEN,
        listStyle: "none",
        "&:focus-within": {
          position: "static",
          clip: "auto",
          width: "auto",
          height: "auto",
          overflow: "visible",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
        },
      }}
    >
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <li key={item.id}>
            <Button
              size="small"
              variant={selected ? "contained" : "outlined"}
              aria-pressed={selected}
              aria-label={item.description}
              onClick={() => onSelect(selected ? null : item.id)}
            >
              {item.label}
            </Button>
          </li>
        );
      })}
    </Box>
  );
}
