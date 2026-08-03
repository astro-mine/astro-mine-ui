"use client";

// The submission page's whole body (ui#12 + ui#13).
//
// **This wrapper exists because of a server/client boundary, and the boundary is worth naming.**
// `Scorecard` takes a render prop so that its own tests can mount the scores without the provenance
// and replay panels above them. A route file is a **server component**, and a server component
// cannot pass a function to a client one — `next build` fails the prerender outright with
// *"Functions cannot be passed directly to Client Components"*. It is a build error rather than a
// runtime one, which is the right place for it, but the fix is not to delete the render prop: it is
// to compose on the client side of the line.
//
// So the route renders this, and this renders the three panels in the order the issues put them:
// the scorecard, then what produced it, then the episode it came from.

import Divider from "@mui/material/Divider";

import { Provenance } from "./Provenance";
import { ReplayPane } from "./ReplayPane";
import { Scorecard } from "./Scorecard";

export function SubmissionView() {
  return (
    <Scorecard>
      {(submission) => (
        <>
          <Divider />
          <Provenance submissionId={submission.submission_id} />
          <Divider />
          <ReplayPane submissionId={submission.submission_id} />
        </>
      )}
    </Scorecard>
  );
}
