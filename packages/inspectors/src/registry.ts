// THE RESOLUTION RULE IS NORMATIVE (ui#7; ui.md §6).
//
// "A UI that resolves differently on two machines is a reproducibility defect (CX-REPRO), not a
// cosmetic one." That sentence is why this file is pure, why it has no React in it, and why every
// clause below is a separate named test rather than a comment.
//
// The rule, as ui.md §6 states it:
//
//   MATCH        kind equals, and every declared discriminator matches. A contribution declaring
//                `artifactKind` MUST NOT match a subject with no container kind — a null FAILS
//                CLOSED rather than matching loosely.
//   SPECIFICITY  among matches, more declared discriminators wins. This is what separates a
//                Surrogate excavation model from a Worlds illumination field model when both carry
//                `field_model` — a live collision, not a hypothetical.
//   TIES         a modelling bug, not a runtime condition to absorb. Resolve by a stable total
//                order, never registration order, AND surface the ambiguity.
//   NO MATCH     an honest "no inspector for kind X". Never blank.

import type {
  InspectorContribution,
  InspectorKeys,
  InspectorRegistry,
  InspectorResolution,
} from "./model.js";

/**
 * How many discriminators a contribution declares beyond `kind` — its specificity.
 *
 * Zero, one or two. `kind` is not counted: every contribution declares it, so counting it would add
 * the same number to every comparison.
 */
export function specificity(contribution: InspectorContribution): number {
  return (
    (contribution.artifactKind === undefined ? 0 : 1) +
    (contribution.matchesAttributes === undefined ? 0 : 1)
  );
}

/**
 * Whether a contribution claims a subject.
 *
 * The null-fails-closed rule falls out of `!==` rather than being bolted on, and that is worth
 * naming: `contribution.artifactKind !== subject.artifactKind` is already false when the subject's
 * container kind is `null`, because a declared discriminator is never `null`. Written as an explicit
 * comparison rather than as "if the subject has one, compare it", which is the shape that would
 * quietly match loosely.
 */
export function matches(contribution: InspectorContribution, subject: InspectorKeys): boolean {
  if (subject.kind === null || contribution.kind !== subject.kind) return false;
  if (
    contribution.artifactKind !== undefined &&
    contribution.artifactKind !== subject.artifactKind
  ) {
    return false;
  }
  if (
    contribution.matchesAttributes !== undefined &&
    !contribution.matchesAttributes(subject.attributes)
  ) {
    return false;
  }
  return true;
}

/**
 * Build a registry.
 *
 * **Duplicate ids throw**, at construction, rather than being deduplicated or tolerated. The tie
 * rule resolves by ordering on the id; two contributions sharing one means the order is not total,
 * and a registry whose order is not total cannot make the guarantee this whole file exists to make.
 * That is a modelling bug in the composition, and the earliest possible failure is the kindest one.
 */
export function createInspectorRegistry(
  contributions: Iterable<InspectorContribution>,
): InspectorRegistry {
  const list = [...contributions];

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const contribution of list) {
    if (seen.has(contribution.id)) duplicates.add(contribution.id);
    seen.add(contribution.id);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `duplicate inspector id(s): ${[...duplicates].sort().join(", ")}. Ids are the stable total ` +
        `order ties resolve by (ui.md §6), so two contributions may not share one — with a ` +
        `duplicate, which panel a reader sees would depend on registration order.`,
    );
  }

  // Frozen and sorted once. Sorting here rather than at resolution time is what makes the total
  // order a property of the registry instead of a step every lookup has to remember to take.
  return { contributions: Object.freeze([...list].sort((a, b) => (a.id < b.id ? -1 : 1))) };
}

/**
 * Resolve the inspector for a subject.
 *
 * Deterministic in both senses that matter: the same registry and subject always give the same
 * answer, and a registry assembled in a different order is the same registry.
 */
export function resolveInspector(
  registry: InspectorRegistry,
  subject: InspectorKeys,
): InspectorResolution {
  const claimed = registry.contributions.filter((contribution) => matches(contribution, subject));

  if (claimed.length === 0) return { status: "unmatched", kind: subject.kind };

  const most = Math.max(...claimed.map(specificity));
  // `contributions` is already in id order, so `filter` preserves it and the winner is the first.
  const finalists = claimed.filter((contribution) => specificity(contribution) === most);
  const [winner, ...alternatives] = finalists;

  if (alternatives.length === 0) return { status: "resolved", contribution: winner };
  return { status: "ambiguous", contribution: winner, alternatives };
}
