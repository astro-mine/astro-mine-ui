// The catalog, as rows (ui#10).
//
// **Two facets, never one column.** `hub.md` §2 principle 2 is explicit that a catalog entry
// carries Core's interface kind and Hub's *container* kind as separate queryable facets, "never one
// field holding two vocabularies". They overlap on four names — `policy`, `asset`, `design`,
// `campaign` — which is exactly what makes a single "kind" column look right and be wrong: a served
// surrogate is `field_model` by interface and `surrogate` by container, and collapsing those loses
// the only thing that tells a Surrogate model from a Worlds one. Two columns.
//
// **The state is in the row.** A yanked artifact still appears in results, and a reader deciding
// whether to depend on one must not have to open it to find out. Same reasoning as the runner badge
// on the leaderboard: the caveat travels with the number, not in a drawer beside it.
//
// **The table scrolls inside its own container.** `overflow-x: auto` on the wrapper rather than on
// the page, so a long reference never makes the whole document scroll sideways — the responsive
// rule this workspace applies to every wide thing.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Digest } from "@astro-mine/ui";
import NextLink from "next/link";

import { artifactHref, stateOf } from "./identity";
import type { SearchHit } from "./types";

/** An absent facet. A dash, never an empty cell — an empty cell reads as a rendering fault. */
function Absent() {
  return (
    <Typography component="span" variant="body2" color="text.secondary" aria-label="not recorded">
      —
    </Typography>
  );
}

export interface ResultsTableProps {
  readonly hits: readonly SearchHit[];
  /** Announced as the table's accessible name — what these rows are the results of. */
  readonly caption: string;
}

export function ResultsTable({ hits, caption }: ResultsTableProps) {
  return (
    <TableContainer
      // Bounded rather than windowed, and that is a decision rather than an omission.
      // `GET /hub/search` takes a `limit` and the page sets one, so the row count is capped at the
      // source; a windowing library would add a dependency to `conventions.md` §2.1's baseline in
      // order to virtualize a list the API already refuses to make long. If the limit ever rises
      // past a few hundred, revisit this — that is the change that would justify one.
      sx={{ maxHeight: "70vh", overflowX: "auto" }}
    >
      <Table size="small" stickyHeader aria-label={caption}>
        <TableHead>
          <TableRow>
            <TableCell>Reference</TableCell>
            <TableCell>Core kind</TableCell>
            <TableCell>Container</TableCell>
            <TableCell>Namespace</TableCell>
            <TableCell>Publisher</TableCell>
            <TableCell>Licence</TableCell>
            <TableCell>Digest</TableCell>
            <TableCell>State</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {hits.map((hit) => {
            const state = stateOf(hit);
            return (
              <TableRow key={`${hit.reference}@${hit.digest}`} hover>
                <TableCell>
                  <Link
                    component={NextLink}
                    href={artifactHref(hit)}
                    sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}
                  >
                    {hit.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  {hit.kind == null ? <Absent /> : <Box component="code">{hit.kind}</Box>}
                </TableCell>
                <TableCell>
                  {hit.artifact_kind == null ? (
                    <Absent />
                  ) : (
                    <Box component="code">{hit.artifact_kind}</Box>
                  )}
                </TableCell>
                <TableCell>{hit.namespace == null ? <Absent /> : hit.namespace}</TableCell>
                <TableCell>{hit.publisher == null ? <Absent /> : hit.publisher}</TableCell>
                <TableCell>{hit.license == null ? <Absent /> : hit.license}</TableCell>
                <TableCell>
                  {/* Abbreviated here and expandable; the artifact page carries it in full. A
                      table cell is not where a reader copies a content address from, but it is
                      where they check one they already have. */}
                  <Digest value={hit.digest} />
                </TableCell>
                <TableCell>
                  {state === null ? (
                    <Absent />
                  ) : (
                    <Chip size="small" color="warning" variant="outlined" label={state} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
