"use client";

// The sidebar's contents (ui#5; ui.md §5).
//
// Grouped, collapsible, and **complete**: every destination the application has is in here, always.
// Nothing is hidden because a backend is missing — "a missing backend is a state, not a missing
// feature" (honesty rule 3), and hiding a page makes an unconfigured deployment indistinguishable
// from a build that never had the feature. The retired shell badged unreachable entries "not
// configured"; that badge belonged to the surface-capability model and went with it, and the honest
// replacement is the shell-level explanation the content region carries.
//
// The group label is a heading and a disclosure control, never a link — a group's own page is its
// **first entry**, so there is exactly one way to reach any route.
//
// **The `nav` landmark is not here.** It is on the container in `AppShell`, which holds both the
// permanent and the temporary drawer: two landmarks with the same name would be two "Sections" in a
// screen reader's landmark list, and only one of them is ever the one on screen.

import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useId, useState } from "react";

import { DisclosureGlyph } from "./icons";
import { NAV_GROUPS } from "./navigation";

export interface SidebarProps {
  /** The single active route, already resolved by longest match. */
  readonly activeHref: string | undefined;
  /** Called after any entry is followed — the drawer closes on navigation below the breakpoint. */
  readonly onNavigate?: () => void;
}

export function Sidebar({ activeHref, onNavigate }: SidebarProps) {
  const idPrefix = useId();
  // Groups start expanded. A sidebar that hides its own contents on first load makes a reader open
  // six things to find out what the application does; collapsing is for a reader who has decided
  // they do not need a section, which is a later state than the first paint.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggle = (label: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <List disablePadding sx={{ py: 1 }}>
      {NAV_GROUPS.map((group) => {
        const open = !collapsed.has(group.label);
        const listId = `${idPrefix}-${group.label}`;

        return (
          <ListItem key={group.label} disablePadding sx={{ display: "block", mb: 0.5 }}>
            <ListItemButton
              onClick={() => toggle(group.label)}
              aria-expanded={open}
              aria-controls={listId}
              dense
              sx={{ px: 2 }}
            >
              <ListItemText
                primary={group.label}
                slotProps={{
                  primary: {
                    variant: "overline",
                    color: "text.secondary",
                    sx: { fontWeight: 700, letterSpacing: "0.08em" },
                  },
                }}
              />
              <DisclosureGlyph open={open} />
            </ListItemButton>

            <Collapse in={open} unmountOnExit>
              <List id={listId} disablePadding>
                {group.entries.map((entry) => {
                  const active = entry.href === activeHref;
                  return (
                    <ListItem key={entry.href} disablePadding>
                      <ListItemButton
                        component={NextLink}
                        href={entry.href}
                        selected={active}
                        onClick={onNavigate}
                        // The one signal that survives a reader who cannot see the highlight.
                        // `selected` alone is a background colour and nothing more.
                        aria-current={active ? "page" : undefined}
                        // The correct ARIA home for a shortcut: announced with the control, and not
                        // glued into its label, which would make the accessible name read
                        // "Leaderboard g l".
                        aria-keyshortcuts={entry.chord?.join(" ")}
                        sx={{ pl: 3, pr: 2, py: 0.75 }}
                      >
                        <ListItemText
                          primary={entry.label}
                          slotProps={{ primary: { variant: "body2" } }}
                        />
                        {entry.chord === undefined ? null : (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            aria-hidden="true"
                            sx={{ fontFamily: "monospace", ml: 1, opacity: 0.7 }}
                          >
                            {entry.chord.join(" ")}
                          </Typography>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </ListItem>
        );
      })}
    </List>
  );
}
