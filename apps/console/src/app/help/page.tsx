import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/help");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * Help.
 *
 * This route had been in the information architecture since the rebuild was planned and **no issue
 * owned it** — `ui.md` §5 listed it, the user guide listed it, and the sidebar was about to link to
 * it. `ui#34` was filed while building this shell to close that gap, and it is what fills this page.
 */
export default function HelpPage() {
  return <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={34} />;
}
