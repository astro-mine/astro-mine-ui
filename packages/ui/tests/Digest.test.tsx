// The digest is the identity (ui#3; ui.md §7 rule 4).

import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Digest, abbreviateDigest } from "../src/components/Digest.js";
import { expectNoA11yViolations } from "./a11y.js";
import { forEachColorScheme, renderInMode } from "./render.js";

const FULL = "sha256:be40f1c2d3e4a5b6978877665544332211ffeeddccbbaa99887766554433227d12";

describe("abbreviateDigest", () => {
  it("keeps the algorithm, which is part of the identity", () => {
    // `sha256:` and `sha512:` are different address spaces. Hiding which is in play would make two
    // unrelated addresses look comparable.
    expect(abbreviateDigest(FULL)).toMatch(/^sha256:/);
  });

  it("keeps a head and a tail — the tail is how similar addresses are told apart", () => {
    expect(abbreviateDigest(FULL)).toBe("sha256:be40f1c2…227d12");
    expect(abbreviateDigest(FULL).length).toBeLessThan(FULL.length);
  });

  it("leaves a value alone when abbreviating would not shorten it", () => {
    // An ellipsis that hides nothing is a lie about there being more.
    expect(abbreviateDigest("sha256:abc123")).toBe("sha256:abc123");
    expect(abbreviateDigest("short")).toBe("short");
  });

  it("handles an address with no algorithm prefix", () => {
    const bare = "be40f1c2d3e4a5b6978877665544332211ffeeddccbbaa9988776655443322";
    expect(abbreviateDigest(bare)).toBe("be40f1c2…443322");
  });
});

describe("the rendered address", () => {
  it("is abbreviated by default, because a full address does not fit a table row", () => {
    const { getByText, queryByText } = renderInMode(<Digest value={FULL} />, "light");
    expect(getByText(abbreviateDigest(FULL))).toBeInTheDocument();
    expect(queryByText(FULL)).toBeNull();
  });

  it("expands to the full value — an abbreviation is not an identity", async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = renderInMode(<Digest value={FULL} />, "light");

    const toggle = getByRole("button", { name: "Show the full digest" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(getByText(FULL)).toBeInTheDocument();
    expect(getByRole("button", { name: "Show the abbreviated digest" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("offers no expand control when there is nothing hidden", () => {
    const { queryByRole } = renderInMode(<Digest value="sha256:abc123" />, "light");
    expect(queryByRole("button", { name: /Show the (full|abbreviated) digest/ })).toBeNull();
  });

  it("names what it identifies, when the caller says", () => {
    const { getByText } = renderInMode(<Digest value={FULL} label="World" />, "light");
    expect(getByText("World")).toBeInTheDocument();
  });
});

describe("copying", () => {
  it("copies the FULL address even while showing the abbreviation", async () => {
    // Copying what is displayed would hand someone a string that looks like a digest and resolves
    // to nothing. What is copied is the identity, always.
    const user = userEvent.setup();
    const { getByRole } = renderInMode(<Digest value={FULL} />, "light");

    await user.click(getByRole("button", { name: "Copy the full digest" }));

    expect(await navigator.clipboard.readText()).toBe(FULL);
  });

  it("confirms the copy in a live region, not only in pixels", async () => {
    // A copy button with no feedback leaves a reader pressing it twice to find out whether it
    // worked — and a visual-only confirmation leaves a screen-reader user unable to find out at all.
    const user = userEvent.setup();
    const { getByRole, findByText } = renderInMode(<Digest value={FULL} />, "light");

    await user.click(getByRole("button", { name: "Copy the full digest" }));

    expect(await findByText("Digest copied")).toBeInTheDocument();
  });

  it("does not throw where the clipboard API is unavailable", async () => {
    // `navigator.clipboard` is absent on insecure origins, and a page served over plain HTTP inside
    // a lab network is a real deployment of this application. Copy failing quietly is acceptable;
    // the page throwing is not.
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    try {
      const { getByRole } = renderInMode(<Digest value={FULL} />, "light");
      const button = getByRole("button", { name: "Copy the full digest" });
      expect(() => button.click()).not.toThrow();
    } finally {
      if (original !== undefined)
        Object.defineProperty(globalThis.navigator, "clipboard", original);
    }
  });
});

describe("accessibility", () => {
  it("is axe-clean in both colour schemes, abbreviated and expanded", async () => {
    await forEachColorScheme(<Digest value={FULL} label="World" />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
    await forEachColorScheme(<Digest value={FULL} defaultExpanded />, async ({ container }) => {
      await expectNoA11yViolations(container);
    });
  });
});
