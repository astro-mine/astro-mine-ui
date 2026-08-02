"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useEffect } from "react";

/**
 * A page that threw (ui#5).
 *
 * The counterpart to `not-found`, and the other half of "a route never blanks the page". Without a
 * boundary here, an exception anywhere in a page unmounts the whole tree and leaves the reader with
 * a white rectangle — no navigation, no explanation, and nothing to press.
 *
 * **It must be a client component**, and it must not be clever. This is the code that runs when
 * other code has already failed, so it reaches for nothing: no API client, no configuration, no
 * navigation table beyond the two links below.
 *
 * `reset()` re-renders the segment that failed. It is offered because a transient failure is
 * genuinely common — a fetch that lost the network — and re-reading is what a reader would otherwise
 * do by pressing F5 and losing their place.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The one thing that must not be lost: the actual error. The page shows a reader-facing summary,
    // and the console keeps what a developer needs.
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ maxWidth: 880, py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        This page failed to render
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Something threw while building the page. The rest of the application is unaffected — the
        navigation still works, and another page will load normally.
      </Typography>

      {/* The message verbatim, not a friendly paraphrase. A reader who can act on it needs the
          actual text, and a reader who cannot loses nothing by seeing it. */}
      <Typography
        variant="body2"
        component="pre"
        sx={{
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          overflowX: "auto",
          p: 2,
          mb: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        {error.message || "No message was attached to the error."}
        {error.digest === undefined ? null : `\n\ndigest: ${error.digest}`}
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button onClick={reset} variant="contained">
          Try again
        </Button>
        <Button component={NextLink} href="/" variant="outlined">
          Go home
        </Button>
      </Stack>
    </Box>
  );
}
