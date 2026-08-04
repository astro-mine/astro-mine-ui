// The Bench write path (ui#14; UC-G4, UC-G7).
//
// The acceptance criteria this file is the evidence for:
//
//   - a submission can be made from a Hub digest and its job followed to a terminal state;
//   - retraction requires an explicit confirmation NAMING what is being retracted;
//   - an unauthenticated reader sees the audit trail without ever being prompted, and sees exactly
//     what the write controls need;
//   - polling stops when the page is left — no request outlives its page;
//   - a failed evaluation shows the server's reason, not a generic message.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuditTrail } from "@/components/bench/AuditTrail";
import { JobStatus } from "@/components/bench/JobStatus";
import { RetractControl } from "@/components/bench/RetractControl";
import { SubmitForm } from "@/components/bench/SubmitForm";
import { authorizationHeader } from "@/components/bench/TokenField";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { goTo } from "../router";
import { jobRecord, submission } from "./fixtures";

const { api, use, server } = mockApi();

/**
 * A user that does not re-check `pointer-events` before every click.
 *
 * **This is a jsdom fidelity problem, not a lowered standard.** MUI's `Select` opens its menu
 * behind a transition, and for the frame or two that transition is running the option inherits
 * `pointer-events: none`. `userEvent`'s check reads that and throws *immediately* — so the failure
 * is a fast one that looks like a missing element, appears only when the machine is loaded enough
 * for the transition to still be in flight, and passes every time the file is run alone. That cost
 * an afternoon of chasing timeouts that were not timeouts.
 *
 * A real browser would have completed the transition. Everything else about the interaction is
 * unchanged: same events, same order, same target.
 */
const menuUser = () => userEvent.setup({ delay: null, pointerEventsCheck: 0 });

const SCENARIOS = api.benchListScenarios({ body: ["lunar-polar-ice-v1"] });

const auditEvent = (over: Record<string, unknown> = {}) => ({
  event_id: "evt-1",
  occurred_at: "2026-07-01T12:00:00Z",
  action: "submission.admit",
  decision: "allow" as const,
  detail: {},
  issuer: "steward@astro-mine",
  job_id: null,
  reason: "signature verified",
  resource: "submission",
  subject: "astro-mine",
  submission_id: null,
  trace_id: null,
  ...over,
});

describe("submitting from a registry digest", () => {
  it("sends the Hub route and follows the result", async () => {
    // UC-G4, and the path that matters for the commons: what gets ranked is a content-addressed
    // artifact somebody else can pull.
    let sent: { hub_ref?: string; scenario_id?: string } | undefined;
    server.events.on("request:start", async ({ request }) => {
      if (new URL(request.url).pathname === "/bench/submissions/hub") {
        sent = (await request.clone().json()) as { hub_ref?: string };
      }
    });

    use(SCENARIOS);
    use(api.benchSubmitHub({ body: jobRecord() }));
    renderWithApi(<SubmitForm />);

    const user = menuUser();
    await user.click(await screen.findByRole("combobox", { name: /Scenario/ }));
    await user.click(await screen.findByRole("option", { name: "lunar-polar-ice-v1" }));
    await user.type(
      screen.getByRole("textbox", { name: /Registry reference or digest/ }),
      "commons/excavation-ppo@sha256:abc",
    );
    await user.click(screen.getByRole("button", { name: /Submit for evaluation/ }));

    // A JOB, not a scorecard: the Hub route resolves and executes, so what comes back is something
    // to follow. Rendering an "Accepted" scorecard here would invent a result that does not exist.
    expect(await screen.findByText("Queued for evaluation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Follow this job" })).toHaveAttribute(
      "href",
      "/bench/jobs?id=job-1",
    );
    expect(sent).toMatchObject({
      hub_ref: "commons/excavation-ppo@sha256:abc",
      scenario_id: "lunar-polar-ice-v1",
    });
  });

  it("sends the direct route when that is what was chosen", async () => {
    let path = "";
    server.events.on("request:start", ({ request }) => {
      const candidate = new URL(request.url).pathname;
      if (candidate.startsWith("/bench/submissions")) path = candidate;
    });

    use(SCENARIOS);
    use(api.benchSubmit({ body: submission() }));
    renderWithApi(<SubmitForm />);

    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "Direct reference" }));
    await user.click(await screen.findByRole("combobox", { name: /Scenario/ }));
    await user.click(await screen.findByRole("option", { name: "lunar-polar-ice-v1" }));
    await user.type(screen.getByRole("textbox", { name: /Policy reference/ }), "ppo:1.0.0");
    await user.click(screen.getByRole("button", { name: /Submit for evaluation/ }));

    await screen.findByText("Accepted");
    expect(path).toBe("/bench/submissions");
  });

  it("says plainly that submitting needs a token and looking does not", async () => {
    use(SCENARIOS);
    renderWithApi(<SubmitForm />);
    expect(await screen.findByText(/Looking is open; entering is not/)).toBeInTheDocument();
  });

  it("says you are submitting a policy, not a score", async () => {
    // A form that looks like "enter your result" invites exactly the entry held-out seeds exist to
    // prevent.
    use(SCENARIOS);
    renderWithApi(<SubmitForm />);
    expect(await screen.findByText(/submitting a policy, not a score/)).toBeInTheDocument();
    expect(screen.getByText(/held-out seeds it does not disclose/)).toBeInTheDocument();
  });

  it("shows the runner on a direct submission's receipt", async () => {
    // The direct route answers a scored Submission, so there IS a runner to name — and if this
    // deployment scored the entry with the reference fixture, the reader learns it here rather
    // than on discovering their result is not a measurement.
    use(SCENARIOS);
    use(api.benchSubmit({ body: submission({ runner: "fixture/0.1.0" }) }));
    renderWithApi(<SubmitForm />);

    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "Direct reference" }));
    await user.click(await screen.findByRole("combobox", { name: /Scenario/ }));
    await user.click(await screen.findByRole("option", { name: "lunar-polar-ice-v1" }));
    await user.type(screen.getByRole("textbox", { name: /Policy reference/ }), "ppo:1.0.0");
    await user.click(screen.getByRole("button", { name: /Submit for evaluation/ }));

    expect(await screen.findByText(/Fixture · stand-in/)).toBeInTheDocument();
  });

  it("shows the API's own refusal", async () => {
    use(SCENARIOS);
    use(
      api.benchSubmitHub({
        problem: {
          code: "submission_rejected",
          detail: "policy interface is env@0.2, expected 0.3",
        },
      }),
    );
    renderWithApi(<SubmitForm />);

    const user = menuUser();
    await user.click(await screen.findByRole("combobox", { name: /Scenario/ }));
    await user.click(await screen.findByRole("option", { name: "lunar-polar-ice-v1" }));
    await user.type(screen.getByRole("textbox", { name: /Registry reference/ }), "x@sha256:abc");
    await user.click(screen.getByRole("button", { name: /Submit for evaluation/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("expected 0.3");
  });

  it("disables the control with no API rather than failing on click", async () => {
    renderWithApi(<SubmitForm />, UNCONFIGURED);
    expect(
      await screen.findByText("No API is configured, so there is nothing to submit to."),
    ).toBeInTheDocument();
  });
});

describe("the token header", () => {
  it("is absent when nothing was typed, rather than a malformed one", async () => {
    // `Bearer ` with no token turns "I supplied none" into "I supplied a broken one" — different
    // failures with different fixes.
    expect(authorizationHeader("")).toBeUndefined();
    expect(authorizationHeader("   ")).toBeUndefined();
  });

  it("adds the scheme, and does not add it twice", async () => {
    expect(authorizationHeader("abc")).toEqual({ authorization: "Bearer abc" });
    expect(authorizationHeader("Bearer abc")).toEqual({ authorization: "Bearer abc" });
  });
});

describe("following a job", () => {
  it("says queued when it is queued, rather than 'loading'", async () => {
    use(
      api.benchGetJob({
        body: { job_id: "job-1", status: "queued", detail: null, result_id: null },
      }),
    );
    goTo("/bench/jobs?id=job-1");
    renderWithApi(<JobStatus />);

    expect(await screen.findByText(/waiting for a worker/)).toBeInTheDocument();
  });

  it("follows a job to a terminal state and then stops asking", async () => {
    // The criterion: "a submission ... its job followed to a terminal state, driven in a test
    // against the faked API."
    let calls = 0;
    use(
      api.benchGetJob(() => {
        calls += 1;
        return calls < 2
          ? { body: { job_id: "job-1", status: "running" as const, detail: null, result_id: null } }
          : {
              body: {
                job_id: "job-1",
                status: "ranked" as const,
                detail: null,
                result_id: "sha256:res",
              },
            };
      }),
    );
    goTo("/bench/jobs?id=job-1");
    renderWithApi(<JobStatus />);

    await screen.findByText(/Resolving the artifact/);
    await waitFor(() => expect(screen.getByText(/Verified and placed/)).toBeInTheDocument(), {
      timeout: 8000,
    });

    expect(await screen.findByText("Final — no longer being polled.")).toBeInTheDocument();

    // And it really has stopped: the count does not move again.
    const settled = calls;
    await new Promise((resolve) => setTimeout(resolve, 4000));
    expect(calls).toBe(settled);
  }, 20000);

  it("shows the server's reason for a rejection, not a generic message", async () => {
    use(
      api.benchGetJob({
        body: {
          job_id: "job-1",
          status: "rejected",
          detail: "digest sha256:abc is not in the registry",
          result_id: null,
        },
      }),
    );
    goTo("/bench/jobs?id=job-1");
    renderWithApi(<JobStatus />);

    expect(await screen.findByText("digest sha256:abc is not in the registry")).toBeInTheDocument();
  });

  it("links to the scorecard a finished job produced", async () => {
    use(
      api.benchGetJob({
        body: { job_id: "job-1", status: "ranked", detail: null, result_id: "sha256:res" },
      }),
    );
    goTo("/bench/jobs?id=job-1");
    renderWithApi(<JobStatus />);

    expect(
      await screen.findByRole("link", { name: "Open the scorecard this produced" }),
    ).toHaveAttribute("href", "/bench/submission?id=sha256%3Ares");
  });

  it("stops polling when the page is left — no request outlives its page", async () => {
    // ui#14's criterion, and the one that is invisible until a tab has been open for an hour.
    let calls = 0;
    use(
      api.benchGetJob(() => {
        calls += 1;
        return {
          body: { job_id: "job-1", status: "running" as const, detail: null, result_id: null },
        };
      }),
    );
    goTo("/bench/jobs?id=job-1");
    const { unmount } = renderWithApi(<JobStatus />);
    await screen.findByText(/Resolving the artifact/);

    unmount();
    const afterUnmount = calls;
    await new Promise((resolve) => setTimeout(resolve, 4000));
    expect(calls).toBe(afterUnmount);
  }, 15000);

  it("is a state, not an error, with no job in the address", async () => {
    goTo("/bench/jobs");
    renderWithApi(<JobStatus />);
    expect(await screen.findByText("No job in the address")).toBeInTheDocument();
  });
});

describe("retracting", () => {
  const control = (
    <RetractControl
      submissionId="sha256:1111"
      policyRef="commons/excavation-ppo:1.2.0"
      scenarioId="lunar-polar-ice-v1"
    />
  );

  it("is a named button, never a bare icon", async () => {
    renderWithApi(control);
    expect(
      await screen.findByRole("button", { name: "Retract this submission" }),
    ).toBeInTheDocument();
  });

  it("requires a confirmation that names what is being retracted", async () => {
    // "Are you sure?" over an unnamed thing is a question nobody can answer correctly.
    renderWithApi(control);
    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "Retract this submission" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("commons/excavation-ppo:1.2.0")).toBeInTheDocument();
    expect(within(dialog).getByText("lunar-polar-ice-v1")).toBeInTheDocument();
    expect(within(dialog).getByText("sha256:1111")).toBeInTheDocument();
  });

  it("does nothing until the confirmation is given", async () => {
    // Nothing stubbed: a DELETE here would fail the test outright.
    renderWithApi(control);
    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "Retract this submission" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("retracts on confirmation and says the trail recorded it", async () => {
    use(api.benchRetractSubmission({ body: submission() }));
    const onRetracted = vi.fn();
    renderWithApi(
      <RetractControl
        submissionId="sha256:1111"
        policyRef="commons/excavation-ppo:1.2.0"
        scenarioId="lunar-polar-ice-v1"
        onRetracted={onRetracted}
      />,
    );

    const user = menuUser();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retract this submission" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Retract this submission" }));
    await user.click(await screen.findByRole("button", { name: "Retract" }));

    expect(await screen.findByText(/the audit trail records who retracted it/)).toBeInTheDocument();
    expect(onRetracted).toHaveBeenCalled();
  });

  it("shows the API's refusal inside the dialog rather than closing it", async () => {
    use(
      api.benchRetractSubmission({ problem: { code: "not_authorized", detail: "not a steward" } }),
    );
    renderWithApi(control);

    const user = menuUser();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retract this submission" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Retract this submission" }));
    await user.click(await screen.findByRole("button", { name: "Retract" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("not a steward");
  });
});

describe("the audit trail", () => {
  it("reads without prompting for anything", async () => {
    // UC-G7's criterion. A credential field a reader meets first reads as a wall, so the token is
    // behind a disclosure and the table is not.
    use(api.benchAuditTrail({ body: [auditEvent()] }));
    goTo("/bench/audit");
    renderWithApi(<AuditTrail />);

    const table = await screen.findByRole("table", { name: "Audit trail" });
    expect(within(table).getByText("submission.admit")).toBeInTheDocument();
    // The token control exists but is collapsed; nothing demanded one.
    expect(screen.getByRole("button", { name: "I have a steward token" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Token")).toBeNull();
  });

  it("sends no authorization header when none was given", async () => {
    const seen: (string | null)[] = [];
    server.events.on("request:start", ({ request }) =>
      seen.push(request.headers.get("authorization")),
    );

    use(api.benchAuditTrail({ body: [auditEvent()] }));
    goTo("/bench/audit");
    renderWithApi(<AuditTrail />);
    await screen.findByRole("table", { name: "Audit trail" });

    expect(seen).not.toHaveLength(0);
    expect(seen.every((value) => value === null)).toBe(true);
  });

  it("shows on whose authority each action was taken", async () => {
    use(api.benchAuditTrail({ body: [auditEvent({ issuer: "steward@example.org" })] }));
    goTo("/bench/audit");
    renderWithApi(<AuditTrail />);

    const table = await screen.findByRole("table", { name: "Audit trail" });
    expect(within(table).getByText("steward@example.org")).toBeInTheDocument();
  });

  it("renders the timestamp in UTC, not in the reader's locale", async () => {
    // An audit trail is evidence, and evidence read in the reader's own time zone is evidence two
    // people describe differently.
    use(api.benchAuditTrail({ body: [auditEvent({ occurred_at: "2026-07-01T12:00:00Z" })] }));
    goTo("/bench/audit");
    renderWithApi(<AuditTrail />);

    const table = await screen.findByRole("table", { name: "Audit trail" });
    expect(within(table).getByText(/2026-07-01 12:00:00/)).toBeInTheDocument();
  });

  it("says an empty trail is empty", async () => {
    use(api.benchAuditTrail({ body: [] }));
    goTo("/bench/audit");
    renderWithApi(<AuditTrail />);

    expect(await screen.findByText("No audit events match")).toBeInTheDocument();
  });

  it("filters by decision through the address", async () => {
    use(
      api.benchAuditTrail(({ request }) => ({
        body:
          new URL(request.url).searchParams.get("decision") === "rejected"
            ? [auditEvent({ decision: "rejected", action: "submission.reject" })]
            : [],
      })),
    );
    goTo("/bench/audit?decision=rejected");
    renderWithApi(<AuditTrail />);

    const table = await screen.findByRole("table", { name: "Audit trail" });
    expect(within(table).getByText("submission.reject")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(SCENARIOS);
    await forEachColorScheme(withApi(<SubmitForm />), async ({ container }) => {
      await screen.findAllByRole("button", { name: /Submit for evaluation/ });
      await expectNoA11yViolations(container);
    });
  });
});
