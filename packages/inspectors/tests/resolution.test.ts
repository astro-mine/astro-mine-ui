// THE RESOLUTION RULE, CLAUSE BY CLAUSE (ui#7; ui.md §6).
//
// "A UI that resolves differently on two machines is a reproducibility defect (CX-REPRO), not a
// cosmetic one." Every clause of §6 gets its own named test here, because a normative rule whose
// only record is a doc comment is a rule that survives exactly until the first refactor.

import { describe, expect, it } from "vitest";

import {
  createInspectorRegistry,
  resolveInspector,
  specificity,
  matches,
  type InspectorContribution,
} from "../src/index.js";
import {
  excavationFieldModel,
  subject,
  surrogateFieldModel,
  tiedAlpha,
  tiedBeta,
  worldsFieldModel,
} from "./fixtures.js";

const fieldModelSubject = (artifactKind: string | null, attributes = {}) =>
  subject({ kind: "field_model", artifactKind, attributes });

describe("match", () => {
  it("requires the Core kind to be equal", () => {
    const registry = createInspectorRegistry([worldsFieldModel]);
    expect(resolveInspector(registry, subject({ kind: "policy" })).status).toBe("unmatched");
    expect(resolveInspector(registry, fieldModelSubject(null)).status).toBe("resolved");
  });

  it("requires every declared discriminator to match", () => {
    const registry = createInspectorRegistry([surrogateFieldModel]);
    // Right kind, wrong container.
    expect(resolveInspector(registry, fieldModelSubject("world")).status).toBe("unmatched");
    expect(resolveInspector(registry, fieldModelSubject("surrogate")).status).toBe("resolved");
  });

  it("treats a subject with no Core kind as unmatched, naming the null", () => {
    const registry = createInspectorRegistry([worldsFieldModel]);
    const resolution = resolveInspector(registry, subject({ kind: null }));
    expect(resolution).toEqual({ status: "unmatched", kind: null });
  });
});

describe("a null artifact_kind fails closed", () => {
  // ui.md §6: "A contribution declaring `artifactKind` MUST NOT match a subject with no container
  // kind — `artifact_kind` is nullable, and a null MUST fail closed rather than match loosely."
  //
  // This is not hypothetical: Hub's own `CatalogEntry` documents `artifact_kind = None` for an
  // artifact published by another tool, or one indexed before the facet existed. A registry full of
  // older bundles is exactly where a loose match would do its damage.
  it("never matches a contribution that declares one", () => {
    const registry = createInspectorRegistry([surrogateFieldModel]);
    expect(resolveInspector(registry, fieldModelSubject(null)).status).toBe("unmatched");
    expect(matches(surrogateFieldModel, fieldModelSubject(null))).toBe(false);
  });

  it("still matches a contribution that declares none", () => {
    // The other half of the rule, and the reason the shipped inspectors declare no container kind:
    // failing closed is right for a *declared* discriminator and wrong as a blanket policy.
    const registry = createInspectorRegistry([worldsFieldModel]);
    const resolution = resolveInspector(registry, fieldModelSubject(null));
    expect(resolution.status).toBe("resolved");
  });
});

describe("specificity", () => {
  it("counts declared discriminators, not the kind every contribution declares", () => {
    expect(specificity(worldsFieldModel)).toBe(0);
    expect(specificity(surrogateFieldModel)).toBe(1);
    expect(specificity(excavationFieldModel)).toBe(2);
  });

  it("resolves the field_model collision to the more specific contribution", () => {
    // The acceptance criterion, and ui.md §6's worked example: a Worlds illumination field model and
    // a Surrogate excavation model BOTH carry `field_model`, so keying on Core's kind alone routes a
    // Surrogate model into Worlds' inspector.
    const registry = createInspectorRegistry([worldsFieldModel, surrogateFieldModel]);

    const surrogateArtifact = resolveInspector(registry, fieldModelSubject("surrogate"));
    expect(surrogateArtifact.status).toBe("resolved");
    expect(surrogateArtifact).toMatchObject({ contribution: { id: "surrogate.field-model" } });

    // ...and Worlds is still the fallback for the unqualified case, which is the half that would be
    // easy to break by making the discriminator mandatory.
    const worldArtifact = resolveInspector(registry, fieldModelSubject("world"));
    expect(worldArtifact).toMatchObject({ contribution: { id: "worlds.field-model" } });
  });

  it("lets the attribute predicate win over the container kind alone", () => {
    const registry = createInspectorRegistry([
      worldsFieldModel,
      surrogateFieldModel,
      excavationFieldModel,
    ]);

    expect(
      resolveInspector(registry, fieldModelSubject("surrogate", { physics_domain: "excavation" })),
    ).toMatchObject({ status: "resolved", contribution: { id: "surrogate.excavation" } });

    // A surrogate whose physics domain is something else falls back to the container-kind claim —
    // the predicate narrows, it does not capture.
    expect(
      resolveInspector(registry, fieldModelSubject("surrogate", { physics_domain: "thermal" })),
    ).toMatchObject({ status: "resolved", contribution: { id: "surrogate.field-model" } });
  });
});

describe("ties", () => {
  // ui.md §6: "Two matches at equal specificity are a modelling bug, not a runtime condition to
  // absorb silently. The registry MUST resolve deterministically by a stable total order — never
  // registration order — and MUST surface the ambiguity as a visible diagnostic."
  const tiedSubject = subject({ kind: "metric", artifactKind: null });

  it("resolves identically whatever order the registry was assembled in", () => {
    const forwards = createInspectorRegistry([tiedAlpha, tiedBeta]);
    const backwards = createInspectorRegistry([tiedBeta, tiedAlpha]);

    const a = resolveInspector(forwards, tiedSubject);
    const b = resolveInspector(backwards, tiedSubject);

    expect(a).toMatchObject({ status: "ambiguous", contribution: { id: "alpha.metric" } });
    expect(b).toMatchObject({ status: "ambiguous", contribution: { id: "alpha.metric" } });
  });

  it("resolves identically on two runs", () => {
    const registry = createInspectorRegistry([tiedBeta, tiedAlpha]);
    const runs = Array.from({ length: 5 }, () => resolveInspector(registry, tiedSubject));
    const ids = new Set(runs.map((run) => (run.status === "ambiguous" ? run.contribution.id : "")));
    expect([...ids]).toEqual(["alpha.metric"]);
  });

  it("reports the ambiguity rather than absorbing it", () => {
    const registry = createInspectorRegistry([tiedAlpha, tiedBeta]);
    const resolution = resolveInspector(registry, tiedSubject);
    expect(resolution.status).toBe("ambiguous");
    if (resolution.status !== "ambiguous") return;
    expect(resolution.alternatives.map((c) => c.id)).toEqual(["beta.metric"]);
  });

  it("is not ambiguity when one of the two is more specific", () => {
    // The distinction the whole specificity rule rests on: two claims on one kind are only a bug
    // when neither narrows the other.
    const registry = createInspectorRegistry([worldsFieldModel, surrogateFieldModel]);
    expect(resolveInspector(registry, fieldModelSubject("surrogate")).status).toBe("resolved");
  });
});

describe("no match", () => {
  it("names the kind so the fallback can say it", () => {
    const registry = createInspectorRegistry([worldsFieldModel]);
    expect(resolveInspector(registry, subject({ kind: "comms_model" }))).toEqual({
      status: "unmatched",
      kind: "comms_model",
    });
  });

  it("is what an empty registry does, rather than throwing", () => {
    expect(resolveInspector(createInspectorRegistry([]), subject()).status).toBe("unmatched");
  });

  it("is what a kind this build has never heard of does", () => {
    // A platform newer than this build can put a member on the wire that the generated vocabulary
    // does not have. That must land on the fallback, not on a crash — which is why the subject's
    // keys are typed `string | null` rather than as the generated unions.
    const registry = createInspectorRegistry([worldsFieldModel]);
    expect(resolveInspector(registry, subject({ kind: "trajectory" })).status).toBe("unmatched");
  });
});

describe("the registry itself", () => {
  it("refuses duplicate ids, because the tie rule orders on them", () => {
    const clone: InspectorContribution = { ...tiedAlpha, title: "A different title" };
    expect(() => createInspectorRegistry([tiedAlpha, clone])).toThrow(/duplicate inspector id/);
  });

  it("holds its contributions in the stable order, whatever order they arrived in", () => {
    const registry = createInspectorRegistry([tiedBeta, tiedAlpha]);
    expect(registry.contributions.map((c) => c.id)).toEqual(["alpha.metric", "beta.metric"]);
  });

  it("is frozen — a registry mutated after construction is a registry that resolves twice", () => {
    const registry = createInspectorRegistry([tiedAlpha]);
    expect(Object.isFrozen(registry.contributions)).toBe(true);
  });

  it("does not alias the array it was given", () => {
    const contributions = [tiedAlpha];
    const registry = createInspectorRegistry(contributions);
    contributions.push(tiedBeta);
    expect(registry.contributions).toHaveLength(1);
  });
});
