// Reading a manifest the reader picked (ui#11).
//
// **`FileReader`, not `File.text()`, and that is a testability decision rather than a stylistic
// one.** `File.prototype.text()` is the shorter call and jsdom does not implement it — so a page
// that uses it cannot be driven by the component suite at all, and the publish form's central
// acceptance criterion ("a malformed manifest renders a labelled error and the page survives") would
// have to be asserted by argument. ui#11 says so in as many words: *"The file is read with an API
// jsdom implements, so the test suite can drive it."*
//
// **Parsed defensively, because the input is a file a person chose.** The failure this guards is
// not exotic: picking the wrong file is the single most likely thing to go wrong on that form, and
// the outcome must be a labelled error rather than a blank pane or a thrown exception that takes
// the route's error boundary with it. Every failure below returns a *reason*, and none of them
// throws.

/** What came out of the file, or why nothing did. */
export type JsonFile =
  | { readonly status: "read"; readonly value: Record<string, unknown>; readonly name: string }
  | { readonly status: "failed"; readonly reason: string; readonly name: string };

/**
 * The largest manifest this will read.
 *
 * A Core plugin manifest is a few kilobytes. The limit is not a performance guard — it is what
 * stops a reader who picked a world bundle by mistake from freezing the tab while the browser
 * decodes half a gigabyte, and it fails with a sentence that names the actual mistake.
 */
const MAX_BYTES = 1024 * 1024;

/** Read and parse a JSON file, reporting every failure as a reason rather than an exception. */
export function readJsonFile(file: File): Promise<JsonFile> {
  const name = file.name;

  if (file.size > MAX_BYTES) {
    return Promise.resolve({
      status: "failed",
      name,
      reason:
        `\`${name}\` is ${Math.round(file.size / 1024)} KiB, and a Core plugin manifest is a few ` +
        `kilobytes. This is almost certainly the artifact rather than the manifest that describes ` +
        `it — publish indexes a manifest for bytes the registry already stores.`,
    });
  }

  return new Promise<JsonFile>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () =>
      resolve({
        status: "failed",
        name,
        reason: `\`${name}\` could not be read from disk.`,
      });

    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (cause) {
        resolve({
          status: "failed",
          name,
          reason: `\`${name}\` is not valid JSON: ${cause instanceof Error ? cause.message : "unparseable"}.`,
        });
        return;
      }

      // An array and `null` are both valid JSON and neither is a manifest. Caught here rather than
      // by the API, so the reader is told which file is wrong instead of reading a 422 about a
      // field name they never typed.
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        resolve({
          status: "failed",
          name,
          reason: `\`${name}\` is valid JSON but not a JSON object, so it is not a Core manifest.`,
        });
        return;
      }

      resolve({ status: "read", name, value: parsed as Record<string, unknown> });
    };

    reader.readAsText(file);
  });
}
