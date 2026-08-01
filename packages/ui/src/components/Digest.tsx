"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

import { CopyGlyph, ExpandGlyph } from "./icons.js";

/**
 * A content address, rendered as identity (ui#3; ui.md §2, honesty rule 4).
 *
 * **"The digest is the identity. A tag is a query; the content address is what a reader pins."** A
 * version tag answers *which artifact did you mean*; it can be moved, and the answer changes. The
 * digest answers *which bytes did you get*, and it cannot. Every surface in this platform that shows
 * a tag must be able to show the address underneath it, which is what this is for.
 *
 * Three properties, and each exists because leaving it out breaks the rule:
 *
 * - **Abbreviated**, because a full `sha256:` address is 71 characters and would push everything
 *   else out of a table row — a digest nobody can fit on screen is a digest nobody shows.
 * - **Expandable to the full value**, because an abbreviation is not an identity. A reader
 *   comparing two artifacts, or pasting one into a command, needs all of it, and a truncation with
 *   no way to recover the rest is a dead end.
 * - **Copyable**, and what is copied is always the **full** address regardless of what is displayed.
 *   Copying the abbreviation would hand someone a string that looks like a digest and resolves to
 *   nothing.
 */
export interface DigestProps {
  /** The full content address — e.g. `"sha256:be40…7d12"`. Abbreviated for display, copied whole. */
  readonly value: string;
  /** An optional lead-in naming what the address identifies — "World", "Fleet", "Core schema". */
  readonly label?: string;
  /** Start expanded. Defaults to abbreviated, which is what a table row wants. */
  readonly defaultExpanded?: boolean;
}

/** Hex kept from the head of the address; enough to be recognisable in a list. */
const HEAD = 8;
/** Hex kept from the tail; the part a reader uses to tell two similar addresses apart. */
const TAIL = 6;

/**
 * Shorten `algorithm:hex` while keeping the algorithm, which is part of the identity — `sha256:` and
 * `sha512:` are different address spaces, and hiding which one is in play would make two unrelated
 * addresses look comparable.
 *
 * Returns the input unchanged when abbreviating would not actually shorten it, so a short digest
 * never grows an ellipsis that hides nothing.
 */
export function abbreviateDigest(value: string): string {
  const separator = value.indexOf(":");
  const algorithm = separator === -1 ? "" : value.slice(0, separator + 1);
  const body = separator === -1 ? value : value.slice(separator + 1);

  if (body.length <= HEAD + TAIL + 1) return value;
  return `${algorithm}${body.slice(0, HEAD)}…${body.slice(-TAIL)}`;
}

export function Digest({ value, label, defaultExpanded = false }: DigestProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clearing on unmount matters more than it looks: a digest in a table row is unmounted whenever
  // the list re-sorts, and a pending timer would set state on a component that no longer exists.
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const abbreviated = abbreviateDigest(value);
  const isAbbreviated = abbreviated !== value;

  async function copy() {
    // Guarded rather than assumed: `navigator.clipboard` is absent on insecure origins, and a page
    // served over plain HTTP inside a lab network is a real deployment of this application. Copy
    // failing quietly is acceptable; the page throwing is not.
    if (typeof navigator === "undefined" || navigator.clipboard?.writeText === undefined) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, maxWidth: "100%" }}
    >
      {label === undefined ? null : (
        <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
      )}

      <Typography
        component="code"
        variant="body2"
        title={value}
        sx={{
          fontFamily: (t) => t.typography.fontFamilyMonospace,
          fontVariantNumeric: "tabular-nums",
          // Only the expanded form wraps. Abbreviated, it must stay on one line or it defeats the
          // purpose of abbreviating.
          overflowWrap: expanded ? "anywhere" : "normal",
          wordBreak: expanded ? "break-all" : "normal",
          whiteSpace: expanded ? "normal" : "nowrap",
        }}
      >
        {expanded ? value : abbreviated}
      </Typography>

      {isAbbreviated ? (
        <Tooltip title={expanded ? "Show the abbreviated digest" : "Show the full digest"}>
          <IconButton
            size="small"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? "Show the abbreviated digest" : "Show the full digest"}
          >
            <ExpandGlyph open={expanded} />
          </IconButton>
        </Tooltip>
      ) : null}

      <Tooltip title="Copy the full digest">
        <IconButton size="small" onClick={copy} aria-label="Copy the full digest">
          <CopyGlyph />
        </IconButton>
      </Tooltip>

      {/* The confirmation. A copy button that gives no feedback leaves a reader pressing it twice
          to find out whether it worked — and a visual-only confirmation leaves a screen-reader user
          with no way to find out at all. */}
      <Box
        component="span"
        role="status"
        aria-live="polite"
        sx={
          copied
            ? { fontSize: "0.75rem", color: "text.secondary" }
            : {
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
              }
        }
      >
        {copied ? "Digest copied" : ""}
      </Box>
    </Box>
  );
}
