#!/usr/bin/env node
// Bring up a seeded astro-mine-api for the journey suite (ui#20; ui.md §8, rebuild plan §6).
//
//     node scripts/journeys-up.mjs        # seed, serve, and stay up until killed
//
// **The journeys need a real backend, and this is the whole reason they are worth running.** The
// component lane already drives every page against a faked API, so a browser test that faked one
// too would re-assert what jsdom asserted, more slowly. What it cannot fake is the contract: that
// the routes exist, answer the shapes the generated client expects, and serve content a person can
// read. That is only provable against `astro-mine-api` itself.
//
// So this process is long-lived by design — Playwright starts it as a `webServer`, waits for
// `/healthz`, runs the suite, and kills it. Three things run under it:
//
//   1. `scripts/seed_demo.py` in the API repository, which publishes content, seeds the Studio
//      campaign, mints a token and scores two submissions through the real route. Idempotent, so a
//      second run is fast.
//   2. a static server for the JWKS, because Bench verifies bearer tokens against an issuer's
//      public keys over HTTP and there is no IdP here to ask.
//   3. uvicorn, over the environment the seeder printed.
//
// The seeder's manifest lands at `e2e/.seed.json` — the ids, digests and bearer token the journeys
// drive with. It is written, never committed.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the seeder's manifest lands, for `e2e/fixture/seed.ts` to read. */
export const SEED_MANIFEST = join(REPO, "e2e", ".seed.json");

const API_PORT = 8000;
const JWKS_PORT = 8081;
/** The origin the seeded export is served from — the API must allow it, or every call preflights. */
const UI_ORIGIN = "http://127.0.0.1:4174";

/**
 * The API repository, and the interpreter that has it installed.
 *
 * Defaults assume the workspace layout (`src/astro-mine-api` beside `src/astro-mine-ui`, with its
 * own `.venv`); CI passes both explicitly, because it checks the repository out somewhere else.
 */
const API_REPO = resolve(process.env.ASTRO_MINE_API_REPO ?? join(REPO, "..", "astro-mine-api"));
const PYTHON = process.env.ASTRO_MINE_PYTHON ?? join(API_REPO, ".venv", "bin", "python");

/**
 * Where the seeded stores live. **Not inside the repository, and not by preference.**
 *
 * Bench scores a submission in a Landlock-confined subprocess, and a 9p/drvfs mount — a WSL checkout
 * under `/mnt` — denies even the paths the ruleset grants, so a worker rooted on one cannot start.
 * The system temp directory is a native filesystem on every machine this runs on. Override with
 * `ASTRO_MINE_SEED_ROOT` if yours is not.
 */
const SEED_ROOT = process.env.ASTRO_MINE_SEED_ROOT ?? join(tmpdir(), "astro-mine-journeys");

const children = [];

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function preflight() {
  if (!existsSync(API_REPO)) {
    fail(
      `no astro-mine-api at ${API_REPO}.\n\n` +
        `  The journey suite drives a real API. Clone it beside this repository, or point\n` +
        `  ASTRO_MINE_API_REPO at your checkout.`,
    );
  }
  if (!existsSync(PYTHON)) {
    fail(
      `no interpreter at ${PYTHON}.\n\n` +
        `  The seeder imports astro-mine-platform, so it needs the API's environment:\n` +
        `      cd ${API_REPO} && uv sync\n` +
        `  Or point ASTRO_MINE_PYTHON at an interpreter that has it.`,
    );
  }
}

/** Seed the stores and return the manifest the seeder printed. */
function seed() {
  mkdirSync(SEED_ROOT, { recursive: true });
  console.log(
    `seeding ${SEED_ROOT} (idempotent; the first run scores two submissions and is slow)`,
  );

  const completed = spawnSync(
    PYTHON,
    [
      join(API_REPO, "scripts", "seed_demo.py"),
      "--root",
      SEED_ROOT,
      "--json",
      "--jwks-url",
      `http://127.0.0.1:${JWKS_PORT}/jwks.json`,
      "--cors-origins",
      UI_ORIGIN,
    ],
    { cwd: API_REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );

  if (completed.status !== 0) {
    fail(`the seeder failed (${completed.status}):\n\n${completed.stderr?.slice(-4000) ?? ""}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(completed.stdout);
  } catch {
    fail(`the seeder printed something that is not JSON:\n\n${completed.stdout.slice(0, 2000)}`);
  }

  mkdirSync(dirname(SEED_MANIFEST), { recursive: true });
  writeFileSync(SEED_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `seeded: ${manifest.hub.assets.length} assets, ${manifest.hub.policies.length} policy ` +
      `versions, ${manifest.bench.submissions.length} submissions`,
  );
  return manifest;
}

function serve(name, command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"], ...options });
  child.on("exit", (code, signal) => {
    // A backend that dies mid-run must take the whole bring-up with it. Otherwise Playwright keeps
    // driving a page whose API vanished, and twenty journeys fail with twenty different messages
    // that all mean "the server is gone".
    if (!shuttingDown) fail(`${name} exited (code ${code}, signal ${signal})`);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shuttingDown = true;
    for (const child of children) child.kill("SIGTERM");
    process.exit(0);
  });
}

preflight();
const manifest = seed();

serve("the JWKS server", PYTHON, [
  "-m",
  "http.server",
  String(JWKS_PORT),
  "--directory",
  SEED_ROOT,
]);
serve(
  "the API",
  PYTHON,
  ["-m", "uvicorn", "--factory", "astro_mine_api._app:make_app", "--port", String(API_PORT)],
  { cwd: API_REPO, env: { ...process.env, ...manifest.env } },
);

console.log(`\nAPI on http://127.0.0.1:${API_PORT}, JWKS on http://127.0.0.1:${JWKS_PORT}.`);
