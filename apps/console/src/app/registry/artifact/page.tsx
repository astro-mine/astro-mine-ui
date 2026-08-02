import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry/artifact");

/** Identity in the query string, never in the path (ui.md §5.1) — a name is not enumerable. */
const IDENTITY = ["name", "version"] as const;

export const metadata: Metadata = { title: ENTRY.label };

export default function ArtifactPage() {
  return (
    <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={10} identity={IDENTITY} />
  );
}
