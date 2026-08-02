import type { Metadata } from "next";

import { SectionIndex } from "@/components/SectionIndex";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/registry");

export const metadata: Metadata = { title: ENTRY.label };

/**
 * The Registry section index.
 *
 * `ui#10` replaces this with the catalog search it describes — this is the landing page until then,
 * and the section's own description afterwards.
 */
export default function RegistryIndexPage() {
  return (
    <SectionIndex href="/registry" title="Registry">
      The commons&rsquo; front door. Everything the platform can run is stored as a{" "}
      <strong>content-addressed artifact</strong> — a world, a robot, a policy, a published campaign
      — and the registry is where you find one, learn what produced it, and pin the exact bytes.
      Search and browsing are open: reading needs no account.
      <br />
      <br />
      The digest is the identity. A tag or a version spec is a <em>query</em> that resolves to one,
      and it is the digest, not the name, that makes a result reproducible a year from now.
    </SectionIndex>
  );
}
