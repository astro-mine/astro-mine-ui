import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/audit");

export const metadata: Metadata = { title: ENTRY.label };

export default function AuditPage() {
  return <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={14} />;
}
