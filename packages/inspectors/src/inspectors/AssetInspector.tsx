// An asset artifact renders its geometry and the capabilities it declares (ui#7; ui.md §6).
//
// The geometry preview arrives as a slot for the same structural reason the globe does — the
// application owns the one Cesium mount, and this package may not reach past it. See
// `WorldInspector` and `InspectorSlots`.
//
// The **vehicle** kind is `attributes["asset_kind"]`, never the plugin kind: every asset's
// `PluginKind` is `asset`, which says nothing about whether it is a rover or an orbiter. The API's
// own `MenuEntry` reads it from the same place and says so in its description.

import { Digest, EmptyState } from "@astro-mine/ui";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import { ChipRow, FactList, Panel } from "./Panel.js";
import type { InspectorPanelProps } from "../model.js";

function text(attributes: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = attributes[key];
  return typeof value === "string" && value !== "" ? value : null;
}

export function AssetInspector({ subject, slots }: InspectorPanelProps) {
  const vehicleKind = text(subject.attributes, "asset_kind");
  const tags = subject.capabilityTags ?? [];

  return (
    <Panel
      title="Asset"
      summary="The SADF bundle this artifact publishes: what kind of vehicle it describes, and what it declares it can do."
    >
      <FactList
        label="Asset identity"
        facts={[
          { label: "Reference", value: subject.reference },
          { label: "Digest", value: <Digest value={subject.digest} /> },
          // Absent rather than guessed: a bundle published before the convention carries no
          // `asset_kind`, and "rover" inferred from a name would be a fact this page invented.
          { label: "Vehicle kind", value: vehicleKind ?? "Not stated on the manifest" },
          {
            label: "Capability tags",
            value:
              tags.length === 0 ? (
                "None declared"
              ) : (
                <ChipRow>
                  {tags.map((tag) => (
                    <Chip key={tag} size="small" variant="outlined" label={tag} />
                  ))}
                </ChipRow>
              ),
          },
        ]}
      />

      {slots?.geometry === undefined ? (
        <EmptyState
          title="No geometry preview"
          hint="This page did not resolve a visual geometry for the asset. A SADF bundle can legitimately ship without one — a document that describes mass, power and capability but carries no mesh is a complete asset, not a broken one."
        />
      ) : (
        // Clipped for the reason `WorldInspector`'s frame is: a fixed-height rounded frame holds
        // what it is given, and a geometry preview is another thing that sizes itself.
        <Box
          sx={{
            height: 360,
            overflow: "hidden",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {slots.geometry}
        </Box>
      )}
    </Panel>
  );
}
