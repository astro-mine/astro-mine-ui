"use client";

// Every destination the application has, grouped (ui#5).
//
// The `not-found` page's remedy: a reader who arrived at an address that serves nothing is not lost,
// they are on a page that does not exist — and the cheapest possible fix is to show them everything
// that does. Compact buttons rather than cards, because eighteen cards is a scroll and eighteen
// buttons is a glance.
//
// A client component for the reason `EntryCards` is: it renders `component={NextLink}`, and a
// function cannot cross the server/client boundary as a prop. `NavGroup[]` is plain data and does.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { NavGroup } from "@/shell/navigation";

export interface RouteDirectoryProps {
  readonly groups: readonly NavGroup[];
}

export function RouteDirectory({ groups }: RouteDirectoryProps) {
  return (
    <Stack spacing={3}>
      {groups.map((group) => (
        <Box key={group.label}>
          <Typography variant="overline" color="text.secondary">
            {group.label}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
            {group.entries.map((entry) => (
              <Button
                key={entry.href}
                component={NextLink}
                href={entry.href}
                size="small"
                variant="outlined"
              >
                {entry.label}
              </Button>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
