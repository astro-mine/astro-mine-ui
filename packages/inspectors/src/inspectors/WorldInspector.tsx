// A world artifact renders a globe (ui#7; ui.md §6).
//
// **The globe arrives as a slot, and that is structural.** `@astro-mine/view` publishes one entry
// that re-exports its Cesium module, so importing anything from it here would put Cesium in the
// graph of every page that renders an artifact row — four megabytes on a leaderboard, and a CI lane
// that already asserts the Cesium chunk is preloaded by no prerendered route. The application owns
// the single `next/dynamic`, `ssr: false`, `CESIUM_BASE_URL` mount, and `check-layering.mjs` says in
// as many words that a second importer inherits none of its care. So this panel arranges a globe it
// is handed; it does not summon one. See `InspectorSlots`.

import { DegradedState, Digest } from "@astro-mine/ui";
import Box from "@mui/material/Box";

import { FactList, Panel } from "./Panel.js";
import type { InspectorPanelProps } from "../model.js";

/** A string attribute off the open `manifest.attributes` map, or `null` if it is not one. */
function text(attributes: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = attributes[key];
  return typeof value === "string" && value !== "" ? value : null;
}

export function WorldInspector({ subject, slots }: InspectorPanelProps) {
  // `body` is the one attribute Hub-published world bundles are documented to stamp (the API's own
  // `WorldEntry` reads it from exactly here). It is absent on a bundle that predates the convention,
  // and an absent body is shown as absent rather than guessed at.
  const body = text(subject.attributes, "body");

  return (
    <Panel
      title="World"
      summary="The terrain bundle this artifact publishes, and where on the body it is anchored."
    >
      <FactList
        label="World identity"
        facts={[
          { label: "Reference", value: subject.reference },
          { label: "Digest", value: <Digest value={subject.digest} /> },
          { label: "Body", value: body ?? "Not stated on the manifest" },
          { label: "Container kind", value: subject.artifactKind ?? "—" },
        ]}
      />

      {slots?.globe === undefined ? (
        <DegradedState
          title="No terrain rendered"
          reason={
            "This page did not resolve a terrain bundle for the artifact, so there is nothing to " +
            "draw. The artifact's identity above is unaffected — what is missing is the geometry, " +
            "not the record."
          }
          // No remediation, on purpose. A panel cannot know *why* the page has no globe — an
          // unconfigured registry, a bundle published before tileset anchors, a deployment that
          // serves no world route — and `DegradedState`'s own contract is that inventing a fix a
          // reader cannot act on is worse than admitting there is none to offer.
        />
      ) : (
        <Box sx={{ height: 420, border: 1, borderColor: "divider", borderRadius: 1 }}>
          {slots.globe}
        </Box>
      )}
    </Panel>
  );
}
