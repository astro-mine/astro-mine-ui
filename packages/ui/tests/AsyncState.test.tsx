// The one loading / error / empty discipline (ui#3; ui.md §2, §9).

import { describe, expect, it, vi } from "vitest";

import { AsyncState, type Async } from "../src/components/AsyncState.js";
import { EmptyState } from "../src/components/EmptyState.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

const renderData = (data: string) => <p>{data}</p>;

describe("loading", () => {
  it("says what it is waiting for, in a live region", () => {
    // A spinner alone tells a sighted reader that something is happening and tells a screen-reader
    // user nothing at all. The label is the content, not a decoration on it.
    const { getByRole } = renderInMode(
      <AsyncState state={{ status: "loading" }} loadingLabel="Loading the leaderboard…">
        {renderData}
      </AsyncState>,
      "light",
    );

    const status = getByRole("status");
    expect(status).toHaveTextContent("Loading the leaderboard…");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("never renders the children while the request is in flight", () => {
    const children = vi.fn(renderData);
    renderInMode(<AsyncState state={{ status: "loading" }}>{children}</AsyncState>, "light");
    // The render prop is only called in the `ready` arm, so a page cannot be written against a
    // half-arrived value.
    expect(children).not.toHaveBeenCalled();
  });
});

describe("error", () => {
  it("shows the message the request actually produced", () => {
    // Not a paraphrase. A reader who has to report this needs the words the system used.
    const { getByRole } = renderInMode(
      <AsyncState state={{ status: "error", error: "connect ECONNREFUSED 127.0.0.1:8000" }}>
        {renderData}
      </AsyncState>,
      "light",
    );

    const alert = getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("connect ECONNREFUSED 127.0.0.1:8000");
  });

  it("carries a remedy when the caller knows one", () => {
    const { getByRole } = renderInMode(
      <AsyncState
        state={{ status: "error", error: "The request timed out." }}
        errorRemedy="Check that the API is reachable from this browser."
      >
        {renderData}
      </AsyncState>,
      "light",
    );
    expect(getByRole("alert")).toHaveTextContent("Check that the API is reachable");
  });
});

describe("empty", () => {
  it("is a state with words, never a blank pane", () => {
    const { container, getByText } = renderInMode(
      <AsyncState state={{ status: "empty" }}>{renderData}</AsyncState>,
      "light",
    );
    expect(getByText("Nothing here yet")).toBeInTheDocument();
    expect(container.textContent?.trim()).not.toBe("");
  });

  it("takes the page's own words when the default is too vague", () => {
    const { getByText } = renderInMode(
      <AsyncState
        state={{ status: "empty" }}
        empty={<EmptyState title="No submissions yet" hint="Submit a policy to see it ranked." />}
      >
        {renderData}
      </AsyncState>,
      "light",
    );
    expect(getByText("No submissions yet")).toBeInTheDocument();
    expect(getByText("Submit a policy to see it ranked.")).toBeInTheDocument();
  });

  it("is distinguishable from an error and from a degraded backend", () => {
    // The three get confused constantly, and a reader who cannot tell them apart cannot tell
    // whether to wait, to configure something, or to retry. `empty` must not be an alert.
    const { queryByRole } = renderInMode(
      <AsyncState state={{ status: "empty" }}>{renderData}</AsyncState>,
      "light",
    );
    expect(queryByRole("alert")).toBeNull();
  });
});

describe("ready", () => {
  it("renders the data and nothing else", () => {
    const { getByText, queryByRole } = renderInMode(
      <AsyncState state={{ status: "ready", data: "42 entries" }}>{renderData}</AsyncState>,
      "light",
    );
    expect(getByText("42 entries")).toBeInTheDocument();
    expect(queryByRole("alert")).toBeNull();
    expect(queryByRole("status")).toBeNull();
  });
});

describe("accessibility", () => {
  it("is axe-clean in every arm, in both colour schemes", async () => {
    const arms: Async<string>[] = [
      { status: "loading" },
      { status: "error", error: "It broke." },
      { status: "empty" },
      { status: "ready", data: "content" },
    ];

    for (const state of arms) {
      await forEachColorScheme(
        <AsyncState state={state}>{renderData}</AsyncState>,
        async ({ container }) => {
          await expectNoA11yViolations(container);
        },
      );
    }
  });
});
