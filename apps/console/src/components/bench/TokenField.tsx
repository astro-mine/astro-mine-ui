"use client";

// The credential a write needs, and a read does not (ui#14; bench.md §9; hub.md §9).
//
// **There is no login here, and that is the design rather than a gap.** ui#14 puts accounts out of
// scope in as many words — "the platform has none in this tier" — and the API models it exactly
// that way: `authorization` is an *optional* header on `POST /bench/submissions`,
// `POST /bench/submissions/hub`, `DELETE /bench/submissions/{id}` and `GET /bench/audit`, and it
// appears on no other route. So this is a field, not a session: what a reader types is held in the
// component that needs it, sent on the one request that needs it, and forgotten when they leave.
//
// **Deliberately not persisted.** Not in `localStorage`, not in a cookie, not in a context. A token
// this front end stored would be a token it is responsible for, on a static export with no server
// to scope it — and the reader has a terminal, where the CLI already holds credentials properly.
// The cost is retyping; the alternative is a credential store nobody asked this application to be.
//
// **The words matter as much as the field.** The single most useful thing this page can tell a
// first-time reader is that *looking is open and entering is not*, because the opposite assumption
// — that the whole benchmark is behind a login — is what stops somebody from ever looking.

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export interface TokenFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** What this token is for, named in the helper text. */
  readonly action: string;
}

/**
 * The header a write sends, or `undefined` when the reader gave no token.
 *
 * `undefined` rather than an empty string: `createRequest` drops an undefined header entirely,
 * where `"Bearer "` would be a malformed credential the server has to reject — turning "I did not
 * supply one" into "I supplied a broken one", which are different failures with different fixes.
 */
export function authorizationHeader(token: string): { authorization: string } | undefined {
  const trimmed = token.trim();
  if (trimmed === "") return undefined;
  // Passed through as typed when it already names a scheme, so a reader who pasted a whole
  // `Bearer …` header does not end up with `Bearer Bearer …`.
  return { authorization: /^\w+\s/.test(trimmed) ? trimmed : `Bearer ${trimmed}` };
}

export function TokenField({ value, onChange, action }: TokenFieldProps) {
  return (
    <Box>
      <TextField
        label="Token"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size="small"
        fullWidth
        autoComplete="off"
        helperText={`Sent as an Authorization header on this ${action} and nowhere else.`}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
        <strong>Looking is open; entering is not.</strong> Reading the leaderboard, a scorecard or
        the audit trail never needs a credential and never asks for one. This {action} does. Nothing
        is stored — the token lives in this form until you leave the page, because a static front
        end is the wrong place to keep one.
      </Typography>
    </Box>
  );
}
