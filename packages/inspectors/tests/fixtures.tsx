// The subjects and contributions the resolution tests are written against (ui#7).
//
// The two colliding `field_model` contributions are **fixtures, not shipped inspectors**, and the
// distinction matters: neither Worlds nor Surrogate has a REST surface for a panel to render from,
// so shipping either would be an inspector with nothing to fetch (this issue's own out-of-scope
// note). What ui.md §6 asks for is that the *rule* separates them, and a rule is separated by a
// test.
//
// They are modelled exactly as §6 describes: "Surrogate claims `field_model` *where container is
// `surrogate`*; Worlds claims `field_model` unqualified and is the fallback."

import type { InspectorContribution, InspectorSubject } from "../src/index.js";

/** A panel that renders its own id, so a test can assert which one won. */
function marker(id: string) {
  return function Marker() {
    return <span data-testid="panel">{id}</span>;
  };
}

export const worldsFieldModel: InspectorContribution = {
  id: "worlds.field-model",
  title: "Illumination field",
  kind: "field_model",
  Panel: marker("worlds.field-model"),
};

export const surrogateFieldModel: InspectorContribution = {
  id: "surrogate.field-model",
  title: "Surrogate field model",
  kind: "field_model",
  artifactKind: "surrogate",
  Panel: marker("surrogate.field-model"),
};

/** A third claim on the same kind, keyed on the open attribute map — the last-resort discriminator. */
export const excavationFieldModel: InspectorContribution = {
  id: "surrogate.excavation",
  title: "Excavation model",
  kind: "field_model",
  artifactKind: "surrogate",
  matchesAttributes: (attributes) => attributes.physics_domain === "excavation",
  Panel: marker("surrogate.excavation"),
};

/** Two contributions at the same specificity on the same kind — a modelling bug, deliberately. */
export const tiedAlpha: InspectorContribution = {
  id: "alpha.metric",
  title: "Alpha",
  kind: "metric",
  Panel: marker("alpha.metric"),
};

export const tiedBeta: InspectorContribution = {
  id: "beta.metric",
  title: "Beta",
  kind: "metric",
  Panel: marker("beta.metric"),
};

/** A subject with sensible identity, overridable per test. */
export function subject(overrides: Partial<InspectorSubject> = {}): InspectorSubject {
  return {
    reference: "shackleton-rim:0.5.0",
    name: "shackleton-rim",
    version: "0.5.0",
    digest: "sha256:3f786850e387550fdab836ed7e6dc881de23001b8a0b1e1e1c1e0a5a9d2b2c3d",
    kind: "world_provider",
    artifactKind: "world",
    attributes: {},
    ...overrides,
  };
}
