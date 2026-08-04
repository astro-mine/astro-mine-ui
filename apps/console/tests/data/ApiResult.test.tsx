// Rendering what a read produced (Wave 29; ui.md §7 honesty rules 3 and 6).
//
// The one rule worth a test file of its own: **a degraded state is never rendered as an error.** A
// deployment that does not mount a surface has not broken, and a red alert sends the reader looking
// for a fault that does not exist. The API distinguishes the two by `code`; this is where that
// distinction becomes something a person can see.

import { ApiProblemError, ApiTransportError } from "@astro-mine/api-client";
import { EmptyState } from "@astro-mine/ui";
import { expectNoA11yViolations, forEachColorScheme, renderLight } from "@astro-mine/ui/testing";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiResult, FailureNotice } from "@/data/ApiResult";
import { failureOf } from "@/data/problems";
import type { ApiQuery } from "@/data/useApiQuery";

import { UNCONFIGURED } from "./harness";

const failure = (code: Parameters<typeof problemFor>[0], detail = "the server's own words") =>
  failureOf(problemFor(code, detail));

function problemFor(code: string, detail: string) {
  return new ApiProblemError({
    code: code as never,
    title: code,
    status: 500,
    detail,
    errors: [],
  });
}

const ready = <T,>(data: T): ApiQuery<T> => ({ status: "ready", data });

const show = (query: ApiQuery<readonly string[]>, empty?: React.ReactNode) => (
  <ApiResult query={query} empty={empty}>
    {(rows) => (
      <ul>
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    )}
  </ApiResult>
);

describe("a deployment with no API", () => {
  it("is a state with a reason and a remedy, not an error", () => {
    renderLight(show({ status: "unconfigured", config: UNCONFIGURED }));

    // `role="status"` is DegradedState; `role="alert"` is AsyncState's error arm. Which one this
    // is IS the assertion.
    const notice = screen.getByRole("status");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(within(notice).getByText("No API is configured")).toBeInTheDocument();
    expect(notice).toHaveTextContent("No `config.json` was found beside the application.");
    expect(notice).toHaveTextContent("Create `config.json`");
  });
});

describe("a failure the API called a missing capability", () => {
  it("degrades visibly rather than blaming something", () => {
    renderLight(
      show({
        status: "failed",
        failure: failure("capability_unavailable", "studio is not mounted"),
      }),
    );

    const notice = screen.getByRole("status");
    expect(screen.queryByRole("alert")).toBeNull();
    // The API's own sentence — it is the only thing that says *which* capability.
    expect(notice).toHaveTextContent("studio is not mounted");
    expect(notice).toHaveTextContent("The surface is not mounted");
  });

  it("takes the page's own remedy over the general one when given", () => {
    renderLight(
      <ApiResult
        query={{ status: "failed", failure: failure("publish_unconfigured") }}
        remedy="Browsing and resolving still work."
      >
        {() => null}
      </ApiResult>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Browsing and resolving still work.");
  });
});

describe("a failure that really is one", () => {
  it("goes to the one error discipline", () => {
    renderLight(show({ status: "failed", failure: failure("internal_error", "boom") }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The API failed — boom");
  });

  it("names the fields when the API named them", () => {
    const problem = new ApiProblemError({
      code: "validation_failed",
      title: "validation_failed",
      status: 422,
      detail: "the objective was rejected",
      errors: [{ field: "objective.name", message: "must not be empty", type: "value_error" }],
    });
    renderLight(<FailureNotice failure={failureOf(problem)} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("objective.name");
    expect(alert).toHaveTextContent("must not be empty");
  });

  it("treats an unreachable API as an error, because from here it is one", () => {
    renderLight(
      show({
        status: "failed",
        failure: failureOf(
          new ApiTransportError("the API at https://api.test could not be reached"),
        ),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("could not be reached");
  });
});

describe("the ordinary arms", () => {
  it("shows the data when there is data", () => {
    renderLight(show(ready(["shackleton", "haworth"])));
    expect(screen.getByText("shackleton")).toBeInTheDocument();
  });

  it("says so when the read succeeded and produced nothing", () => {
    renderLight(show(ready([]), <EmptyState title="Nothing matched" hint="Widen the search." />));
    expect(screen.getByText("Nothing matched")).toBeInTheDocument();
  });

  it("takes a page's own idea of empty", () => {
    // A result that is an object with a list inside it — the shape of every leaderboard and
    // comparison in this application.
    renderLight(
      <ApiResult
        query={ready({ rows: [] as string[] })}
        isEmpty={(data) => data.rows.length === 0}
        empty={<EmptyState title="No entries yet" />}
      >
        {() => <div>rows</div>}
      </ApiResult>,
    );
    expect(screen.getByText("No entries yet")).toBeInTheDocument();
  });

  it("is busy while loading, and says so out loud", () => {
    renderLight(show({ status: "loading" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the page's own words when there is nothing to ask for", () => {
    // `/registry/artifact` with no `name`: a legitimate state, and its own message rather than a
    // spinner that never resolves.
    renderLight(
      <ApiResult
        query={{ status: "idle" }}
        idle={<EmptyState title="No artifact in the address" />}
      >
        {() => null}
      </ApiResult>,
    );
    expect(screen.getByText("No artifact in the address")).toBeInTheDocument();
  });

  it("renders nothing at all when idle and the page said nothing", () => {
    const { container } = renderLight(show({ status: "idle" }));
    expect(container.textContent).toBe("");
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, degraded and failed alike", async () => {
    await forEachColorScheme(
      <>
        <ApiResult query={{ status: "unconfigured", config: UNCONFIGURED }}>{() => null}</ApiResult>
        <FailureNotice failure={failure("internal_error", "boom")} />
      </>,
      async ({ container }) => {
        await expectNoA11yViolations(container);
      },
    );
  });
});
