// A section's landing page (ui#5).
//
// Every group in the sidebar leads with one of these: what the section is for, and each of its pages
// with the one line that says what it does. It calls no API and takes no parameter, so it is the one
// page in a section that works in every deployment state — which is exactly what a landing page
// should be.
//
// **The child list is read from the navigation table**, not written out here, so a page added to a
// section appears on its index without anyone remembering to add it. That is the same reason the
// sidebar and the breadcrumbs read from it.
//
// A server component: the links themselves live in `EntryCards`, which has to be a client component
// and says why.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { EntryCards } from "@/components/EntryCards";
import { childrenOf, entryFor } from "@/shell/navigation";

export interface SectionIndexProps {
  /** The section's own route — its children are derived from it. */
  readonly href: string;
  /** The heading. The *group's* name, which is what a reader arriving here is looking for. */
  readonly title: string;
  /** What this part of the platform is, in a paragraph a newcomer can act on. */
  readonly children: ReactNode;
}

export function SectionIndex({ href, title, children }: SectionIndexProps) {
  const entries = childrenOf(href);
  const self = entryFor(href);

  return (
    <Box sx={{ maxWidth: 880, py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" component="div" sx={{ mb: 4 }}>
        {children}
      </Typography>

      {entries.length === 0 ? null : (
        <>
          <Typography variant="h6" component="h2" gutterBottom>
            Pages
          </Typography>
          <EntryCards
            entries={entries.map((entry) => ({
              href: entry.href,
              label: entry.label,
              summary: entry.summary,
            }))}
          />
        </>
      )}

      {self === undefined ? null : (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 4 }}>
          {self.summary}
        </Typography>
      )}
    </Box>
  );
}
