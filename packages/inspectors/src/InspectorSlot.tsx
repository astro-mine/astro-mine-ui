// The extension point (ui#7; ui.md §2, §6).
//
// `InspectorSlot` is named in `ui.md` §2's honesty kit and is the one entry there that
// `@astro-mine/ui` deliberately does not export: it ships with the registry it is the extension
// point for, because a slot with no resolution behind it is a div.
//
// A page renders this and knows nothing about worlds, policies or assets — which is the whole claim
// §6 makes for keeping the registry when the rest of the plugin model was retired.
//
// **The ambiguity is rendered, not swallowed.** Two matches at equal specificity is a modelling bug
// in the composed registry, and the reader still gets a panel — the deterministic winner — with the
// collision stated beside it. Logging it to the console instead would put the one signal that says
// "this deployment resolves by a coin toss" somewhere nobody looks.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { FallbackInspector } from "./inspectors/FallbackInspector.js";
import { resolveInspector } from "./registry.js";
import type { InspectorRegistry, InspectorSlots, InspectorSubject } from "./model.js";

export interface InspectorSlotProps {
  /** The composed registry. Built by `createInspectorRegistry`, never assembled inline. */
  readonly registry: InspectorRegistry;
  /** The artifact being looked at. */
  readonly subject: InspectorSubject;
  /** Heavy visuals the composition root owns — see {@link InspectorSlots}. */
  readonly slots?: InspectorSlots;
}

export function InspectorSlot({ registry, subject, slots }: InspectorSlotProps) {
  const resolution = resolveInspector(registry, subject);

  if (resolution.status === "unmatched") {
    return <FallbackInspector subject={subject} slots={slots} kind={resolution.kind} />;
  }

  const { Panel } = resolution.contribution;

  if (resolution.status === "resolved") {
    return <Panel subject={subject} slots={slots} />;
  }

  const colliding = [resolution.contribution, ...resolution.alternatives];

  return (
    <Stack spacing={2}>
      {/* `role="status"`, not `alert`: this is a standing property of the build, announced when it
          appears rather than interrupting. The same reasoning `DegradedState` records. */}
      <Alert severity="warning" role="status">
        <AlertTitle>Two inspectors claim this artifact equally</AlertTitle>
        <Typography variant="body2" component="p">
          {colliding.map((contribution) => contribution.id).join(" and ")} match{" "}
          <code>{subject.kind}</code> with the same specificity, so which one renders is decided by
          a stable ordering rather than by anything about this artifact. That is a modelling bug in
          the registry, not a property of the artifact: one of them needs a discriminator.
        </Typography>
        <Typography variant="body2" component="p" sx={{ mt: 1, fontWeight: 600 }}>
          Showing {resolution.contribution.id}.
        </Typography>
      </Alert>
      <Panel subject={subject} slots={slots} />
    </Stack>
  );
}
