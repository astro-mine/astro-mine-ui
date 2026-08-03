// Provenance before interpretation (ui#3; ui.md §7 rule 5).

import { describe, expect, it } from "vitest";

import { ProvenanceList, type ProvenanceEntry } from "../src/components/ProvenanceList.js";
import { abbreviateDigest } from "../src/components/Digest.js";
import { expectNoA11yViolations, forEachColorScheme, renderInMode } from "../src/testing.js";

const WORLD = "sha256:be40f1c2d3e4a5b6978877665544332211ffeeddccbbaa99887766554433227d12";

const ENTRIES: ProvenanceEntry[] = [
  { label: "World", digest: WORLD },
  { label: "Code version", value: "0.5.0" },
  { label: "Held-out seeds", value: "0, 1, 2, 3" },
];

describe("what it renders", () => {
  it("pairs each label with what produced the number", () => {
    const { getByRole } = renderInMode(<ProvenanceList entries={ENTRIES} />, "light");

    const list = getByRole("group", { name: "Provenance" });
    expect(list).toHaveTextContent("Code version");
    expect(list).toHaveTextContent("0.5.0");
    expect(list).toHaveTextContent("Held-out seeds");
  });

  it("renders a content address as a Digest — abbreviated, expandable, copyable", () => {
    // An address pasted in as plain text is an address nobody can copy in full. Saying `digest`
    // rather than `value` is what makes that automatic instead of remembered.
    const { getByText, getByRole } = renderInMode(<ProvenanceList entries={ENTRIES} />, "light");
    expect(getByText(abbreviateDigest(WORLD))).toBeInTheDocument();
    expect(getByRole("button", { name: "Copy the full digest" })).toBeInTheDocument();
  });

  it("keeps the caller's order — most identifying first", () => {
    const { container } = renderInMode(<ProvenanceList entries={ENTRIES} />, "light");
    const terms = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(terms).toEqual(["World", "Code version", "Held-out seeds"]);
  });

  it("uses a description list, so the pairing is structural and not merely visual", () => {
    const { container } = renderInMode(<ProvenanceList entries={ENTRIES} />, "light");
    expect(container.querySelector("dl")).not.toBeNull();
    expect(container.querySelectorAll("dt")).toHaveLength(3);
    expect(container.querySelectorAll("dd")).toHaveLength(3);
  });
});

describe("an absent lineage", () => {
  it("is stated rather than omitted", () => {
    // A result with no recorded provenance rendering as nothing would let it pass for one that has
    // provenance — the same laundering RunnerBadge exists to prevent, one level up.
    const { getByText } = renderInMode(<ProvenanceList entries={[]} />, "light");
    expect(getByText("No provenance recorded")).toBeInTheDocument();
  });

  it("says why, when the caller knows why", () => {
    const { getByText } = renderInMode(
      <ProvenanceList
        entries={[]}
        emptyHint="This entry was scored on the in-line path and stores no reproducibility bundle."
      />,
      "light",
    );
    expect(getByText(/in-line path/)).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, populated and empty", async () => {
    await forEachColorScheme(<ProvenanceList entries={ENTRIES} />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
    await forEachColorScheme(<ProvenanceList entries={[]} />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });
});
