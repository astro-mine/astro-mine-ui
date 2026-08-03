// A policy artifact renders the contract it declares (ui#7; ui.md §6).
//
// **Not a Bench scorecard, and it must not read like one.** `ui.md` §6 says "a `policy` renders a
// scorecard", and the tempting reading is the leaderboard's — per-metric scores with uncertainty
// bounds. Those are addressed by `scenario_id`, which an artifact reference does not carry and
// cannot be derived from: a policy is scored against scenarios, plural, and none of them are named
// on its manifest. Borrowing the word for a panel that shows no scores would be the exact laundering
// the honesty kit exists to stop. What an artifact *can* answer for itself is what it claims to
// implement — so that is what this shows, and the heading says so.
//
// Provenance sits above the facts, not below them: "what produced a number is read before the number
// is" (ui.md §7 rule 5).

import { Digest, EmptyState, ProvenanceList, type ProvenanceEntry } from "@astro-mine/ui";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { ChipRow, FactList, Panel } from "./Panel.js";
import type { InspectorPanelProps, InspectorSubject } from "../model.js";

function provenanceOf(subject: InspectorSubject): ProvenanceEntry[] {
  const entries: ProvenanceEntry[] = [{ label: "Digest", digest: subject.digest }];
  if (subject.publisher) entries.push({ label: "Publisher", value: subject.publisher });
  if (subject.namespace) entries.push({ label: "Namespace", value: subject.namespace });
  if (subject.license) entries.push({ label: "License", value: subject.license });
  return entries;
}

export function PolicyInspector({ subject }: InspectorPanelProps) {
  const interfaces = subject.coreInterfaces ?? [];
  const tags = subject.capabilityTags ?? [];
  const attestations = subject.attestations ?? [];

  return (
    <Panel
      title="Policy — the contract it declares"
      summary="What this policy says it implements, read off its Core manifest. These are declarations, not measurements: nothing here is a benchmark result."
    >
      <ProvenanceList label="Policy provenance" entries={provenanceOf(subject)} />

      <FactList
        label="Declared contract"
        facts={[
          { label: "Reference", value: subject.reference },
          { label: "Digest", value: <Digest value={subject.digest} /> },
          {
            label: "Core interfaces",
            value:
              interfaces.length === 0 ? (
                "None declared"
              ) : (
                <ChipRow>
                  {interfaces.map((entry) => (
                    <Chip
                      key={entry.interface}
                      size="small"
                      variant="outlined"
                      label={`${entry.interface} ${entry.version}`}
                    />
                  ))}
                </ChipRow>
              ),
          },
          {
            label: "Capability tags",
            value:
              tags.length === 0 ? (
                "None declared"
              ) : (
                // Rendered plainly, with no gated/ungated mark. Marking export-controlled tags
                // needs Core's `GATED_CAPABILITY_TAGS`, which is a `frozenset` of enum *references*
                // rather than of literals and so needs a third extractor form in
                // `scripts/lib/platform-vocabularies.mjs`. Claiming nothing is honest; guessing
                // which tags are gated would not be.
                <ChipRow>
                  {tags.map((tag) => (
                    <Chip key={tag} size="small" variant="outlined" label={tag} />
                  ))}
                </ChipRow>
              ),
          },
          { label: "Inputs", value: (subject.inputs ?? []).join(", ") || "None declared" },
          { label: "Outputs", value: (subject.outputs ?? []).join(", ") || "None declared" },
        ]}
      />

      {/* Honesty rule 6, and the wording is the point: attestations PRESENT in a registry are not a
          verified supply chain. The API's own schema says the same thing about this field. */}
      {attestations.length === 0 ? (
        <EmptyState
          title="No attestations present"
          hint="This registry holds no signature, provenance or SBOM attestation for this artifact. That is a statement about the registry, not a verdict about the artifact."
        />
      ) : (
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h3">
            Attestations present in this registry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Present, not verified. Nothing in this browser has checked a signature; these are the
            attestation types the registry reports holding.
          </Typography>
          <ChipRow component="div">
            {attestations.map((attestation) => (
              <Chip key={attestation} size="small" variant="outlined" label={attestation} />
            ))}
          </ChipRow>
        </Stack>
      )}
    </Panel>
  );
}
