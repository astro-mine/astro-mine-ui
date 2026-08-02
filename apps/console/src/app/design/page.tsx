import type { Metadata } from "next";

import { SectionIndex } from "@/components/SectionIndex";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/design");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The Design section index.
 *
 * `ui#16` replaces this with the list of studies a session has — the description stays.
 */
export default function DesignIndexPage() {
  return (
    <SectionIndex href="/design" title="Design">
      State what a mission has to achieve, compose the candidate swarms that might achieve it, and
      compare them on the evidence. This is the one part of the platform where the GUI is the
      product rather than a convenience: everything else has a command-line answer, and stating an
      objective and reading a Pareto front does not.
      <br />
      <br />
      The backend does the deciding. The front, the bounds and the metric vocabulary all arrive from
      the API — no page here re-ranks anything, and a study that says every candidate is on the
      front is telling you something about the scoring rather than about the designs.
    </SectionIndex>
  );
}
