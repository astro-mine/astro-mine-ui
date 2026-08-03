"use client";

// A version spec, resolved to the one digest that satisfies it (ui#11; UC-G1; hub.md §2).
//
// **A spec is a query; the digest is the answer.** `>=0.5,<0.6` names a set, and what a reader
// actually pins is the single immutable content address that set resolved to *today*. So the result
// leads with the digest, in full, and the reference it came from is shown beneath it as the query
// that produced it — the same ordering as the artifact page, for the same reason (honesty rule 4).
//
// **Resolution stays account-free even when publishing does not work.** ui#11 asks for the write
// path to degrade "as a control, not as a page", and this is the other half of that: nothing about
// a deployment that cannot publish should stop a reader resolving a spec, so this page shares no
// state with the publish form and does not check whether publishing is available.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Digest } from "@astro-mine/ui";
import NextLink from "next/link";
import { useState, type FormEvent } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";

import { artifactHref } from "./identity";

/** `"autonomy_l2, excavation"` → `["autonomy_l2", "excavation"]`; blank entries dropped. */
function tags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

/**
 * `"policy=0.1.0, env=0.1.0"` → `{ policy: "0.1.0", env: "0.1.0" }`.
 *
 * Free text rather than a builder, because the interface vocabulary is Core's and open-ended; a
 * two-column repeater would be more chrome than the field earns at this tier. An entry without an
 * `=` is dropped rather than sent as a key with an empty value, which the API would read as a
 * constraint requiring version `""` and refuse everything against.
 */
function interfaces(value: string): Record<string, string> | null {
  const pairs = value
    .split(",")
    .map((entry) => entry.split("="))
    .filter((parts): parts is [string, string] => parts.length === 2)
    .map(([name, version]) => [name.trim(), version.trim()] as const)
    .filter(([name, version]) => name !== "" && version !== "");
  return pairs.length === 0 ? null : Object.fromEntries(pairs);
}

export function ResolvePage() {
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [capability, setCapability] = useState("");
  const [interfaceSpec, setInterfaceSpec] = useState("");

  const resolve = useApiAction((client, body: Parameters<typeof client.hubResolve>[0]["body"]) =>
    client.hubResolve({ body }),
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void resolve.invoke({
      name: name.trim(),
      version_spec: spec.trim(),
      capability_tags: tags(capability),
      interfaces: interfaces(interfaceSpec),
    });
  };

  return (
    <Box sx={{ mt: 3, maxWidth: 880 }}>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            size="small"
            helperText="The artifact's name, as published — without a namespace or a version."
          />
          <TextField
            label="Version specifier"
            value={spec}
            onChange={(event) => setSpec(event.target.value)}
            size="small"
            placeholder=">=0.5,<0.6"
            helperText="PEP 440. Leave empty to take the latest that satisfies everything else."
          />
          <TextField
            label="Capability tags"
            value={capability}
            onChange={(event) => setCapability(event.target.value)}
            size="small"
            placeholder="excavation, autonomy_l2"
            helperText="Comma-separated. Only artifacts declaring all of them are considered."
          />
          <TextField
            label="Core interfaces"
            value={interfaceSpec}
            onChange={(event) => setInterfaceSpec(event.target.value)}
            size="small"
            placeholder="policy=0.1.0, env=0.1.0"
            helperText="Comma-separated `interface=version` pairs. Discovery is capability negotiation, not string matching."
          />
          <Box>
            <Button
              type="submit"
              variant="contained"
              disabled={!resolve.ready || name.trim() === "" || resolve.state.status === "pending"}
            >
              {resolve.state.status === "pending" ? "Resolving…" : "Resolve"}
            </Button>
            {resolve.ready ? null : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No API is configured, so there is nothing to resolve against.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      <Box sx={{ mt: 4 }}>
        {resolve.state.status === "failed" ? (
          <FailureNotice failure={resolve.state.failure} />
        ) : null}

        {resolve.state.status === "done" ? (
          <Card variant="outlined">
            <CardContent>
              {/* The digest first, and the spec that produced it second. A reader who copies the
                  top line off this card has copied the thing that reproduces. */}
              <Typography variant="overline" color="text.secondary" component="h2">
                Resolved to
              </Typography>
              <Digest value={resolve.state.data.digest} label="Resolved digest" defaultExpanded />

              <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" component="h3">
                    Reference
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {resolve.state.data.reference}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" component="h3">
                    Version
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {resolve.state.data.version}
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <strong>This resolution is a snapshot.</strong> The same specifier will resolve to a
                different digest as soon as a newer version satisfies it. Pin the digest above, not
                the specifier, wherever the answer has to be the same later.
              </Typography>

              <Link
                component={NextLink}
                href={artifactHref({
                  name: name.trim(),
                  version: resolve.state.data.version,
                })}
                sx={{ display: "inline-block", mt: 2 }}
              >
                Open this artifact
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
}
