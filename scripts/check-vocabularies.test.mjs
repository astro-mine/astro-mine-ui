#!/usr/bin/env node
// Proof that the vocabulary gate is a gate (ui#7).
//
// The real tree is, by construction, always clean — the pin is regenerated from the platform, so
// there is no live drift to demonstrate and the guard's whole value rests on failing when there is.
// So the failure modes are proven here against fixture sources: a renamed class, a moved tuple, a
// block that parses to nothing, a member that is not a wire value, and each of the three ways two
// vocabularies can disagree.
//
// Node's built-in test runner, zero dependencies, exactly as `check-layering.test.mjs` is: these
// scripts run before anything is installed, and a gate should not drag a test framework behind it.
//
//   node --test scripts/check-vocabularies.test.mjs      (or `pnpm check:vocabularies:test`)

import assert from "node:assert/strict";
import test from "node:test";

import { compareVocabularies } from "./check-vocabularies.mjs";
import { VocabularyError, extract } from "./lib/platform-vocabularies.mjs";
import { PlatformFetchError, requireToken } from "./lib/platform-fetch.mjs";

const PLUGIN_KIND = { name: "PluginKind", symbol: "PluginKind", form: "str-enum" };
const ARTIFACT_KIND = { name: "ArtifactKind", symbol: "ARTIFACT_KINDS", form: "str-tuple" };

/** The shape `enums.py` actually has, trimmed: docstring, comments, blank lines, a trailing class. */
const ENUMS_PY = `
from enum import StrEnum


class PluginKind(StrEnum):
    """Closed, Core-owned vocabulary.

    A docstring with a = "not_a_member" inside it, indented like a member would be.
    """

    # Sim extension points (sim.md §3)
    REGIME_ENGINE = "regime_engine"
    SENSOR_MODEL = "sensor_model"

    # Worlds extension points
    FIELD_MODEL = "field_model"


class SignatureScheme(StrEnum):
    """A different vocabulary entirely."""

    SIGSTORE_COSIGN = "sigstore_cosign"
    UNSIGNED = "unsigned"
`;

const OCI_PY = `
MEDIA_MANIFEST = "application/vnd.oci.image.manifest.v1+json"

#: Hub's container vocabulary — deliberately coarser than Core's \`PluginKind\`.
ARTIFACT_KINDS: tuple[str, ...] = (
    "policy",
    "world",
    "asset",
)

REF_ANNOTATION = "org.opencontainers.image.ref.name"
`;

test("reads a StrEnum's members in declaration order", () => {
  assert.deepEqual(extract(ENUMS_PY, PLUGIN_KIND), [
    "regime_engine",
    "sensor_model",
    "field_model",
  ]);
});

test("stops at the next top-level statement, not at the first blank line", () => {
  // The failure this guards against is subtle and silent: a body reader that stopped at a blank
  // line would return two members instead of three, and a body reader that never stopped would
  // swallow `SignatureScheme`'s and hand the registry `sigstore_cosign` as a plugin kind.
  const members = extract(ENUMS_PY, PLUGIN_KIND);
  assert.ok(!members.includes("sigstore_cosign"), "swallowed the next class's members");
  assert.ok(!members.includes("not_a_member"), "picked a value out of the docstring");
  assert.equal(members.length, 3);
});

test("reads a tuple's members in declaration order", () => {
  assert.deepEqual(extract(OCI_PY, ARTIFACT_KIND), ["policy", "world", "asset"]);
});

test("does not mistake a neighbouring assignment for the tuple", () => {
  const members = extract(OCI_PY, ARTIFACT_KIND);
  assert.ok(!members.some((m) => m.includes("opencontainers")));
  assert.ok(!members.some((m) => m.includes("vnd.oci")));
});

test("fails hard when the class has been renamed — the upstream is absent", () => {
  assert.throws(
    () => extract(ENUMS_PY.replace("class PluginKind", "class PluginType"), PLUGIN_KIND),
    VocabularyError,
  );
});

test("fails hard when the tuple has moved", () => {
  assert.throws(() => extract(OCI_PY.replace("ARTIFACT_KINDS", "CONTAINER_KINDS"), ARTIFACT_KIND), {
    name: "VocabularyError",
    message: /no `ARTIFACT_KINDS = \(\.\.\.\)` assignment/,
  });
});

test("fails hard on an empty vocabulary rather than generating `never`", () => {
  // An empty union typechecks everywhere and matches nothing, so every artifact would silently get
  // the fallback panel. Refusing to generate it is the whole point.
  const emptied = 'class PluginKind(StrEnum):\n    """Nothing here."""\n\n\nX = 1\n';
  assert.throws(() => extract(emptied, PLUGIN_KIND), {
    name: "VocabularyError",
    message: /parsed to zero members/,
  });
});

test("fails hard when a member does not look like a wire value", () => {
  const shouty = ENUMS_PY.replace('"regime_engine"', '"RegimeEngine"');
  assert.throws(() => extract(shouty, PLUGIN_KIND), {
    name: "VocabularyError",
    message: /do not look like wire values/,
  });
});

test("fails hard on duplicate members", () => {
  const duplicated = OCI_PY.replace('"asset",', '"asset",\n    "world",');
  assert.throws(() => extract(duplicated, ARTIFACT_KIND), {
    name: "VocabularyError",
    message: /duplicate members: world/,
  });
});

test("agrees with itself", () => {
  const pinned = {
    PluginKind: { members: ["policy", "metric"] },
    ArtifactKind: { members: ["policy", "world"] },
  };
  const upstream = { PluginKind: ["policy", "metric"], ArtifactKind: ["policy", "world"] };
  assert.deepEqual(compareVocabularies(pinned, upstream), []);
});

test("reports a member added upstream", () => {
  const pinned = {
    PluginKind: { members: ["policy"] },
    ArtifactKind: { members: ["policy"] },
  };
  const upstream = { PluginKind: ["policy", "trajectory"], ArtifactKind: ["policy"] };
  const differences = compareVocabularies(pinned, upstream);
  assert.equal(differences.length, 1);
  assert.match(differences[0], /PluginKind/);
  assert.match(differences[0], /added upstream: trajectory/);
});

test("reports a member removed upstream in its own words", () => {
  // Both vocabularies are documented append-only, so a removal is either a breaking change or a
  // broken parser — and those want different responses, which is why the message differs.
  const pinned = {
    PluginKind: { members: ["policy"] },
    ArtifactKind: { members: ["policy", "world"] },
  };
  const upstream = { PluginKind: ["policy"], ArtifactKind: ["policy"] };
  const differences = compareVocabularies(pinned, upstream);
  assert.equal(differences.length, 1);
  assert.match(differences[0], /REMOVED upstream: world/);
  assert.match(differences[0], /append-only/);
});

test("reports a reordering, which changes nothing semantically and everything for a diff", () => {
  const pinned = {
    PluginKind: { members: ["policy", "metric"] },
    ArtifactKind: { members: ["policy"] },
  };
  const upstream = { PluginKind: ["metric", "policy"], ArtifactKind: ["policy"] };
  const differences = compareVocabularies(pinned, upstream);
  assert.equal(differences.length, 1);
  assert.match(differences[0], /different declaration order/);
});

test("a missing credential is a hard failure, not a skip", () => {
  assert.throws(() => requireToken({}), {
    name: "PlatformFetchError",
    message: /fails rather than skips/,
  });
  assert.ok(PlatformFetchError);
});
