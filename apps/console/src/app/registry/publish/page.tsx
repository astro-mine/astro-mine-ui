import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry/publish");

export const metadata: Metadata = { title: ENTRY.label };

export default function PublishPage() {
  return <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={11} />;
}
