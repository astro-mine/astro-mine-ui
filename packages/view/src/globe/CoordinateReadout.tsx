/**
 * The cursor's position on the body, in the body-fixed frame, in SI units (view.md §2 principle 6).
 *
 * The frame name is rendered *before* a position is ever picked, and the numbers are converted with
 * View's own spherical `frames/` math against the world's CRS rather than Cesium's `Cartographic`
 * helpers. That is deliberate: `Cartographic` silently uses `Ellipsoid.default`, so reading it back
 * would prove nothing about which body we are on.
 */
import { useEffect, useState } from "react";
import type { CSSProperties, JSX } from "react";
import { ScreenSpaceEventHandler, ScreenSpaceEventType } from "cesium";
import type { Cartesian2 } from "cesium";

import { cartesianToGeodetic } from "../frames/coords";
import { formatCoordinate } from "../frames/units";
import type { Geodetic } from "../frames/types";
import { useGlobe } from "./context";
import { OVERLAY } from "../palette";

const NO_POSITION: Geodetic = {
  longitudeRad: Number.NaN,
  latitudeRad: Number.NaN,
  heightM: Number.NaN,
};

const base: CSSProperties = {
  position: "absolute",
  bottom: "0.5rem",
  // Anchored right, not left: Cesium pins its credit display to the bottom-left of the widget, and
  // the readout used to sit on top of it. Obscuring the attribution is a licensing problem, not a
  // cosmetic one.
  right: "0.5rem",
  padding: "0.25rem 0.6rem",
  borderRadius: 4,
  background: OVERLAY.readout.background,
  color: OVERLAY.readout.foreground,
  font: "0.75rem ui-monospace, SFMono-Regular, monospace",
  pointerEvents: "none",
  userSelect: "none",
};

export interface CoordinateReadoutProps {
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** A live body-fixed coordinate readout, e.g. `89.9012° S, 12.3456° E, +1234.5 m (MOON_ME)`. */
export function CoordinateReadout({ className, style }: CoordinateReadoutProps): JSX.Element {
  const { viewer, ellipsoid, crs } = useGlobe();
  const [geodetic, setGeodetic] = useState<Geodetic | null>(null);

  useEffect(() => {
    const handler = new ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
      if (viewer.isDestroyed()) return;
      const scene = viewer.scene;
      // Prefer the depth buffer so the cursor reads the *terrain* surface; fall back to the
      // reference sphere when no depth is available (or the cursor is off the body).
      const picked = scene.pickPositionSupported
        ? scene.pickPosition(movement.endPosition)
        : undefined;
      const position =
        picked ?? viewer.camera.pickEllipsoid(movement.endPosition, ellipsoid) ?? undefined;

      setGeodetic(
        position === undefined
          ? null
          : cartesianToGeodetic(crs, { xM: position.x, yM: position.y, zM: position.z }),
      );
    }, ScreenSpaceEventType.MOUSE_MOVE);

    return () => handler.destroy();
  }, [viewer, ellipsoid, crs]);

  return (
    <div
      className={className}
      style={{ ...base, ...style }}
      data-testid="globe-coordinates"
      data-frame={crs.body_fixed_frame}
    >
      {formatCoordinate(geodetic ?? NO_POSITION, crs)}
    </div>
  );
}
