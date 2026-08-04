// What the registry holds, which is not what a browser verified (ui#10; ui.md §7 honesty rule 6).
//
// **This component exists because of one sentence, and the sentence is normative.** `ui.md` §7
// rule 6: *"Verification is claimed only where it happened. Attestations present in a registry are
// not a verified supply chain, and the words differ."* The API says the same thing in the schema's
// own description — `attestations` names the attestation *types present in the registry*, "it is
// emphatically not a verification verdict, and the front end is required to say so in those words".
//
// So the failure mode is precise and worth naming: a green tick beside "cosign_signature" reads as
// *this artifact's signature is valid*. Nothing on this page checked that. The bytes were verified
// at admission, by Hub, server-side (hub.md §2 principle 3) — and a client re-verifies at pull,
// which is a thing the CLI does and a browser does not. What the browser knows is that the registry
// **has a row saying an attestation of this type exists**.
//
// Hence: no ticks, no shields, no green. A list of what is held, under a heading that says held,
// with the distinction spelled out rather than implied by styling a reader may not decode.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@astro-mine/ui";

/** How each attestation type reads, for a reader who has not met the term. */
const DESCRIBED: Readonly<Record<string, string>> = {
  cosign_signature: "a detached signature over the artifact's bytes",
  slsa_provenance: "a SLSA provenance statement naming what built it",
  sbom: "a software bill of materials listing what is inside it",
};

export interface AttestationsProps {
  /** The types the registry holds. Empty when the deployment has no registry to ask. */
  readonly attestations: readonly string[];
  /**
   * Where this sits in the page's heading outline. Defaults to `h3`.
   *
   * A prop rather than a fixed level, because `heading-order` is an axe rule and the a11y lane is
   * a build gate: a component that hard-codes `h2` is a component that skips a level the first
   * time somebody mounts it one section deeper.
   */
  readonly headingLevel?: "h2" | "h3" | "h4";
}

export function Attestations({ attestations, headingLevel = "h3" }: AttestationsProps) {
  return (
    <Box>
      <Typography variant="h6" component={headingLevel} gutterBottom>
        Attestations held
      </Typography>

      {/* The disclaimer comes BEFORE the list, not after it. Provenance before interpretation
          (honesty rule 5): a reader who skims the chips and stops has still read the qualifier. */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These are the attestation <strong>types this registry holds</strong> for the artifact.{" "}
        <strong>This is not a verification result.</strong> Nothing in this browser checked a
        signature, a provenance statement or a bill of materials — the registry verified them{" "}
        <em>server-side at admission</em>, and a client re-verifies at pull. To check the bytes
        yourself, pull them:{" "}
        <Box component="code" sx={{ fontFamily: "monospace" }}>
          astro-mine hub pull
        </Box>
        .
      </Typography>

      {attestations.length === 0 ? (
        <EmptyState
          title="No attestations are held for this artifact"
          hint={
            <>
              Either nothing was attached when it was published, or this deployment has no registry
              to ask. Absence here is not evidence that the artifact is unsigned — it is the absence
              of a record, which is a different statement.
            </>
          }
        />
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {attestations.map((type) => (
            <Chip
              key={type}
              // Outlined and uncoloured, deliberately. A filled success chip is a verdict, and
              // there is no verdict here to render.
              variant="outlined"
              size="small"
              label={type}
              aria-label={
                DESCRIBED[type] === undefined
                  ? `${type} is held by the registry`
                  : `${type} — ${DESCRIBED[type]} — is held by the registry`
              }
              sx={{ fontFamily: "monospace" }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
