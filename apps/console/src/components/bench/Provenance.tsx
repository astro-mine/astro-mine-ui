"use client";

// The lineage a result is byte-for-byte reproducible from (ui#13; UC-B6; CX-REPRO; bench.md §5).
//
// **This panel is the platform's reproducibility claim, made checkable.** `bench.md` §5: *"every
// Result records its full lineage — ScenarioSpec hash, Core interface version, content hashes,
// submission hash, code version, environment lockfile, and seed — so any leaderboard entry is
// byte-for-byte reproducible"*. A claim nobody can act on is a slogan, and what makes this one
// actionable is that every hash is **present in full and copyable**, not abbreviated for tidiness.
// The pinned content digests in particular are the CX-REPRO payload: they name the exact world,
// fleet, prospect and link bytes the run was frozen against, and they are what a reader pastes into
// a scenario spec to re-run it.
//
// **A submission with no stored bundle says so.** Not a spinner, not an empty panel — an
// explanation. Implying a provenance an entry does not have is worse than admitting the gap,
// because the whole value of the section is that its presence means something.

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState } from "@astro-mine/ui";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";

import type { ProvenanceBundle } from "./types";

/** One labelled hash, expanded. Abbreviating a value somebody has to paste defeats the panel. */
function Hash({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        <Digest value={value} label={label} defaultExpanded />
      </Box>
    </Box>
  );
}

/** A plain labelled value, for the parts of the lineage that are not hashes. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="dd"
        sx={{ m: 0, fontFamily: "monospace", overflowWrap: "anywhere" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** The per-seed values behind each aggregate — the numbers the scorecard summarised. */
function PerSeed({ bundle }: { bundle: ProvenanceBundle }) {
  // Every metric any seed recorded. Derived rather than assumed uniform: a seed that produced no
  // value for a metric is a row with a gap, not a reason to drop the column.
  const metrics = [...new Set(bundle.per_seed.flatMap((record) => Object.keys(record.metrics)))];

  return (
    <Box>
      <Typography variant="h6" component="h4" gutterBottom>
        Per-seed values
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        The numbers behind each aggregate on the scorecard. An aggregate hides its spread; these do
        not.
      </Typography>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Per-seed metric values">
          <TableHead>
            <TableRow>
              <TableCell>Seed</TableCell>
              {metrics.map((metric) => (
                <TableCell key={metric}>{metric}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {bundle.per_seed.map((record) => (
              <TableRow key={record.seed}>
                <TableCell sx={{ fontFamily: "monospace" }}>{record.seed}</TableCell>
                {metrics.map((metric) => {
                  const value = record.metrics[metric];
                  return (
                    <TableCell key={metric} sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {value === undefined || value === null ? (
                        <Box component="span" color="text.secondary" aria-label="not recorded">
                          —
                        </Box>
                      ) : (
                        value
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function Provenance({ submissionId }: { submissionId: string }) {
  const bundle = useApiQuery(
    (client, signal) =>
      client.benchGetProvenance({ path: { submission_id: submissionId } }, { signal }),
    [submissionId],
  );

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Provenance
      </Typography>

      <ApiResult
        query={bundle}
        loadingLabel="Reading the provenance bundle…"
        // A missing bundle is `content_not_found`, which `problems.ts` calls a refusal. The remedy
        // here is not "check the address" — the address is right and the bundle is absent — so the
        // page supplies its own words.
        remedy="No provenance bundle is stored for this submission, so its lineage cannot be shown. That is a gap in what was recorded, not an error in this page — and it means this entry is not reproducible from the platform alone."
      >
        {(data) => (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
              Everything needed to reproduce this result byte for byte. The{" "}
              <strong>pinned content digests</strong> are the important part: they name the exact
              bytes the run was frozen against, so the same world and the same robots are used a
              year from now.
            </Typography>

            <Box component="dl" sx={{ m: 0, display: "grid", gap: 2 }}>
              <Fact label="Scenario" value={data.scenario_id} />
              <Hash label="Scenario spec hash" value={data.scenario_spec_hash} />
              <Hash label="Core schema digest" value={data.core_schema_digest} />
              <Fact
                label="Core interface versions"
                value={Object.entries(data.core_interface_version)
                  .map(([name, version]) => `${name}=${version}`)
                  .join(", ")}
              />
              <Fact label="Code version" value={data.code_version} />
              <Fact
                label="Environment"
                value={`python ${data.environment.python} on ${data.environment.platform}`}
              />
              <Hash label="Environment lockfile" value={data.environment_lockfile} />
              <Hash label="Scorecard hash" value={data.scorecard_hash} />
              <Fact label="Held-out seeds" value={data.seeds.join(", ")} />
              <Fact
                label="Source"
                value={
                  data.source_digest == null
                    ? data.source
                    : `${data.source} — ${data.source_digest}`
                }
              />
            </Box>

            <Box>
              <Typography variant="h6" component="h4" gutterBottom>
                Pinned content
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The exact world, fleet, prospect and link bytes this run used, each by content hash.
                <strong> These are what make the result reproducible</strong> — a re-run against a
                different world is a different experiment.
              </Typography>
              {Object.keys(data.content_hashes).length === 0 ? (
                <EmptyState
                  title="This run pinned no content"
                  hint="Nothing was frozen by digest, so a re-run cannot be guaranteed to use the same inputs."
                />
              ) : (
                <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5 }}>
                  {Object.entries(data.content_hashes).map(([name, digest]) => (
                    <Hash key={name} label={name} value={digest} />
                  ))}
                </Box>
              )}
            </Box>

            <PerSeed bundle={data} />
          </Stack>
        )}
      </ApiResult>
    </Box>
  );
}
