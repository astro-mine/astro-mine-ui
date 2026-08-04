// @vitest-environment node
//
// A failure, turned into what a reader is told (Wave 29; api.md §4).
//
// `node` rather than jsdom: nothing here renders. The presentation *table* is the subject, and the
// rules it encodes are the ones the pages depend on being true everywhere — that a missing
// capability is a state and not an error, and that the server's own sentence survives the trip.

import { ApiProblemError, ApiTransportError, type ApiProblem } from "@astro-mine/api-client";
import { describe, expect, it } from "vitest";

import { failedWith, failureMessage, failureOf, isDegraded } from "@/data/problems";

const problem = (over: Partial<ApiProblem> & Pick<ApiProblem, "code">): ApiProblemError =>
  new ApiProblemError({
    title: over.code,
    status: 500,
    detail: "the server's own words",
    errors: [],
    ...over,
  });

describe("a problem the API named", () => {
  it("keeps the server's detail verbatim", () => {
    // The rule the whole error contract rests on: `detail` is prose for a person and nothing
    // rewrites it. For `admission_rejected` the detail IS the supply-chain verdict, and a
    // paraphrase of a verdict is a different verdict.
    const verdict = "signature verified; SLSA provenance missing for layer 2";
    const failure = failureOf(problem({ code: "admission_rejected", detail: verdict }));
    expect(failure.detail).toBe(verdict);
  });

  it("carries the code through, so a page can render one cause specially", () => {
    const failure = failureOf(problem({ code: "namespace_refused" }));
    expect(failure.code).toBe("namespace_refused");
    expect(failedWith(failure, "namespace_refused")).toBe(true);
    expect(failedWith(failure, "admission_rejected")).toBe(false);
  });

  it("carries field-level problems, so a form can point at the field", () => {
    const failure = failureOf(
      problem({
        code: "validation_failed",
        errors: [{ field: "objective.name", message: "must not be empty", type: "value_error" }],
      }),
    );
    expect(failure.errors).toHaveLength(1);
    expect(failure.errors[0]?.field).toBe("objective.name");
  });

  it("always offers an array of field problems, even when there were none", () => {
    // So a form iterates unconditionally rather than guarding every render.
    expect(failureOf(problem({ code: "internal_error" })).errors).toEqual([]);
  });
});

describe("what counts as degraded rather than broken", () => {
  // Honesty rule 3. These two are the deployment saying "not here", and rendering them red tells a
  // reader to go looking for a fault that does not exist.
  it.each(["publish_unconfigured", "capability_unavailable"] as const)("%s is a state", (code) => {
    const failure = failureOf(problem({ code }));
    expect(failure.kind).toBe("degraded");
    expect(isDegraded(failure)).toBe(true);
    expect(failure.remedy, `${code} must say what to do about it`).toBeDefined();
  });

  it.each(["namespace_refused", "not_authenticated", "validation_failed", "conflict"] as const)(
    "%s is a refusal — the request reached a working deployment",
    (code) => {
      expect(failureOf(problem({ code })).kind).toBe("refused");
    },
  );

  it.each(["internal_error", "method_not_allowed"] as const)("%s is an error", (code) => {
    expect(failureOf(problem({ code })).kind).toBe("error");
  });
});

describe("a transport failure", () => {
  it("is an error, and names no code — no server sent one", () => {
    // The enumeration is the API's and is append-only public API. Minting a client-side member
    // would put a name in it no server will ever send.
    const failure = failureOf(
      new ApiTransportError("the API at https://api.test could not be reached"),
    );
    expect(failure.kind).toBe("error");
    expect(failure.code).toBeUndefined();
    expect(failure.detail).toContain("could not be reached");
    expect(failure.remedy).toContain("CORS");
  });

  it("keeps the status when one arrived but the body was not the contract", () => {
    const failure = failureOf(new ApiTransportError("not a problem document", { status: 502 }));
    expect(failure.status).toBe(502);
  });
});

describe("anything else that was thrown", () => {
  it("still becomes something the reader is told", () => {
    // A bug in a page is still something to report. Swallowing it leaves a pane that never
    // resolves, which is the one outcome worse than an ugly message.
    expect(failureOf(new Error("boom")).detail).toBe("boom");
    expect(failureOf("a bare string").detail).toBe("a bare string");
  });
});

describe("the sentence handed to AsyncState", () => {
  it("names the cause and then quotes the server", () => {
    const failure = failureOf(problem({ code: "content_not_found", detail: "no such artifact" }));
    expect(failureMessage(failure)).toBe("Not found — no such artifact");
  });
});
