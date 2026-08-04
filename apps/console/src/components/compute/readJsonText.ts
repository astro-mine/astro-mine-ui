// Reading a specification a person typed (ui#19).
//
// The same defensive posture as the publish form's manifest reader, for the same reason: the input
// is free text, the most likely thing to go wrong is a typo, and the outcome must be a labelled
// state rather than an exception at the moment somebody commits compute.
//
// Read on **every keystroke** rather than on submit, so the error appears while it is being made.

/** What came out of the box, or why nothing did. */
export type JsonText =
  | { readonly status: "read"; readonly value: Record<string, unknown> }
  | { readonly status: "failed"; readonly reason: string };

export function readJsonText(text: string): JsonText {
  if (text.trim() === "") {
    return { status: "failed", reason: "Nothing to send — the specification is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return {
      status: "failed",
      reason: `Not valid JSON: ${cause instanceof Error ? cause.message : "unparseable"}.`,
    };
  }

  // An array and `null` are both valid JSON and neither is a specification. Caught here so the
  // reader is told which, rather than reading a 422 about a field they never typed.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      status: "failed",
      reason: "Valid JSON, but not a JSON object — a specification is an object.",
    };
  }

  return { status: "read", value: parsed as Record<string, unknown> };
}
