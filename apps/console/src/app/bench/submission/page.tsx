import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/submission");

const IDENTITY = ["id"] as const;

export const metadata: Metadata = { title: ENTRY.label };

export default function SubmissionPage() {
  return (
    <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={12} identity={IDENTITY} />
  );
}
