// The shared accessibility assertion for component tests (ui#3; ui.md §7 rule 7, conventions.md §11).
//
// "Accessibility is a build gate, not an aspiration." Kept in one helper so every component asserts
// it the same way and none quietly skips it — a per-test hand-rolled axe call is a per-test
// opportunity to disable a rule and forget.
//
// **axe-core directly, not a matcher wrapper.** The assertion is "no violations, and name them if
// there are"; a wrapper would add a dependency, a peer range to keep in step with Vitest, and a
// custom matcher, to save the six lines below.
//
// **`color-contrast` is disabled here on purpose, and it is not a gap.** The rule samples rendered
// pixels, and jsdom has no layout or paint engine — it cannot run, and enabling it produces
// "incomplete" noise rather than findings. Contrast is gated authoritatively by
// `tests/contrast.test.ts`, which measures the theme's declared pairings in both schemes. Deleting
// that file is what would create the gap.

import axe from "axe-core";
import { expect } from "vitest";

/**
 * Run axe over an already-rendered container and assert it is clean.
 *
 * Takes a container rather than an element so the caller controls how it was rendered — every
 * component in this kit is asserted in **both** colour schemes, which means rendering twice.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  const described = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.html}`).join("\n"),
  );

  expect(described.join("\n"), `${results.violations.length} accessibility violation(s)`).toBe("");
}
