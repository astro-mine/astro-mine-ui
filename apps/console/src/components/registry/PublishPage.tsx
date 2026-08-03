"use client";

// Indexing an already-stored artifact, and reading the verdict (ui#11; UC-G3; hub.md §2, §9).
//
// **What publishing here is, and is not.** This does not upload bytes. `POST /hub/publish` indexes
// a Core plugin manifest for an artifact the registry *already stores*, and admission then proves
// the digest exists, that its bytes are its content address, that the manifest offered is the one
// actually stored, that the artifact is signed, and that the signature/SLSA/SBOM chain verifies
// (hub.md §9). Every one of those happens **server-side**. The page's job is to say so and to show
// what came back — never to imply the browser earned any of it.
//
// **Three refusals, three renderings, driven by `code`.** ui#11 is explicit that the outcomes are
// rendered per cause and not per status code, and the three are genuinely different situations:
//
//   publish_unconfigured  the deployment does not do this at all. Degraded, with the remedy, and
//                         the reads on the other registry pages are unaffected — which the page
//                         says, because the alternative is a reader concluding the registry is
//                         down.
//   namespace_refused     a working deployment turned down *this namespace*. The reader can act on
//                         it, and the page names what was refused rather than paraphrasing.
//   admission_rejected    the supply-chain verdict. Shown VERBATIM. This is the one place where our
//                         words matter least and the server's matter most: a paraphrase of a
//                         verdict is a different verdict.
//
// **The write path degrades as a control, not as a page.** Browsing, searching and resolving are
// account-free and stay working when publishing is unavailable; what changes is this form, and only
// this form.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Digest, DegradedState } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { failedWith } from "@/data/problems";
import { useApiAction } from "@/data/useApiAction";

import { artifactHref } from "./identity";
import { readJsonFile, type JsonFile } from "./readJsonFile";

export function PublishPage() {
  const [manifest, setManifest] = useState<JsonFile | null>(null);
  const [digest, setDigest] = useState("");
  const [publisher, setPublisher] = useState("");
  const [namespace, setNamespace] = useState("open");

  const publish = useApiAction((client, body: Parameters<typeof client.hubPublish>[0]["body"]) =>
    client.hubPublish({ body }),
  );

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    // Every failure comes back as a reason. Nothing here throws, because a reader picking the wrong
    // file must get a labelled error rather than the route's error boundary.
    setManifest(await readJsonFile(file));
    // Choosing a different file invalidates the previous outcome — leaving a stale "published"
    // card beside a new manifest is how somebody concludes the wrong thing got indexed.
    publish.reset();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (manifest?.status !== "read") return;
    void publish.invoke({
      manifest: manifest.value,
      digest: digest.trim(),
      publisher: publisher.trim(),
      namespace: namespace.trim() === "" ? "open" : namespace.trim(),
    });
  };

  const ready =
    publish.ready &&
    manifest?.status === "read" &&
    digest.trim() !== "" &&
    publisher.trim() !== "" &&
    publish.state.status !== "pending";

  const failure = publish.state.status === "failed" ? publish.state.failure : null;

  return (
    <Box sx={{ mt: 3, maxWidth: 880 }}>
      {/* The control's own degraded state, sitting where the control is rather than replacing the
          page. Only reachable once a publish has actually been refused for this reason — a
          deployment cannot be asked in advance whether it publishes. */}
      {failure !== null && failedWith(failure, "publish_unconfigured") ? (
        <Box sx={{ mb: 3 }}>
          <DegradedState
            title="Publishing is not enabled on this deployment"
            reason={failure.detail}
            remediation={
              <>
                Browsing, searching and{" "}
                <Link component={NextLink} href="/registry/resolve" color="inherit">
                  resolving
                </Link>{" "}
                are unaffected and need no account. To publish, use a deployment with registry
                wiring and signing keys, or publish locally with{" "}
                <Box component="code">astro-mine hub publish</Box>.
              </>
            }
          />
        </Box>
      ) : null}

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" component="label" htmlFor="manifest-file">
              Core plugin manifest (JSON)
            </Typography>
            <Box
              id="manifest-file"
              component="input"
              type="file"
              accept="application/json,.json"
              onChange={(event: ChangeEvent<HTMLInputElement>) => void onFile(event)}
              sx={{ display: "block", mt: 1 }}
              aria-describedby="manifest-help"
            />
            <Typography id="manifest-help" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              The manifest describing an artifact whose{" "}
              <strong>bytes the registry already stores</strong>. This indexes it; it does not
              upload anything.
            </Typography>

            {manifest?.status === "failed" ? (
              // The degrade-never-blank rule, at the point it is most likely to be needed: picking
              // the wrong file is the single most probable mistake on this form.
              <Alert severity="error" role="alert" sx={{ mt: 1.5 }}>
                <AlertTitle>That file could not be used as a manifest</AlertTitle>
                <Typography variant="body2">{manifest.reason}</Typography>
              </Alert>
            ) : null}

            {manifest?.status === "read" ? (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                Read <Box component="code">{manifest.name}</Box> —{" "}
                {Object.keys(manifest.value).length} top-level{" "}
                {Object.keys(manifest.value).length === 1 ? "key" : "keys"}.
              </Typography>
            ) : null}
          </Box>

          <TextField
            label="Digest"
            required
            value={digest}
            onChange={(event) => setDigest(event.target.value)}
            size="small"
            placeholder="sha256:…"
            helperText="The content address of the stored bytes. Hub re-derives it from those bytes and refuses a mismatch."
          />
          <TextField
            label="Publisher"
            required
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            size="small"
            helperText="A self-declared label. This deployment authenticates nobody on the write path (hub.md §9) — admission constrains what may be indexed, not who asks."
          />
          <TextField
            label="Namespace"
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            size="small"
            helperText="`open` is self-published and signed but unreviewed. A higher trust tier is granted by an audited promotion, never claimed here."
          />

          <Box>
            <Button type="submit" variant="contained" disabled={!ready}>
              {publish.state.status === "pending" ? "Publishing…" : "Publish"}
            </Button>
            {publish.ready ? null : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No API is configured, so there is nothing to publish to.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      <Box sx={{ mt: 4 }}>
        {/* `publish_unconfigured` already rendered its own control-level notice above; rendering it
            again here would say the same thing twice in two different voices. */}
        {failure !== null && !failedWith(failure, "publish_unconfigured") ? (
          failedWith(failure, "admission_rejected") ? (
            <Alert severity="error" role="alert">
              <AlertTitle>Admission rejected — nothing was indexed</AlertTitle>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The supply-chain check refused this artifact.{" "}
                <strong>This is the verdict as the registry wrote it:</strong>
              </Typography>
              {/* Verbatim, in a block that reads as a quotation rather than as our prose. A failed
                  check indexes nothing — there is no partially-admitted state to explain. */}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  fontFamily: "monospace",
                  fontSize: "0.8125rem",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {failure.detail}
              </Box>
            </Alert>
          ) : failedWith(failure, "namespace_refused") ? (
            <Alert severity="error" role="alert">
              <AlertTitle>The namespace “{namespace}” was refused — nothing was indexed</AlertTitle>
              <Typography variant="body2">{failure.detail}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Publish under a namespace this deployment accepts. A trust tier above{" "}
                <Box component="code">open</Box> is granted by an audited promotion that re-runs the
                admission checks — it cannot be claimed at publish time.
              </Typography>
            </Alert>
          ) : (
            <FailureNotice failure={failure} />
          )
        ) : null}

        {publish.state.status === "done" ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary" component="h2">
                Indexed
              </Typography>
              <Typography variant="h6" component="p" sx={{ overflowWrap: "anywhere" }}>
                {publish.state.data.reference}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Digest value={publish.state.data.digest} label="Indexed digest" defaultExpanded />
              </Box>

              {/* What actually happened, attributed to whoever did it. No tick, no "verified"
                  badge: every check named here ran on the server, and a green mark in the browser
                  would read as something this page established. */}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                The registry <strong>re-derived the digest from the stored bytes</strong> and
                verified the signature, the SLSA provenance and the SBOM{" "}
                <strong>server-side, at admission</strong>, before indexing anything. None of that
                was checked in this browser, and a failed check would have indexed nothing at all.
              </Typography>

              <Link
                component={NextLink}
                href={artifactHref(publish.state.data)}
                sx={{ display: "inline-block", mt: 2 }}
              >
                Open it in the registry
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
}
