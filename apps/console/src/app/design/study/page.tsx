import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design/study");

const IDENTITY = ["id"] as const;

export const metadata: Metadata = { title: ENTRY.label };

export default function StudyPage() {
  return (
    <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={16} identity={IDENTITY} />
  );
}
