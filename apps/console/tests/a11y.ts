// The shared accessibility assertion for the application's component tests (ui#5; ui.md §7 rule 7).
//
// The same helper `packages/ui/tests/a11y.ts` carries, duplicated for the same reason `render.tsx`
// is: a package's tests are not part of its published surface. `ui#8` owns the consolidation, along
// with the route-level lane that runs axe over the built export rather than over a jsdom tree.
//
// **`color-contrast` is disabled here on purpose, and it is not a gap.** The rule samples rendered
// pixels and jsdom has no layout or paint engine — it cannot run, and enabling it produces
// "incomplete" noise rather than findings. Contrast is gated authoritatively by
// `packages/ui/tests/contrast.test.ts`, which measures the theme's declared pairings in both
// schemes.

import axe from "axe-core";
import { expect } from "vitest";

/** Run axe over an already-rendered container and assert it is clean. */
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
