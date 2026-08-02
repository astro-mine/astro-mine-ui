import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/compute/jobs");

export const metadata: Metadata = { title: ENTRY.label };

export default function ComputeJobsPage() {
  return <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={19} />;
}
