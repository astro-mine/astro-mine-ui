import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/**
 * A placeholder home page, replaced by ui#9.
 *
 * It says what is here and what is not, rather than rendering a blank pane or a lorem-ipsum
 * dashboard that implies a working application. That is the same discipline every real page owes a
 * reader — degrade visibly, never blank — applied to the one state this repository is currently in.
 */
export default function HomePage() {
  return (
    <Container maxWidth="md">
      <Box component="main" sx={{ py: 8 }}>
        <Stack spacing={3}>
          <Typography variant="h3" component="h1">
            Astro-Mine
          </Typography>

          <Typography variant="body1" color="text.secondary">
            The front-end distribution is stood up: a pnpm workspace, this Next.js application on
            Material UI, four package skeletons, and a layering gate that runs in CI. No page has
            been built yet, and nothing here calls the API.
          </Typography>

          <Typography variant="body1" color="text.secondary">
            The rebuild lands over Waves 28–30 — the generated client, the theme and honesty kit,
            the chart layer, the app shell, and then the registry, benchmark, design and compute
            pages. The plan and its backlog are in{" "}
            <Link
              href="https://github.com/astro-mine/docs/blob/main/tpm/ui-rebuild-plan.md"
              underline="hover"
            >
              the UI rebuild plan
            </Link>
            ; the normative design is <code>architecture/ui.md</code>.
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}
