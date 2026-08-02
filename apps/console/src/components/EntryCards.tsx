"use client";

// A list of destinations as cards (ui#5).
//
// **Why this is a client component, and why that is not incidental.** It renders
// `component={NextLink}`, and `NextLink` is a function. A server component cannot pass a function to
// a client component — the props cross the boundary as serialized data, and `next build` fails the
// whole page with *"Functions cannot be passed directly to Client Components"*. So the rule this
// file exists to keep is: **anything that renders `component={NextLink}` is a client component**, and
// the pages above it stay server components that own their metadata and their prose. What crosses
// the boundary here is an array of plain objects, which serializes.
//
// It is shared by Home and by every section index because they render the same thing — a destination
// with its one-line description — and two copies would drift the first time one of them gained a
// state the other did not.

import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

/** A destination, flattened to what a card needs — and to what crosses the boundary. */
export interface EntryCard {
  readonly href: string;
  readonly label: string;
  readonly summary: string;
}

export interface EntryCardsProps {
  readonly entries: readonly EntryCard[];
}

export function EntryCards({ entries }: EntryCardsProps) {
  if (entries.length === 0) return null;

  return (
    <Stack spacing={1.5} component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
      {entries.map((entry) => (
        <Card key={entry.href} component="li" variant="outlined">
          <CardActionArea component={NextLink} href={entry.href} sx={{ p: 2 }}>
            <Typography variant="subtitle1" component="h3">
              {entry.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entry.summary}
            </Typography>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
