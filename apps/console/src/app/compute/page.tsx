import type { Metadata } from "next";

import { SectionIndex } from "@/components/SectionIndex";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/compute");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The Compute section index.
 *
 * No Wave-29 issue owns this route — `ui#19` builds the two pages under it. Like the Benchmark
 * index, it is finished rather than pending.
 */
export default function ComputeIndexPage() {
  return (
    <SectionIndex href="/compute" title="Compute">
      Where work actually runs. A deployment offers one or more <strong>backends</strong>, and jobs,
      parameter sweeps and workflows are submitted to them.
      <br />
      <br />
      The part worth knowing about is the <strong>compile preview</strong>: a sweep or a workflow
      expands to a concrete plan <em>before</em> anything is submitted, and seeing that plan is the
      difference between launching a thousand runs and finding out afterwards what they were.
      Nothing on these pages computes a plan of its own — what is shown is what the backend
      returned.
    </SectionIndex>
  );
}
