// Reading two files out of the private platform repository (ui#7).
//
// The GitHub contents API rather than a clone: `check-api-drift.mjs` clones astro-mine-api because
// it needs a file whose path it must also verify exists, and a blobless clone is the cheap way to
// do that. Here the paths are known and there are two of them, so two GETs beat cloning a
// repository with a compiled Rust core in it.
//
// The head SHA is read **first**, and both files are then read *at that SHA*. Reading each at
// "whatever the default branch is right now" would let a push between the two calls produce a pair
// of files that never existed together — rare, and exactly the kind of failure nobody reproduces.

import { TOKEN_NAME } from "./platform-vocabularies.mjs";

export class PlatformFetchError extends Error {
  name = "PlatformFetchError";
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.raw",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** The token, or a hard failure — never a skip. */
export function requireToken(env = process.env) {
  const token = env[TOKEN_NAME];
  if (!token) {
    throw new PlatformFetchError(
      `\`${TOKEN_NAME}\` is not set, so the vocabularies cannot be compared against the platform.\n\n` +
        `  This fails rather than skips, deliberately: a drift guard that goes quiet when its\n` +
        `  credential is absent has stopped existing, and it goes quiet on exactly the day nobody\n` +
        `  is looking.\n\n` +
        `  In CI:    gh secret set ${TOKEN_NAME} --repo astro-mine/astro-mine-ui\n` +
        `            (a token with Contents: read on the platform repository)\n` +
        `  Locally:  compare against your own clone, which needs no credential —\n` +
        `                pnpm check:vocabularies:from\n` +
        `                node scripts/check-vocabularies.mjs --from ../astro-mine-platform\n` +
        `            ...or export ${TOKEN_NAME}=<a read-scoped PAT>.`,
    );
  }
  return token;
}

/** The default branch's head commit SHA. */
export async function headCommit(repo, token, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.github.com/repos/${repo}/commits/HEAD`, {
    headers: { ...headers(token), Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new PlatformFetchError(
      `GET ${repo} HEAD -> HTTP ${response.status} ${response.statusText}.\n\n` +
        `  This is a CREDENTIAL or VISIBILITY failure, not vocabulary drift: the token is missing,\n` +
        `  expired, or not scoped to ${repo}.`,
    );
  }
  const body = await response.json();
  if (typeof body.sha !== "string") {
    throw new PlatformFetchError(`${repo} HEAD returned no commit sha`);
  }
  return body.sha;
}

/** One file's text at a given ref. A missing file is a hard failure: the upstream is absent. */
export async function fileAt(repo, ref, path, token, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
  const response = await fetchImpl(url, { headers: headers(token) });
  if (!response.ok) {
    throw new PlatformFetchError(
      `GET ${repo}/${path}@${ref.slice(0, 9)} -> HTTP ${response.status} ${response.statusText}.\n\n` +
        `  If this is a 404, the file MOVED. That is the upstream being absent, and it is a hard\n` +
        `  failure by design: the vocabulary this front end mirrors is no longer where it was, and\n` +
        `  a generated copy of a file nobody can find is a copy nobody is maintaining.\n` +
        `  Fix the path in scripts/lib/platform-vocabularies.mjs, then re-run\n` +
        `  \`pnpm codegen:vocabularies --refresh\`.`,
    );
  }
  return await response.text();
}
