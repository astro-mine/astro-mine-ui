"use client";

// Searching the commons (ui#10; UC-G2; hub.md §2).
//
// **The front door, and everyone's page regardless of persona.** A benchmark researcher looking for
// a policy, a mission designer looking for a world and an asset author checking what is already
// published all arrive here, which is why it is the only page with a chord *and* a route from the
// top bar's search box.
//
// **Reads are account-free (CX-LOCAL).** Nothing here sends a credential and nothing prompts for
// one — `createRequest` sets `credentials: "omit"` on every call, so that is a property of the
// client rather than a promise this page makes. What this page must not do is *behave* as though a
// login would help: a refusal is rendered as the API's own cause, and there is no sign-in anywhere.
//
// **The query lives in the address.** Not component state — the address. A search a reader can send
// to a colleague is the difference between a tool and a demo, and `ui.md` §5.1 makes the query
// string the place identity lives because a static export cannot prerender a dynamic segment. It is
// also what lets the top bar's search box be a *link* rather than a second search implementation.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@astro-mine/ui";
import { ARTIFACT_KINDS, PLUGIN_KINDS } from "@astro-mine/inspectors";
import { useState, type FormEvent } from "react";

import { ApiResult } from "@/data/ApiResult";
import { useApiQuery } from "@/data/useApiQuery";
import { useIdentity, useSetIdentity } from "@/shell/searchParams";

import { ResultsTable } from "./ResultsTable";

/**
 * How many rows to ask for.
 *
 * The API's own default is 20. Fifty is enough to browse a namespace without paging and small
 * enough that the table needs no windowing (see `ResultsTable`). There is no pagination in the
 * route — `GET /hub/search` takes a limit and no cursor — so the honest thing is to say when the
 * ceiling was reached rather than to imply the catalog ends here.
 */
const LIMIT = 50;

/** The params this page is keyed on. `q` is what the top bar's search box writes. */
const IDENTITY = ["q", "mode", "kind", "artifact_kind", "namespace", "license"] as const;

type Mode = "text" | "semantic";

export function BrowseRegistry() {
  const params = useIdentity(IDENTITY);
  const setIdentity = useSetIdentity();

  const mode: Mode = params.mode === "semantic" ? "semantic" : "text";
  const term = params.q ?? "";

  // **The box is local, the search is the address.** Typing must not push a history entry per
  // keystroke, and it must not re-run the search on every character either — a semantic query is an
  // embedding lookup, and firing one per keypress is a load pattern nobody asked for. So the field
  // holds a draft and submitting writes the address; the address is what runs the search.
  //
  // The draft remembers **which term it was typed against**, which is what keeps it in step with
  // the address without an effect that mirrors one into the other. Navigating — a submit, the back
  // button, a link from the top bar — changes `term`, the stored `from` no longer matches, and the
  // field shows the new term. The alternative, `useEffect(() => setDraft(term), [term])`, is a
  // setState in an effect body: a cascading render on every navigation, and
  // `react-hooks/set-state-in-effect` rejects it. Same shape as `useApiQuery`'s signature.
  const [draft, setDraft] = useState<{ from: string; text: string } | null>(null);
  const typed = draft !== null && draft.from === term ? draft.text : term;

  const query = useApiQuery(
    (client, signal) =>
      client.hubSearch(
        {
          query: {
            text: mode === "text" ? term : null,
            semantic: mode === "semantic" ? term : null,
            kind: params.kind,
            artifact_kind: params.artifact_kind,
            namespace: params.namespace,
            license: params.license,
            limit: LIMIT,
          },
        },
        { signal },
      ),
    [term, mode, params.kind, params.artifact_kind, params.namespace, params.license],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // `push`, not the default `replace`: submitting a search is navigating to a different subject,
    // and a back button that returns to the previous results is what a reader expects.
    setIdentity({ q: typed.trim() }, { history: "push" });
  };

  const facets: readonly { key: string; label: string; options: readonly string[] }[] = [
    { key: "kind", label: "Core kind", options: PLUGIN_KINDS },
    { key: "artifact_kind", label: "Container", options: ARTIFACT_KINDS },
  ];

  const active = IDENTITY.filter((key) => key !== "q" && key !== "mode" && params[key] !== null);

  return (
    <Box>
      {/* No heading here: `app/registry/page.tsx` renders it above this boundary, so that it
          survives into the static export. See the comment there. */}
      <Box component="form" onSubmit={onSubmit} sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Search the catalog"
            value={typed}
            onChange={(event) => setDraft({ from: term, text: event.target.value })}
            fullWidth
            size="small"
            helperText={
              mode === "text"
                ? "Matches names, references and manifest text."
                : "Matches by meaning, through the embedding index. Describe what you want it to do."
            }
          />
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            aria-label="How to search"
            onChange={(_event, next: Mode | null) => {
              if (next !== null) setIdentity({ mode: next === "text" ? null : next });
            }}
            sx={{ height: 40 }}
          >
            <ToggleButton value="text">Text</ToggleButton>
            <ToggleButton value="semantic">Semantic</ToggleButton>
          </ToggleButtonGroup>
          <Button type="submit" variant="contained" sx={{ height: 40 }}>
            Search
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
          {facets.map((facet) => (
            <FormControl key={facet.key} size="small" sx={{ minWidth: 200 }}>
              <InputLabel id={`${facet.key}-label`}>{facet.label}</InputLabel>
              <Select
                labelId={`${facet.key}-label`}
                label={facet.label}
                value={params[facet.key as (typeof IDENTITY)[number]] ?? ""}
                onChange={(event) =>
                  setIdentity({
                    [facet.key]: event.target.value === "" ? null : event.target.value,
                  })
                }
              >
                <MenuItem value="">
                  <em>Any</em>
                </MenuItem>
                {facet.options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          <TextField
            label="Namespace"
            size="small"
            value={params.namespace ?? ""}
            onChange={(event) => setIdentity({ namespace: event.target.value || null })}
          />
          <TextField
            label="Licence"
            size="small"
            value={params.license ?? ""}
            onChange={(event) => setIdentity({ license: event.target.value || null })}
          />
        </Stack>

        {active.length === 0 ? null : (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 2 }}>
            {active.map((key) => (
              <Chip
                key={key}
                size="small"
                label={`${key} = ${params[key]}`}
                onDelete={() => setIdentity({ [key]: null })}
              />
            ))}
          </Stack>
        )}
      </Box>

      <ApiResult
        query={query}
        loadingLabel="Searching the catalog…"
        empty={
          <EmptyState
            title={term === "" ? "Nothing published here yet" : `Nothing matched “${term}”`}
            hint={
              term === "" ? (
                <>
                  This registry has no artifacts, or none this deployment can see. Publish one with{" "}
                  <Box component="code">astro-mine hub publish</Box>, or point{" "}
                  <Box component="code">config.json</Box> at a registry that has some.
                </>
              ) : (
                <>
                  Try a broader term, clear the facet filters, or switch to{" "}
                  {mode === "text" ? "semantic" : "text"} search — they match different things.
                </>
              )
            }
          />
        }
      >
        {(hits) => (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {hits.length === LIMIT ? (
                <>
                  Showing the first {LIMIT} matches — <strong>there may be more</strong>. This route
                  takes a limit and offers no paging, so narrow the search rather than scrolling for
                  the rest.
                </>
              ) : (
                <>
                  {hits.length} {hits.length === 1 ? "artifact" : "artifacts"}
                </>
              )}
            </Typography>
            <ResultsTable
              hits={hits}
              caption={term === "" ? "Catalog contents" : `Search results for ${term}`}
            />
          </>
        )}
      </ApiResult>
    </Box>
  );
}
