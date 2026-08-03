// The sizing Cesium's own stylesheet would have done (ui#7).
//
// Extracted from `GlobeScene`'s effect precisely so it can be tested: jsdom cannot run Cesium, so
// the component has no test, and the bug this fixes lived in three lines nothing could reach. What
// is asserted is the *structure* of the fix — every wrapper between the host and the canvas is told
// to fill — rather than a computed layout, because jsdom has neither layout nor paint and a test
// that read `clientHeight` here would assert 0 and pass forever.

import { describe, expect, it } from "vitest";

import { fillHost } from "./fillHost";

/** The shape Cesium builds inside the element it is handed. */
function cesiumLikeTree() {
  const host = document.createElement("div");
  const viewer = document.createElement("div");
  viewer.className = "cesium-viewer";
  const widgetContainer = document.createElement("div");
  widgetContainer.className = "cesium-viewer-cesiumWidgetContainer";
  const widget = document.createElement("div");
  widget.className = "cesium-widget";
  const canvas = document.createElement("canvas");

  widget.append(canvas);
  widgetContainer.append(widget);
  viewer.append(widgetContainer);
  host.append(viewer);
  document.body.append(host);

  return { host, viewer, widgetContainer, widget, canvas };
}

describe("fillHost", () => {
  it("sizes the canvas", () => {
    const { host, canvas } = cesiumLikeTree();
    fillHost(canvas, host);
    expect(canvas.style.width).toBe("100%");
    expect(canvas.style.height).toBe("100%");
    expect(canvas.style.display).toBe("block");
  });

  it("sizes every wrapper between the host and the canvas", () => {
    // The regression. Sizing only the canvas looks sufficient and is not: a percentage height
    // resolves against the parent, and an unstyled div is `height: auto`, so the canvas fell back
    // to its attribute height and drew outside its container.
    const { host, viewer, widgetContainer, widget, canvas } = cesiumLikeTree();
    fillHost(canvas, host);

    for (const wrapper of [viewer, widgetContainer, widget]) {
      expect(wrapper.style.height, wrapper.className).toBe("100%");
      expect(wrapper.style.width, wrapper.className).toBe("100%");
    }
  });

  it("clips the wrappers, because Cesium's overlays are positioned against them", () => {
    const { host, viewer, canvas } = cesiumLikeTree();
    fillHost(canvas, host);
    expect(viewer.style.overflow).toBe("hidden");
  });

  it("leaves the host alone — the caller owns its size", () => {
    const { host, canvas } = cesiumLikeTree();
    host.style.height = "420px";
    fillHost(canvas, host);
    expect(host.style.height).toBe("420px");
    expect(host.style.overflow).toBe("");
  });

  it("does nothing to ancestors when the canvas is not inside the host", () => {
    // Without the containment guard this walks to <html> and stretches the whole document — a much
    // worse failure than the one being fixed, and one that would only appear in whatever situation
    // broke the assumption.
    const { canvas } = cesiumLikeTree();
    const unrelated = document.createElement("div");
    document.body.append(unrelated);

    fillHost(canvas, unrelated);

    expect(document.documentElement.style.height).toBe("");
    expect(document.body.style.height).toBe("");
    expect(canvas.parentElement?.style.height).toBe("");
    // The canvas is still sized: the caller asked for that, and it is harmless.
    expect(canvas.style.height).toBe("100%");
  });

  it("is idempotent", () => {
    const { host, viewer, canvas } = cesiumLikeTree();
    fillHost(canvas, host);
    fillHost(canvas, host);
    expect(viewer.style.height).toBe("100%");
    expect(canvas.style.height).toBe("100%");
  });
});
