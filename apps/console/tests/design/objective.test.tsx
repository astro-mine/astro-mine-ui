// The objective and the candidate swarms (ui#15; UC-F1, UC-F2; studio.md §2).
//
// Every acceptance criterion in the issue has an assertion here:
//
//   - a study is authored end to end with no JSON typed anywhere;
//   - an objective Core would refuse is stopped BEFORE a study is launched, with the reason in
//     words — and the backend's 422 is still surfaced when it disagrees;
//   - a candidate naming an asset absent from the catalog is caught and named;
//   - the catalog's unavailable and empty states render differently, because their fixes differ;
//   - every capability tag shown comes from the artifact, never from the form.

import { mockApi } from "@astro-mine/api-client/testing";
import { expectNoA11yViolations, forEachColorScheme } from "@astro-mine/ui/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ObjectiveForm } from "@/components/design/ObjectiveForm";
import { readSession } from "@/components/design/session";
import { validateCandidates, validateDraft } from "@/components/design/validate";

import { renderWithApi, UNCONFIGURED, withApi } from "../data/harness";
import { asset, captured, intentDraft } from "./fixtures";

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

const CATALOG = api.studioListCatalog({
  body: [asset(), asset({ name: "hauler", reference: "commons/hauler:1.0.0" })],
});

beforeEach(() => {
  window.sessionStorage.clear();
});

/**
 * A user with no inter-key delay.
 *
 * `menuUser()`'s default is one tick per keystroke, and this form is large: filling it takes
 * roughly sixty keystrokes, each re-rendering every control. On a slower machine that ran past
 * Testing Library's five-second default and the suite failed intermittently on timing rather than
 * on behaviour. `delay: null` keeps the interactions real — same events, same order — without the
 * artificial pacing.
 */
const typist = () => menuUser();

/**
 * Wait until the form can actually be submitted.
 *
 * The submit button is disabled until the runtime configuration resolves, and the catalog combobox
 * renders before that — so a test that waits only for the combobox clicks a disabled button and
 * then asserts against a submission that never happened. Same trap as the bench write path.
 */
const awaitSubmittable = () =>
  waitFor(() =>
    expect(screen.getByRole("button", { name: /Capture the objective/ })).toBeEnabled(),
  );

/**
 * Fill everything the form needs to be valid, using only the controls a reader has.
 *
 * The first query is a `findBy`, not a `getBy`, and that is the fix for a real intermittency rather
 * than defensive padding: the caller waits for the catalog combobox, which can resolve on a render
 * pass before this form's fields have been committed under load. A `getBy` then finds nothing and
 * the run fails on timing. Waiting for the first field is waiting for the form.
 */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  // **Short values on purpose.** `user.type` is one keystroke at a time and each one re-renders
  // every control on a form with twenty of them; the realistic strings this started with were
  // roughly sixty keystrokes, which under v8 coverage instrumentation on a CI runner put the whole
  // test within a few hundred milliseconds of the async ceiling. None of these assertions is about
  // what the text *says* — they are about the objective being captured, the digest being kept and
  // the CRS being sent — so the content can be short without the interaction being any less real.
  await user.type(await screen.findByRole("textbox", { name: /^Name/ }), "Ice");
  await user.type(screen.getByRole("textbox", { name: /^Author/ }), "d");
  await user.type(screen.getByRole("textbox", { name: /Region name/ }), "Rim");
  await user.type(screen.getAllByRole("textbox", { name: /^Metric/ })[0]!, "ice");
  await user.type(screen.getAllByRole("textbox", { name: /^Unit/ })[0]!, "kg");

  await user.type(screen.getByRole("textbox", { name: /Candidate name/ }), "Two");
  await user.click(screen.getByRole("combobox", { name: /Robot/ }));
  await user.click(await screen.findByRole("option", { name: "commons/excavator:1.0.0" }));
}

describe("authoring an objective", () => {
  it("takes no JSON anywhere — every field is a control", async () => {
    // The criterion, asserted structurally: there is no textarea a reader is expected to put a
    // document into, and the only multiline fields are prose.
    use(CATALOG);
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    for (const label of [/json/i, /paste/i, /document/i]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(screen.getByRole("textbox", { name: /^Metric/ })).toBeInTheDocument();
    // `type="number"`, so the role is `spinbutton` rather than `textbox`.
    expect(screen.getByRole("spinbutton", { name: /Reference radius/ })).toBeInTheDocument();
  });

  it("captures the objective and keeps its digest", async () => {
    use(CATALOG);
    use(api.studioCaptureIntent({ body: captured() }));
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await fillValidForm(user);
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));

    expect(await screen.findByText("Objective captured")).toBeInTheDocument();
    expect(screen.getByText("sha256:objective")).toBeInTheDocument();
  });

  it("hands the objective and candidates to the session, for the study page", async () => {
    use(CATALOG);
    use(api.studioCaptureIntent({ body: captured() }));
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await fillValidForm(user);
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));
    await screen.findByText("Objective captured");

    const session = readSession();
    expect(session.objective?.digest).toBe("sha256:objective");
    expect(session.candidates).toHaveLength(1);
    // The candidate carries the catalog's reference — a real content-addressed asset, not a name
    // somebody typed.
    expect(session.candidates?.[0]?.id).toBe("Two");
    expect(session.candidates?.[0]?.swarm[0]?.sadf_ref).toBe("commons/excavator:1.0.0");
  });

  it("sends the region's planetary CRS with the draft", async () => {
    let sent: { draft?: { region?: { crs?: { body?: string } } } } | undefined;
    server.events.on("request:start", async ({ request }) => {
      if (new URL(request.url).pathname === "/studio/intent") {
        sent = (await request.clone().json()) as typeof sent;
      }
    });

    use(CATALOG);
    use(api.studioCaptureIntent({ body: captured() }));
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await fillValidForm(user);
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));
    await screen.findByText("Objective captured");

    expect(sent?.draft?.region?.crs?.body).toBe("MOON");
  });
});

describe("a doomed study never launches", () => {
  it("refuses before anything is sent, and says so", async () => {
    // Nothing but the catalog is stubbed: a POST here would fail the test outright, which is the
    // assertion — the request is not made.
    use(CATALOG);
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));

    expect(await screen.findByText("This objective was not sent")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was launched/)).toBeInTheDocument();
  });

  it("names each missing field where the field is", async () => {
    use(CATALOG);
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));

    expect(await screen.findByText("The study needs a name.")).toBeInTheDocument();
    expect(screen.getByText(/Name the author/)).toBeInTheDocument();
    expect(screen.getByText(/A position with no frame is not a position/)).toBeInTheDocument();
  });

  it("still surfaces the backend's 422, which is the authority", async () => {
    // The local check is the fast layer, not a replacement. A rule this form does not know about
    // arrives here.
    use(CATALOG);
    use(
      api.studioCaptureIntent({
        problem: {
          code: "validation_failed",
          detail: "the objective was refused",
          errors: [
            {
              field: "objective.success_criteria.0.binding.aggregation",
              message: "unknown aggregation",
              type: "value_error",
            },
          ],
        },
      }),
    );
    renderWithApi(<ObjectiveForm />);
    await screen.findByRole("combobox", { name: /Robot/ });

    const user = typist();
    await fillValidForm(user);
    await awaitSubmittable();
    await user.click(screen.getByRole("button", { name: /Capture the objective/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("the objective was refused");
    expect(alert).toHaveTextContent("unknown aggregation");
  });
});

describe("the half-filled candidate row", () => {
  it("is neither submitted nor silently dropped", async () => {
    // ui#15 asks for this by name. Silently dropping is the worse failure: the study runs, the
    // candidate the reader thought they were comparing is absent, and nothing says so.
    const problems = validateCandidates(
      [{ id: "c1", name: "Named", assetRef: "", count: 1 }],
      [{ reference: "commons/excavator:1.0.0" }],
    );
    expect(problems.map((p) => p.message).join(" ")).toContain("names no robot");

    const other = validateCandidates(
      [{ id: "c1", name: "", assetRef: "commons/excavator:1.0.0", count: 1 }],
      [{ reference: "commons/excavator:1.0.0" }],
    );
    expect(other.map((p) => p.message).join(" ")).toContain("has no name");
  });

  it("catches an asset the catalog does not carry, and names it", async () => {
    // It would resolve to nothing at evaluation time — invisible in the numbers rather than an
    // error, which is a silent hole in a comparison the reader is about to trust.
    const problems = validateCandidates(
      [{ id: "c1", name: "Ghost", assetRef: "commons/nonesuch:9.9.9", count: 1 }],
      [{ reference: "commons/excavator:1.0.0" }],
    );
    const said = problems.map((p) => p.message).join(" ");
    expect(said).toContain("commons/nonesuch:9.9.9");
    expect(said).toContain("vanish from the results");
  });

  it("requires at least one robot in a swarm", () => {
    const problems = validateCandidates(
      [{ id: "c1", name: "Zero", assetRef: "commons/excavator:1.0.0", count: 0 }],
      [{ reference: "commons/excavator:1.0.0" }],
    );
    expect(problems.some((p) => p.field === "candidates.0.count")).toBe(true);
  });
});

describe("the validator encodes the document's constraints and no others", () => {
  it("rejects a reference radius of zero — exclusiveMinimum, not minimum", () => {
    const problems = validateDraft(
      intentDraft({
        region: {
          name: "r",
          crs: { body: "MOON", body_fixed_frame: "MOON_ME", reference_radius_m: 0 },
        },
      }),
    );
    expect(problems.some((p) => p.field === "region.crs.reference_radius_m")).toBe(true);
  });

  it("rejects a negative tolerance — minimum: 0", () => {
    const problems = validateDraft(
      intentDraft({
        products: [
          {
            criterion_id: "p1",
            metric: "ice_yield",
            unit: "kg",
            target: 10,
            tolerance: -1,
            direction: "higher_better",
          },
        ],
      }),
    );
    expect(problems.some((p) => p.field === "products.0.tolerance")).toBe(true);
  });

  it("requires at least one target product — success_criteria has minItems: 1", () => {
    const problems = validateDraft(intentDraft({ products: [] }));
    expect(problems.some((p) => p.field === "products")).toBe(true);
  });

  it("accepts a draft that satisfies all of them", () => {
    expect(validateDraft(intentDraft())).toEqual([]);
  });
});

describe("the catalog's own failure modes", () => {
  it("distinguishes unavailable from empty — the fixes differ", async () => {
    use(
      api.studioListCatalog({ problem: { code: "capability_unavailable", detail: "no registry" } }),
    );
    renderWithApi(<ObjectiveForm />);

    expect(await screen.findByText("The robot catalog is unavailable")).toBeInTheDocument();
    expect(screen.getByText(/registry wiring rather than anything you did/)).toBeInTheDocument();
  });

  it("says an empty catalog is empty, with its own remedy", async () => {
    use(api.studioListCatalog({ body: [] }));
    renderWithApi(<ObjectiveForm />);

    expect(await screen.findByText("This deployment publishes no robots")).toBeInTheDocument();
    expect(screen.getByText(/astro-mine hub publish/)).toBeInTheDocument();
  });

  it("explains itself with no API configured", async () => {
    renderWithApi(<ObjectiveForm />, UNCONFIGURED);
    expect(await screen.findByText("The robot catalog is unavailable")).toBeInTheDocument();
  });
});

describe("what a chosen digest names", () => {
  it("shows the artifact's own capability tags, never the form's", async () => {
    use(
      api.studioListCatalog({ body: [asset({ capability_tags: ["excavation", "autonomy_l2"] })] }),
    );
    renderWithApi(<ObjectiveForm />);

    const user = typist();
    await user.click(await screen.findByRole("combobox", { name: /Robot/ }));
    await user.click(await screen.findByRole("option", { name: "commons/excavator:1.0.0" }));

    expect(await screen.findByText("excavation")).toBeInTheDocument();
    expect(screen.getByText("autonomy_l2")).toBeInTheDocument();
  });

  it("warns before the study when an asset declares no capability tags", async () => {
    // Work is assigned by capability. A swarm of these scores nothing and reads as a bad design
    // rather than an unusable one — which is an afternoon to discover afterwards.
    use(api.studioListCatalog({ body: [asset({ capability_tags: [] })] }));
    renderWithApi(<ObjectiveForm />);

    const user = typist();
    await user.click(await screen.findByRole("combobox", { name: /Robot/ }));
    await user.click(await screen.findByRole("option", { name: "commons/excavator:1.0.0" }));

    expect(await screen.findByText("This robot declares no capability tags")).toBeInTheDocument();
    expect(screen.getByText(/looks like a poor design and is not one/)).toBeInTheDocument();
  });

  it("shows the digest the candidate will carry", async () => {
    use(api.studioListCatalog({ body: [asset()] }));
    renderWithApi(<ObjectiveForm />);

    const user = typist();
    await user.click(await screen.findByRole("combobox", { name: /Robot/ }));
    await user.click(await screen.findByRole("option", { name: "commons/excavator:1.0.0" }));

    await waitFor(() => {
      const card = screen.getByText("excavator").closest("div");
      expect(within(card as HTMLElement).getByText(/sha256:/)).toBeInTheDocument();
    });
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes", async () => {
    use(CATALOG);
    await forEachColorScheme(withApi(<ObjectiveForm />), async ({ container }) => {
      await screen.findAllByRole("combobox", { name: /Robot/ });
      await expectNoA11yViolations(container);
    });
  });
});
