// Refusing a doomed study before it launches (ui#15; studio.md §2 principle 2).
//
// **What "client-side validation against Core's objective schema" means here, precisely.** The
// front end vendors Core's *frame and unit* schemas and no others, so there is no objective schema
// on disk to run a validator against — and adding one would be a second copy of a contract that is
// already published. What the API's OpenAPI document *does* carry is every constraint Core states
// about the pieces this form collects: `IntentDraft` requires a name, an author and a region;
// `PlanetaryCRS.reference_radius_m` is `exclusiveMinimum: 0`; `TargetProduct.tolerance` is
// `minimum: 0`; `ObjectiveSpec.success_criteria` has `minItems: 1`. Those are the same rules,
// arriving through the channel this workspace already treats as authoritative.
//
// So this file encodes **exactly those constraints and no invented ones**, and it is deliberately
// small. Every rule below can be pointed at a line in the document; a rule that cannot is a rule
// this front end made up, and a form that refuses input the server would have accepted is worse
// than one that lets a 422 through.
//
// **The backend remains authoritative.** `POST /studio/intent` validates against Core itself and
// answers a `validation_failed` problem with field-level detail, which the page renders. This is
// the fast, local, explain-it-in-place layer — not a replacement for the real check, and ui#15 says
// as much: *"The backend's 422 remains the authoritative backstop, surfaced as words."*

import type { IntentDraft } from "./types";

/** One thing wrong, and where. `field` matches the API's `FieldProblem.field` spelling. */
export interface DraftProblem {
  readonly field: string;
  readonly message: string;
}

/** A candidate as the form holds it, before it becomes a `DesignCandidate`. */
export interface CandidateDraft {
  readonly id: string;
  readonly name: string;
  /** The catalog reference chosen, or `""` when the row is still half-filled. */
  readonly assetRef: string;
  readonly count: number;
}

/**
 * Everything wrong with a draft, in one pass.
 *
 * All the problems rather than the first: a form that reveals one error at a time makes a reader
 * fix, submit, and discover the next — three round trips for something that could have been said
 * once.
 */
export function validateDraft(draft: IntentDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];
  // `products` and `constraints` are optional in the document (they default to empty server-side),
  // so they are read defensively here rather than assumed present — the same defensive posture the
  // rest of the front end takes toward anything the contract marks optional.
  const products = draft.products ?? [];
  const constraints = draft.constraints ?? [];
  const required = (value: string, field: string, what: string) => {
    if (value.trim() === "") problems.push({ field, message: what });
  };

  required(draft.name, "name", "The study needs a name.");
  required(draft.author, "author", "Name the author — it travels with the objective's provenance.");
  required(draft.region.name, "region.name", "The region needs a name.");
  required(draft.region.crs.body, "region.crs.body", "Name the body, e.g. MOON.");
  required(
    draft.region.crs.body_fixed_frame,
    "region.crs.body_fixed_frame",
    "Name the body-fixed frame, e.g. MOON_ME. A position with no frame is not a position.",
  );

  // `exclusiveMinimum: 0` in the document — zero is not merely unhelpful, it is invalid.
  if (!(draft.region.crs.reference_radius_m > 0)) {
    problems.push({
      field: "region.crs.reference_radius_m",
      message: "The reference radius must be greater than zero.",
    });
  }

  // `ObjectiveSpec.success_criteria` has `minItems: 1`, and every criterion this form can produce
  // comes from a target product. No products means an objective Core will refuse.
  if (products.length === 0) {
    problems.push({
      field: "products",
      message:
        "An objective needs at least one target product. Without one there is nothing to score a design against.",
    });
  }

  products.forEach((product, index) => {
    required(product.metric, `products.${index}.metric`, "Name the metric.");
    required(
      product.unit,
      `products.${index}.unit`,
      "Name the unit — a value with no unit is a bug upstream.",
    );
    if (!Number.isFinite(product.target)) {
      problems.push({ field: `products.${index}.target`, message: "The target must be a number." });
    }
    // `minimum: 0` in the document.
    if (!Number.isFinite(product.tolerance) || product.tolerance < 0) {
      problems.push({
        field: `products.${index}.tolerance`,
        message: "The tolerance must be zero or more.",
      });
    }
  });

  constraints.forEach((constraint, index) => {
    required(constraint.metric, `constraints.${index}.metric`, "Name the metric.");
    required(constraint.unit, `constraints.${index}.unit`, "Name the unit.");
    if (!Number.isFinite(constraint.threshold)) {
      problems.push({
        field: `constraints.${index}.threshold`,
        message: "The threshold must be a number.",
      });
    }
  });

  return problems;
}

/**
 * Everything wrong with the candidate rows.
 *
 * **The half-filled row is the case worth naming.** ui#15 asks for it explicitly: a candidate with
 * a name and no asset, or an asset and no name, is *neither submitted verbatim nor silently
 * dropped*. Silently dropping is the worse of the two — the study runs, the candidate the reader
 * thought they were comparing is absent, and nothing on the page says so.
 */
export function validateCandidates(
  candidates: readonly CandidateDraft[],
  catalog: readonly { reference: string }[],
): DraftProblem[] {
  const problems: DraftProblem[] = [];

  if (candidates.length === 0) {
    problems.push({
      field: "candidates",
      message: "A trade study compares candidates. Add at least one.",
    });
  }

  const known = new Set(catalog.map((entry) => entry.reference));

  candidates.forEach((candidate, index) => {
    const named = candidate.name.trim() !== "";
    const chosen = candidate.assetRef.trim() !== "";

    if (named && !chosen) {
      problems.push({
        field: `candidates.${index}.assetRef`,
        message: `“${candidate.name}” names no robot. Pick one from the catalog, or remove the row.`,
      });
    }
    if (!named && chosen) {
      problems.push({
        field: `candidates.${index}.name`,
        message: "This row picks a robot but has no name. Name it, or remove the row.",
      });
    }
    if (!named && !chosen) {
      problems.push({
        field: `candidates.${index}`,
        message: "This row is empty. Fill it in or remove it — it will not be quietly dropped.",
      });
    }
    // **Caught here rather than after the run.** An asset reference the catalog does not carry
    // resolves to nothing at evaluation time, which makes the candidate invisible in the numbers
    // rather than an error — a silent hole in a comparison the reader is about to trust.
    if (chosen && known.size > 0 && !known.has(candidate.assetRef)) {
      problems.push({
        field: `candidates.${index}.assetRef`,
        message: `“${candidate.assetRef}” is not in this deployment's catalog. It would resolve to nothing and vanish from the results rather than failing.`,
      });
    }
    if (!Number.isInteger(candidate.count) || candidate.count < 1) {
      problems.push({
        field: `candidates.${index}.count`,
        message: "A swarm needs at least one robot.",
      });
    }
  });

  return problems;
}

/** The problems for one field, for a form that shows them where they happened. */
export function problemsFor(problems: readonly DraftProblem[], field: string): string[] {
  return problems.filter((problem) => problem.field === field).map((problem) => problem.message);
}
