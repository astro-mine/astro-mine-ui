"use client";

// State a goal, and compose the swarms that will be compared (ui#15; UC-F1, UC-F2; studio.md §2).
//
// **P5, the mission designer, is the only persona for whom "the CLI is acceptable" is false.** For
// everyone else the command line is a reasonable answer to an authoring task; for P5 the GUI *is*
// the product, and this is where their journey starts.
//
// **No JSON is typed anywhere.** That is the acceptance criterion and it is also the whole point: a
// structured form is what makes an objective something a mission designer can state rather than
// something they have to know a schema to write. Every field below maps to one the API declares.
//
// **A candidate picks a robot from the catalog; it never accepts a typed-in digest.** So the
// candidate carries a real content hash, and the row can show what that hash *names* — the
// namespace, the version, and **the capability tags the asset declares**. Those tags matter before
// the study rather than after: an asset with no capability tags will never be assigned work, so a
// swarm built from one produces a candidate that scores nothing and looks merely bad. Shown here,
// it is a fact about the asset; discovered later, it is an afternoon.

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Digest, EmptyState } from "@astro-mine/ui";
import NextLink from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { FailureNotice } from "@/data/ApiResult";
import { useApiAction } from "@/data/useApiAction";
import { useApiQuery } from "@/data/useApiQuery";

import { writeSession } from "./session";
import type {
  DesignCandidate,
  HardConstraint,
  IntentDraft,
  MenuEntry,
  TargetProduct,
} from "./types";
import {
  problemsFor,
  validateCandidates,
  validateDraft,
  type CandidateDraft,
  type DraftProblem,
} from "./validate";

/** The anchor body's CRS, pre-filled because the flagship scenario is lunar. Editable. */
const DEFAULT_CRS = { body: "MOON", body_fixed_frame: "MOON_ME", reference_radius_m: 1_737_400 };

const emptyProduct = (): TargetProduct => ({
  criterion_id: "",
  metric: "",
  unit: "",
  target: 0,
  tolerance: 0,
  direction: "higher_better",
});

const emptyConstraint = (): HardConstraint => ({
  criterion_id: "",
  metric: "",
  unit: "",
  threshold: 0,
  direction: "lower_better",
});

const emptyCandidate = (index: number): CandidateDraft => ({
  id: `candidate-${index}`,
  name: "",
  assetRef: "",
  count: 1,
});

/** The messages for one field, rendered where the field is. */
function FieldErrors({ problems, field }: { problems: readonly DraftProblem[]; field: string }) {
  const messages = problemsFor(problems, field);
  if (messages.length === 0) return null;
  return (
    <>
      {messages.map((message) => (
        <Typography key={message} variant="caption" color="error" component="p" sx={{ mt: 0.5 }}>
          {message}
        </Typography>
      ))}
    </>
  );
}

export function ObjectiveForm() {
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [regionName, setRegionName] = useState("");
  const [crs, setCrs] = useState(DEFAULT_CRS);
  const [products, setProducts] = useState<TargetProduct[]>([emptyProduct()]);
  const [constraints, setConstraints] = useState<HardConstraint[]>([]);
  const [candidates, setCandidates] = useState<CandidateDraft[]>([emptyCandidate(1)]);
  const [problems, setProblems] = useState<DraftProblem[] | null>(null);

  const catalog = useApiQuery(
    (client, signal) => client.studioListCatalog(undefined, { signal }),
    [],
  );
  const assets: readonly MenuEntry[] = catalog.status === "ready" ? catalog.data : [];

  const capture = useApiAction((client, draft: IntentDraft) =>
    client.studioCaptureIntent({ body: { draft } }),
  );

  const draft = useMemo<IntentDraft>(
    () => ({
      id: "draft-1",
      name: name.trim(),
      author: author.trim(),
      description: description.trim() === "" ? null : description.trim(),
      region: { name: regionName.trim(), crs },
      products: products.map((product, index) => ({
        ...product,
        criterion_id:
          product.criterion_id.trim() === "" ? `product-${index + 1}` : product.criterion_id,
      })),
      constraints: constraints.map((constraint, index) => ({
        ...constraint,
        criterion_id:
          constraint.criterion_id.trim() === ""
            ? `constraint-${index + 1}`
            : constraint.criterion_id,
      })),
      inventory: [],
      labels: {},
    }),
    [name, author, description, regionName, crs, products, constraints],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // **Checked before anything is sent**, so a doomed study never launches. The backend's 422 is
    // still the authority — see `validate.ts` — and is rendered below when it disagrees.
    const found = [...validateDraft(draft), ...validateCandidates(candidates, assets)];
    setProblems(found);
    if (found.length > 0) return;

    const result = await capture.invoke(draft);
    if (!result.ok) return;

    const composed: DesignCandidate[] = candidates.map((candidate) => ({
      id: candidate.name.trim(),
      swarm: [{ sadf_ref: candidate.assetRef, count: candidate.count }],
      decision_vector: {},
      infrastructure: [],
      policy_refs: {},
    }));
    writeSession({ objective: result.data, candidates: composed });
  };

  const patchProduct = (index: number, patch: Partial<TargetProduct>) =>
    setProducts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const patchConstraint = (index: number, patch: Partial<HardConstraint>) =>
    setConstraints((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const patchCandidate = (index: number, patch: Partial<CandidateDraft>) =>
    setCandidates((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const found = problems ?? [];

  return (
    // **`noValidate`, and it is load-bearing rather than a preference.** Several fields carry
    // `required`, and the browser's own constraint validation fires *before* the submit event and
    // cancels it — so with native validation on, this form's `onSubmit` never runs, `validateDraft`
    // never executes, and what a reader gets is a browser tooltip on one field at a time.
    //
    // That would technically stop a doomed study, and it would fail the thing ui#15 actually asks
    // for: the objective is refused "with the reason in words". The messages here are derived from
    // the API document's own constraints, they name every problem at once, and they sit beside the
    // fields they belong to. Native validation cannot do any of the three.
    <Box
      sx={{ mt: 3, maxWidth: 980 }}
      component="form"
      noValidate
      onSubmit={(e) => void onSubmit(e)}
    >
      <Stack spacing={4}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            The objective
          </Typography>
          <Stack spacing={2}>
            <Box>
              <TextField
                label="Name"
                required
                fullWidth
                size="small"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldErrors problems={found} field="name" />
            </Box>
            <Box>
              <TextField
                label="Author"
                required
                fullWidth
                size="small"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                helperText="Travels with the objective's provenance."
              />
              <FieldErrors problems={found} field="author" />
            </Box>
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            The region
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A position with no frame is not a position. The planetary CRS travels with everything
            spatial downstream — there is no implicit Earth fallback anywhere in this platform.
          </Typography>
          <Stack spacing={2}>
            <Box>
              <TextField
                label="Region name"
                required
                fullWidth
                size="small"
                value={regionName}
                onChange={(event) => setRegionName(event.target.value)}
              />
              <FieldErrors problems={found} field="region.name" />
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Body"
                  fullWidth
                  size="small"
                  value={crs.body}
                  onChange={(event) => setCrs({ ...crs, body: event.target.value })}
                />
                <FieldErrors problems={found} field="region.crs.body" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Body-fixed frame"
                  fullWidth
                  size="small"
                  value={crs.body_fixed_frame}
                  onChange={(event) => setCrs({ ...crs, body_fixed_frame: event.target.value })}
                />
                <FieldErrors problems={found} field="region.crs.body_fixed_frame" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Reference radius (m)"
                  fullWidth
                  size="small"
                  type="number"
                  value={crs.reference_radius_m}
                  onChange={(event) =>
                    setCrs({ ...crs, reference_radius_m: Number(event.target.value) })
                  }
                />
                <FieldErrors problems={found} field="region.crs.reference_radius_m" />
              </Box>
            </Stack>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Target products
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What the campaign is for, as measurable quantities. Higher is better.
          </Typography>
          <FieldErrors problems={found} field="products" />
          <Stack spacing={2}>
            {products.map((product, index) => (
              <Stack key={index} direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box sx={{ flex: 2 }}>
                  <TextField
                    label="Metric"
                    fullWidth
                    size="small"
                    value={product.metric}
                    onChange={(event) => patchProduct(index, { metric: event.target.value })}
                  />
                  <FieldErrors problems={found} field={`products.${index}.metric`} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Unit"
                    fullWidth
                    size="small"
                    value={product.unit}
                    onChange={(event) => patchProduct(index, { unit: event.target.value })}
                  />
                  <FieldErrors problems={found} field={`products.${index}.unit`} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Target"
                    fullWidth
                    size="small"
                    type="number"
                    value={product.target}
                    onChange={(event) =>
                      patchProduct(index, { target: Number(event.target.value) })
                    }
                  />
                  <FieldErrors problems={found} field={`products.${index}.target`} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Tolerance"
                    fullWidth
                    size="small"
                    type="number"
                    value={product.tolerance}
                    onChange={(event) =>
                      patchProduct(index, { tolerance: Number(event.target.value) })
                    }
                  />
                  <FieldErrors problems={found} field={`products.${index}.tolerance`} />
                </Box>
                <IconButton
                  aria-label={`Remove target product ${index + 1}`}
                  onClick={() => setProducts((rows) => rows.filter((_, i) => i !== index))}
                >
                  ×
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button sx={{ mt: 1 }} onClick={() => setProducts((rows) => [...rows, emptyProduct()])}>
            Add a target product
          </Button>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Constraints
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What a design must not exceed. Lower is better.
          </Typography>
          <Stack spacing={2}>
            {constraints.map((constraint, index) => (
              <Stack key={index} direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box sx={{ flex: 2 }}>
                  <TextField
                    label="Metric"
                    fullWidth
                    size="small"
                    value={constraint.metric}
                    onChange={(event) => patchConstraint(index, { metric: event.target.value })}
                  />
                  <FieldErrors problems={found} field={`constraints.${index}.metric`} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Unit"
                    fullWidth
                    size="small"
                    value={constraint.unit}
                    onChange={(event) => patchConstraint(index, { unit: event.target.value })}
                  />
                  <FieldErrors problems={found} field={`constraints.${index}.unit`} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Threshold"
                    fullWidth
                    size="small"
                    type="number"
                    value={constraint.threshold}
                    onChange={(event) =>
                      patchConstraint(index, { threshold: Number(event.target.value) })
                    }
                  />
                  <FieldErrors problems={found} field={`constraints.${index}.threshold`} />
                </Box>
                <IconButton
                  aria-label={`Remove constraint ${index + 1}`}
                  onClick={() => setConstraints((rows) => rows.filter((_, i) => i !== index))}
                >
                  ×
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button
            sx={{ mt: 1 }}
            onClick={() => setConstraints((rows) => [...rows, emptyConstraint()])}
          >
            Add a constraint
          </Button>
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Candidate swarms
          </Typography>
          <CatalogState catalog={catalog.status} count={assets.length} />
          <FieldErrors problems={found} field="candidates" />

          <Stack spacing={3} sx={{ mt: 2 }}>
            {candidates.map((candidate, index) => {
              const chosen = assets.find((asset) => asset.reference === candidate.assetRef);
              return (
                <Card key={candidate.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Box sx={{ flex: 2 }}>
                        <TextField
                          label="Candidate name"
                          fullWidth
                          size="small"
                          value={candidate.name}
                          onChange={(event) => patchCandidate(index, { name: event.target.value })}
                        />
                        <FieldErrors problems={found} field={`candidates.${index}.name`} />
                      </Box>
                      <Box sx={{ flex: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id={`asset-${index}`}>Robot</InputLabel>
                          <Select
                            labelId={`asset-${index}`}
                            label="Robot"
                            value={candidate.assetRef}
                            onChange={(event) =>
                              patchCandidate(index, { assetRef: event.target.value })
                            }
                          >
                            {assets.map((asset) => (
                              <MenuItem key={asset.reference} value={asset.reference}>
                                {asset.reference}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FieldErrors problems={found} field={`candidates.${index}.assetRef`} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          label="Count"
                          fullWidth
                          size="small"
                          type="number"
                          value={candidate.count}
                          onChange={(event) =>
                            patchCandidate(index, { count: Number(event.target.value) })
                          }
                        />
                        <FieldErrors problems={found} field={`candidates.${index}.count`} />
                      </Box>
                      <IconButton
                        aria-label={`Remove candidate ${index + 1}`}
                        onClick={() => setCandidates((rows) => rows.filter((_, i) => i !== index))}
                      >
                        ×
                      </IconButton>
                    </Stack>
                    <FieldErrors problems={found} field={`candidates.${index}`} />

                    {chosen === undefined ? null : <AssetFacts asset={chosen} />}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
          <Button
            sx={{ mt: 1 }}
            onClick={() => setCandidates((rows) => [...rows, emptyCandidate(rows.length + 1)])}
          >
            Add a candidate
          </Button>
        </Box>

        <Box>
          {found.length > 0 ? (
            <Alert severity="error" role="alert" sx={{ mb: 2 }}>
              <AlertTitle>This objective was not sent</AlertTitle>
              <Typography variant="body2">
                {found.length} {found.length === 1 ? "problem" : "problems"} above.{" "}
                <strong>Nothing was launched</strong> — a study built on an objective Core would
                refuse is minutes of compute spent on a question that cannot be answered.
              </Typography>
            </Alert>
          ) : null}

          {capture.state.status === "failed" ? (
            <Box sx={{ mb: 2 }}>
              {/* The authoritative check. Field-level detail from the API is rendered by
                  `FailureNotice` — this is where a rule this form does not know about arrives. */}
              <FailureNotice
                failure={capture.state.failure}
                remedy="Core validated this objective and refused it. The fields named above are the server's, not this page's."
              />
            </Box>
          ) : null}

          <Button
            type="submit"
            variant="contained"
            disabled={!capture.ready || capture.state.status === "pending"}
          >
            {capture.state.status === "pending" ? "Capturing…" : "Capture the objective"}
          </Button>
          {capture.ready ? null : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No API is configured, so there is nothing to capture against.
            </Typography>
          )}
        </Box>

        {capture.state.status === "done" ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary" component="h2">
                Objective captured
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Core validated it and the backend content-addressed it. The digest below is what the
                trade study is run against.
              </Typography>
              <Digest value={capture.state.data.digest} label="Objective digest" defaultExpanded />
              <Link component={NextLink} href="/design" sx={{ display: "inline-block", mt: 2 }}>
                Run the study
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </Box>
  );
}

/**
 * The catalog's own states, each with its own remedy.
 *
 * ui#15 asks for these separately because **their fixes differ**: an unavailable catalog is a
 * deployment without registry wiring, and an empty one is a deployment nobody has published a robot
 * to. Collapsing them sends a reader to fix the wrong thing.
 */
function CatalogState({ catalog, count }: { catalog: string; count: number }) {
  if (catalog === "failed" || catalog === "unconfigured") {
    return (
      <Alert severity="degraded" role="status" sx={{ mb: 2 }}>
        <AlertTitle>The robot catalog is unavailable</AlertTitle>
        <Typography variant="body2">
          This deployment could not list its assets, so there is nothing to choose from. That is
          registry wiring rather than anything you did — and it is a different problem from a
          catalog that is merely empty.
        </Typography>
      </Alert>
    );
  }
  if (catalog === "ready" && count === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <EmptyState
          title="This deployment publishes no robots"
          hint={
            <>
              The catalog is reachable and has nothing in it. Publish an asset with{" "}
              <Box component="code">astro-mine hub publish</Box>, or point this deployment at a
              registry that has some.
            </>
          }
        />
      </Box>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      Each candidate picks a robot from the catalog, so it carries a real content hash rather than a
      name somebody typed.
    </Typography>
  );
}

/** What the chosen hash names. Every value here comes from the artifact, never from the form. */
function AssetFacts({ asset }: { asset: MenuEntry }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center", mb: 1 }}>
        <Typography variant="body2">
          <strong>{asset.name}</strong> {asset.version} · {asset.namespace} · {asset.kind}
        </Typography>
        <Digest value={asset.digest} label={`${asset.name} digest`} />
      </Stack>

      {asset.capability_tags.length === 0 ? (
        // **Before the study, not after.** Allocate assigns work by capability; an asset declaring
        // none is never assigned any, so the candidate scores nothing and reads as a bad design
        // rather than an unusable one.
        <Alert severity="warning" role="status">
          <AlertTitle>This robot declares no capability tags</AlertTitle>
          <Typography variant="body2">
            Work is assigned by capability, so a swarm of these will never be given any. The
            candidate will run and score nothing — which looks like a poor design and is not one.
          </Typography>
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {asset.capability_tags.map((tag) => (
            <Chip key={tag} size="small" variant="outlined" label={tag} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
