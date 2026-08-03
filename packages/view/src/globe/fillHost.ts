/**
 * Make Cesium's widget fill the element it was mounted into.
 *
 * **`@astro-mine/view` imports no CSS** — a library must not inject global styles, and the package
 * says so where `GlobeScene` sizes its own canvas. The consequence is that `widgets.css` never
 * reaches the browser, and that stylesheet is what normally sizes the **four** nested elements
 * Cesium builds inside its host:
 *
 * ```
 * .cesium-viewer                        width/height 100%, overflow hidden
 * .cesium-viewer-cesiumWidgetContainer  width/height 100%
 * .cesium-widget                        width/height 100%
 * .cesium-widget canvas                 width/height 100%
 * ```
 *
 * Only the canvas was being sized, which looks sufficient and is not. **A percentage height
 * resolves against the parent's height, and an unstyled `div` is `height: auto`** — so
 * `height: 100%` on the canvas had nothing to resolve against and fell back to the canvas's own
 * attribute height, whatever size Cesium had picked. The globe then overflowed its container.
 *
 * That went unnoticed because of where it was first mounted: on a page whose globe is the **last**
 * element, the overflow lands in empty space and reads as "a big globe". Put any content after it —
 * an inspector panel gallery, say — and the globe is drawn on top of it. `ui#7` is where that
 * happened.
 *
 * Walking the DOM rather than naming Cesium's class names on purpose: the wrappers are Cesium's
 * private structure, and a selector list would go silently stale the first time it changed, in
 * exactly the invisible way this defect already demonstrated.
 */
export function fillHost(canvas: HTMLCanvasElement, host: HTMLElement): void {
  // Not a paranoia guard. Without it, a canvas that is *not* inside `host` walks the loop all the
  // way to `<html>` and stretches the entire document — a far worse failure than the one being
  // fixed, arriving only in whatever situation broke the assumption.
  if (host.contains(canvas)) {
    for (
      let element = canvas.parentElement;
      element !== null && element !== host;
      element = element.parentElement
    ) {
      element.style.width = "100%";
      element.style.height = "100%";
      // Cesium's credit overlay, toolbar and lightbox are positioned absolutely against the viewer
      // root. `widgets.css` clips them there; with no stylesheet, nothing does.
      element.style.overflow = "hidden";
    }
  }

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
}
