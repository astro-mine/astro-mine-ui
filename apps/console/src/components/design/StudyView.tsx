"use client";

// The study page's whole body (ui#16 + ui#17 + ui#18).
//
// **A client component because a route file cannot pass a render prop across the server boundary**
// — the same reason `SubmissionView` exists, and the same build error if it were inlined into
// `page.tsx` ("Functions cannot be passed directly to Client Components").
//
// It also owns the one piece of state the three issues share: **which candidate is selected**. The
// comparison sets it, the 3D pane inspects it, and the publish step publishes it. Holding it here
// rather than in the comparison keeps the panes independent of each other.

import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useCallback, useState } from "react";

import { InspectionPane } from "./InspectionPane";
import { StudyComparison } from "./StudyComparison";
import { readSession } from "./session";
import type { WorldResponse } from "./types";

export function StudyView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldResponse | undefined>(undefined);

  // Stable, so `InspectionPane`'s effect does not re-run on every render of this component.
  const onWorldResolved = useCallback((resolved: WorldResponse | undefined) => {
    setWorld(resolved);
  }, []);

  // The candidate document, from what this session composed. The comparison names candidates by
  // id; the swarm they are made of lives with the composition.
  const candidate = readSession().candidates?.find((entry) => entry.id === selected);

  return (
    <StudyComparison selectedId={selected} onSelect={setSelected}>
      {() => (
        <Stack spacing={4}>
          <Divider />
          <InspectionPane candidate={candidate} onWorldResolved={onWorldResolved} />
          {world === undefined ? null : null}
        </Stack>
      )}
    </StudyComparison>
  );
}
