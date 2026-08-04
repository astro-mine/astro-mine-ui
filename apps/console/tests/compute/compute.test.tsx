// Jobs, sweeps and backends (ui#19; cloud.md; api.md §2).
//
// The acceptance criteria this file is the evidence for:
//
//   - a sweep's expansion is shown, COUNTED, and scrollable before submission;
//   - with no backend configured the page explains what to configure rather than offering a button
//     that will fail;
//   - a submission's result names what accepted it;
//   - nothing on the page computes a plan the API did not return.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Backends } from "@/components/compute/Backends";
import { Jobs } from "@/components/compute/Jobs";
import { readJsonText } from "@/components/compute/readJsonText";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";

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

const BACKENDS = api.cloudBackends({ body: { local: ["cpu"], ray: ["cpu", "gpu"] } });
const NO_BACKENDS = api.cloudBackends({ body: {} });

const jobSpec = () => ({
  image: { repository: "ghcr.io/astro-mine/runner", digest: "sha256:abc", tag: "0.5.0" },
  command: ["astro-mine", "bench", "run"],
  // Required by the generated type even though the document gives it a default — the response
  // shape is what a server sends back, and a server fills its defaults in.
  distributed: false,
});

describe("the backends page", () => {
  it("lists what this deployment offers, with what each is for", async () => {
    use(BACKENDS);
    renderWithApi(<Backends />);

    const table = await screen.findByRole("table", { name: "Execution backends" });
    expect(within(table).getByText("local")).toBeInTheDocument();
    expect(within(table).getByText(/Runs in this deployment's own process/)).toBeInTheDocument();
    expect(within(table).getByText("gpu")).toBeInTheDocument();
  });

  it("still lists a backend this build has never heard of", async () => {
    // Omitting the row would hide a capability the deployment genuinely has.
    use(api.cloudBackends({ body: { slurm: ["cpu"] } }));
    renderWithApi(<Backends />);

    const table = await screen.findByRole("table", { name: "Execution backends" });
    expect(within(table).getByText("slurm")).toBeInTheDocument();
    expect(within(table).getByText(/it is still offered/)).toBeInTheDocument();
  });

  it("says so when none is configured, rather than showing an empty table", async () => {
    use(NO_BACKENDS);
    renderWithApi(<Backends />);

    expect(
      await screen.findByText("This deployment has no execution backends configured"),
    ).toBeInTheDocument();
    expect(screen.getByText(/nowhere for a job to run/)).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    renderWithApi(<Backends />, UNCONFIGURED);
    expect(await screen.findByText("No API is configured")).toBeInTheDocument();
  });
});

describe("expanding a sweep", () => {
  it("shows the expansion, counted plainly", async () => {
    // The count is the sentence somebody needs before committing compute, and it should not have
    // to be inferred from a scrollbar.
    use(BACKENDS);
    use(api.cloudExpandSweep({ body: { size: 6, jobs: [jobSpec(), jobSpec()] } }));
    renderWithApi(<Jobs />);

    const user = menuUser();
    const button = await screen.findByRole("button", { name: /Expand the sweep/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("Expansion")).toBeInTheDocument();
    expect(screen.getByText("6 jobs")).toBeInTheDocument();
  });

  it("says an expansion of nothing is nothing", async () => {
    use(BACKENDS);
    use(api.cloudExpandSweep({ body: { size: 0, jobs: [] } }));
    renderWithApi(<Jobs />);

    const user = menuUser();
    const button = await screen.findByRole("button", { name: /Expand the sweep/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("The sweep expands to nothing")).toBeInTheDocument();
  });

  it("attributes the count to the API rather than to the page", async () => {
    // The criterion: nothing here computes a plan the API did not return.
    use(BACKENDS);
    use(api.cloudExpandSweep({ body: { size: 6, jobs: [jobSpec()] } }));
    renderWithApi(<Jobs />);

    const user = menuUser();
    const button = await screen.findByRole("button", { name: /Expand the sweep/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    await screen.findByText("Expansion");
    expect(screen.getByText(/nothing here expanded a grid of its own/)).toBeInTheDocument();
  });
});

describe("a compiled plan", () => {
  it("names the object it compiles to, and shows the engine's spec as a document", async () => {
    // astro-mine-api#12 gave the three routes a declared envelope. What stayed open is `spec`,
    // which belongs to Kubernetes, KubeRay or Argo — so the page names what it can and shows what
    // it must not claim to know.
    use(BACKENDS);
    use(
      api.cloudCompileSweep({
        body: {
          apiVersion: "argoproj.io/v1alpha1",
          kind: "Workflow",
          metadata: { name: "sweep-abc", namespace: "astro-mine", labels: {}, annotations: {} },
          // The engine's own schema, left open by the contract on purpose.
          spec: { entrypoint: "fan-out", templates: [] },
        },
      }),
    );
    renderWithApi(<Jobs />);

    const user = menuUser();
    const button = await screen.findByRole("button", { name: "Compile it" });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("Compiled sweep")).toBeInTheDocument();
    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByText("sweep-abc")).toBeInTheDocument();
    // The spec is rendered as the foreign document it is, not under headings this build invented.
    expect(screen.getByText(/entrypoint/)).toBeInTheDocument();
    expect(screen.getByText(/rather than this platform/)).toBeInTheDocument();
  });
});

describe("submitting a job", () => {
  it("is disabled with no backend, and says what to configure", async () => {
    use(NO_BACKENDS);
    renderWithApi(<Jobs />);

    expect(
      await screen.findByText("This deployment has no execution backends configured"),
    ).toBeInTheDocument();

    const user = menuUser();
    await user.click(screen.getByRole("button", { name: "A single job" }));
    expect(screen.getByRole("button", { name: /Submit the job/ })).toBeDisabled();
  });

  it("shows the run result and the context it is addressed at", async () => {
    use(BACKENDS);
    use(
      api.cloudSubmitJob({
        body: {
          status: "succeeded",
          exit_code: 0,
          run_context_address: "sha256:runcontext",
          run_context: {
            schema_version: "0.1",
            code_version: "0.5.0",
            environment: {},
            outputs: {},
            source_content_hashes: {},
          },
          outputs: {},
        },
      }),
    );
    renderWithApi(<Jobs />);

    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "A single job" }));
    const button = screen.getByRole("button", { name: /Submit the job/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("Run succeeded")).toBeInTheDocument();
    expect(screen.getByText("sha256:runcontext")).toBeInTheDocument();
  });

  it("says there is nothing to watch, rather than inventing a progress view", async () => {
    // ui#19 puts job monitoring out of scope because Cloud exposes no job-status read. The page
    // says so where a reader would otherwise go looking.
    use(BACKENDS);
    use(
      api.cloudSubmitJob({
        body: {
          status: "succeeded",
          exit_code: 0,
          run_context_address: "sha256:runcontext",
          run_context: {
            schema_version: "0.1",
            code_version: "0.5.0",
            environment: {},
            outputs: {},
            source_content_hashes: {},
          },
          outputs: {},
        },
      }),
    );
    renderWithApi(<Jobs />);

    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "A single job" }));
    const button = screen.getByRole("button", { name: /Submit the job/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText("There is nothing to watch")).toBeInTheDocument();
    expect(screen.getByText(/serves no job-status read/)).toBeInTheDocument();
  });

  it("sends the specification as typed", async () => {
    let sent: { command?: string[] } | undefined;
    server.events.on("request:start", async ({ request }) => {
      if (new URL(request.url).pathname === "/cloud/jobs") {
        sent = (await request.clone().json()) as { command?: string[] };
      }
    });

    use(BACKENDS);
    use(
      api.cloudSubmitJob({
        body: {
          status: "succeeded",
          exit_code: 0,
          run_context_address: "sha256:x",
          run_context: {
            schema_version: "0.1",
            code_version: "0.5.0",
            environment: {},
            outputs: {},
            source_content_hashes: {},
          },
          outputs: {},
        },
      }),
    );
    renderWithApi(<Jobs />);

    const user = menuUser();
    await user.click(await screen.findByRole("button", { name: "A single job" }));
    const button = screen.getByRole("button", { name: /Submit the job/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await screen.findByText("Run succeeded");

    expect(sent?.command).toEqual(["astro-mine", "bench", "run"]);
  });
});

describe("a specification that is not one", () => {
  it("is labelled while it is being typed, not at the moment of committing compute", async () => {
    use(BACKENDS);
    renderWithApi(<Jobs />);

    const user = menuUser();
    const box = await screen.findByRole("textbox", { name: /Sweep specification/ });
    await user.clear(box);
    await user.type(box, "{{not json");

    expect(
      await screen.findByText("That is not a specification this can send"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Expand the sweep/ })).toBeDisabled();
  });

  it("reports each failure mode with its own reason", () => {
    expect(readJsonText("")).toMatchObject({ status: "failed" });
    expect(readJsonText("   ").status).toBe("failed");
    expect(readJsonText("[1,2]")).toMatchObject({
      reason: expect.stringContaining("not a JSON object"),
    });
    expect(readJsonText("nope")).toMatchObject({
      reason: expect.stringContaining("Not valid JSON"),
    });
    expect(readJsonText('{"a":1}')).toEqual({ status: "read", value: { a: 1 } });
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(BACKENDS);
    await forEachColorScheme(withApi(<Jobs />), async ({ container }) => {
      await screen.findAllByRole("button", { name: /Expand the sweep/ });
      await expectNoA11yViolations(container);
    });
  });
});
