import type { Metadata } from "next";

import { SectionIndex } from "@/components/SectionIndex";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The Benchmark section index.
 *
 * No Wave-29 issue owns this route — `ui#12` builds the leaderboard, `ui#13` the replay and `ui#14`
 * the write path, and each of those is a page under it. So this one is finished rather than pending:
 * it is the section's landing page, and it explains what a benchmark result means before a reader
 * reads one. Nothing here is a stand-in.
 */
export default function BenchIndexPage() {
  return (
    <SectionIndex href="/bench" title="Benchmark">
      A <strong>scenario</strong> is a task on a world with a fixed set of held-out seeds; a{" "}
      <strong>submission</strong> is a policy evaluated against one; and a leaderboard is the
      ranking that follows. Everything is scored server-side against seeds the submitter never sees.
      <br />
      <br />
      Two things are always said in place rather than in a footnote, because both change what a
      number means. <strong>How it was run</strong> — a fixture-scored entry is a deterministic
      stand-in that never touched the simulator, and it is badged in its own row. And{" "}
      <strong>what is known about its precision</strong> — a metric with cross-seed dispersion shows
      its bound, one without shows an open value, and a metric that does not apply shows a dash. A
      zero is never printed for a number nobody measured.
    </SectionIndex>
  );
}
