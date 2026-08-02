// jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) for every test file.
//
// Carried over from the repository this package came from. `@testing-library/jest-dom/vitest` is the
// import the rest of this workspace uses; the bare specifier this package shipped with registers the
// matchers against the global `expect`, which is what `globals: true` provides here.
import "@testing-library/jest-dom/vitest";
