// The honest "no inspector for this" (ui#7; ui.md §6, §7 rule 3).
//
// **"No match. The slot MUST render an honest 'no inspector for kind X'. Never blank."**
//
// This is not a contribution — it is what the slot renders when nothing claimed the subject, and it
// is deliberately not registered under a wildcard kind. A wildcard would match everything at
// specificity zero, which turns every genuine no-match into a *resolution* and hides the one signal
// that says the vocabulary has grown past the registry.
//
// It names the kind, because "no inspector" alone tells a reader nothing they can act on, and the
// action here is real: a `PluginKind` this build has never heard of means the platform has moved and
// `pnpm codegen:vocabularies --refresh` is the next step.

import { DegradedState, Digest } from "@astro-mine/ui";

import { Panel, FactList } from "./Panel.js";
import type { InspectorPanelProps } from "../model.js";

export interface FallbackInspectorProps extends InspectorPanelProps {
  /** The Core kind nothing claimed. `null` when the artifact declares none at all. */
  readonly kind: string | null;
}

export function FallbackInspector({ subject, kind }: FallbackInspectorProps) {
  return (
    <Panel title="No inspector for this artifact">
      <DegradedState
        title={
          kind === null ? "This artifact declares no Core kind" : `No inspector for kind “${kind}”`
        }
        reason={
          kind === null
            ? "The catalog record carries no `manifest.kind`, so there is nothing to resolve a " +
              "panel by. The artifact is still here, and its identity is below."
            : `Nothing in this build renders a “${kind}” artifact. Either no inspector has been ` +
              `written for that kind yet, or the platform's vocabulary has grown past the copy ` +
              `this front end was generated against.`
        }
        // Deliberately absent for the null-kind case: there is no user-side fix for a record that
        // was indexed without a kind, and inventing one would be worse than admitting there is none
        // (`DegradedState`'s own contract).
        remediation={
          kind === null
            ? undefined
            : "If the kind is new, refresh the generated vocabularies (pnpm codegen:vocabularies --refresh); otherwise this kind has no panel yet."
        }
      />
      <FactList
        label="Artifact identity"
        facts={[
          { label: "Reference", value: subject.reference },
          { label: "Digest", value: <Digest value={subject.digest} /> },
          { label: "Core kind", value: kind ?? "—" },
          { label: "Container kind", value: subject.artifactKind ?? "—" },
        ]}
      />
    </Panel>
  );
}
