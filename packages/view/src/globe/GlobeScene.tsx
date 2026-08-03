/**
 * `<GlobeScene>` — the embeddable CesiumJS scene (RM-P1-VIEW-02).
 *
 * This is the widget Studio embeds for design-time inspection (studio.md §6) and the surface
 * RM-P1-VIEW-03/04 extend. It is:
 *
 * - **Read-mostly and command-free.** It renders; it originates no fleet command (view.md §2.1).
 * - **Embeddable first.** A framed component with a documented props/context contract, mountable
 *   standalone or many-at-once in a host. It sets no global styles and owns its `Viewer`'s whole
 *   lifecycle (view.md §2.4).
 * - **Explicit about frames and units.** Cesium's `Ellipsoid.default` is WGS84; the scene overrides
 *   it from the world's own `PlanetaryCRS` *before* the `Viewer` exists, and never re-derives a
 *   coordinate through an Earth default (view.md §2.6; conventions.md §5).
 * - **Degrade-don't-blank.** A missing manifest or an unreachable tileset yields a labelled bare
 *   body, not an empty canvas (view.md §2.5).
 *
 * `world` is deliberately **optional**: a scene with no terrain source is a legitimate body-only
 * scene, which is what an asset-geometry preview mounts (RM-P1-FLEET-11 / astro-mine-fleet#22).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, JSX } from "react";
import { EllipsoidTerrainProvider, Globe, Viewer } from "cesium";
import type { Ellipsoid } from "cesium";

import { LUNAR_SOUTH_POLAR_STEREOGRAPHIC, MOON } from "../frames/constants";
import type { PlanetaryCRS } from "../frames/types";
import { applyBodyAppearance } from "./appearance";
import { CoordinateReadout } from "./CoordinateReadout";
import { GlobeContext } from "./context";
import type { GlobeContextValue } from "./context";
import { GlobeStatus } from "./GlobeStatus";
import { assertLunarRadiusAgreement, configureBodyEllipsoid } from "./ellipsoid";
import { fillHost } from "./fillHost";
import { INITIALIZING } from "./status";
import type { GlobeStatus as GlobeStatusValue } from "./status";
import { useResolvedWorld, useWorldTerrain } from "./useWorldTerrain";
import type { WorldTerrainOptions } from "./useWorldTerrain";
import type { WorldSource } from "./worldSource";

export interface GlobeSceneProps extends WorldTerrainOptions {
  /**
   * The terrain to render — normally `{ manifestUrl }` pointing at a Worlds bundle's `world.json`.
   * Omit for a body-only scene (asset preview, empty stage).
   */
  readonly world?: WorldSource;
  /**
   * The body to render when `world` is absent or fails to resolve. Defaults to the charter's anchor
   * body, the Moon — an explicit planetary CRS, never an Earth fallback.
   */
  readonly crs?: PlanetaryCRS;
  /** Show the status chip. Turning it off does not turn off degradation — it hides the label. */
  readonly showStatus?: boolean;
  /** Show the live body-fixed coordinate readout. */
  readonly showCoordinates?: boolean;
  /**
   * Render the reference-sphere body at all. An asset-geometry preview wants the model against an
   * empty background, not standing on a Moon a thousand kilometres wide (RM-P1-VIEW-03).
   */
  readonly showBody?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Called once the `Viewer` exists. The escape hatch for host-specific Cesium configuration. */
  readonly onReady?: (viewer: Viewer) => void;
  /** Called on every status transition — a host may surface staleness in its own chrome. */
  readonly onStatusChange?: (status: GlobeStatusValue) => void;
  /** Injectable `fetch`, for tests and for hosts that proxy the manifest. */
  readonly fetchImpl?: typeof fetch;
  /** Rendered inside the scene's context — `<EntityLayer>` and friends. */
  readonly children?: ReactNode;
}

const frame: CSSProperties = { position: "relative", width: "100%", height: "100%" };
const canvasHost: CSSProperties = { width: "100%", height: "100%" };

/** Cesium's own widget chrome we never want: this scene is a picture, not a mission-control app. */
const BARE_VIEWER_OPTIONS = {
  baseLayer: false as const,
  skyBox: false as const,
  skyAtmosphere: false as const,
  baseLayerPicker: false,
  geocoder: false as const,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  infoBox: false,
  selectionIndicator: false,
};

export function GlobeScene({
  world: worldSource,
  crs: crsProp,
  showStatus = true,
  showCoordinates = true,
  showBody = true,
  className,
  style,
  onReady,
  onStatusChange,
  fetchImpl,
  children,
  staleAfterMs,
  hideBodyWithTerrain,
}: GlobeSceneProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<{ viewer: Viewer; ellipsoid: Ellipsoid } | null>(null);

  const { world, error, pending } = useResolvedWorld(worldSource, fetchImpl);

  // The world's own CRS wins; the `crs` prop is the fallback for a body-only or failed scene.
  const crs = world?.crs ?? crsProp ?? LUNAR_SOUTH_POLAR_STEREOGRAPHIC;
  const crsKey = useMemo(() => JSON.stringify(crs), [crs]);

  // The Viewer is built only once the CRS is settled: Cesium captures the ellipsoid at construction
  // and there is no supported way to swap it afterwards.
  useEffect(() => {
    const host = hostRef.current;
    if (pending || host === null) return;

    if (crs.body === MOON) assertLunarRadiusAgreement();
    const ellipsoid = configureBodyEllipsoid(crs);

    const viewer = new Viewer(host, {
      ...BARE_VIEWER_OPTIONS,
      globe: new Globe(ellipsoid),
      terrainProvider: new EllipsoidTerrainProvider({ ellipsoid }),
    });

    // Cesium sizes its canvas — AND the three elements it nests that canvas inside — from
    // `widgets.css`, which a library must not inject globally. Sizing only the canvas was not
    // enough: a percentage height resolves against the parent, and those wrappers are `height:
    // auto` with no stylesheet, so the canvas fell back to its attribute height and the globe
    // overflowed its container. See `fillHost` for why that stayed invisible until `ui#7`.
    fillHost(viewer.canvas, host);
    // The canvas has just changed size. Cesium's render loop notices on its own, but only on the
    // next tick, and the first frame is the one a reader sees.
    viewer.resize();

    applyBodyAppearance(viewer.scene.globe);

    setScene({ viewer, ellipsoid });
    onReady?.(viewer);

    return () => {
      setScene(null);
      if (!viewer.isDestroyed()) viewer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- crsKey is the value-identity of crs; the Viewer is built once by design and onReady is an escape hatch, not an input.
  }, [pending, crsKey]);

  const terrainStatus = useWorldTerrain(scene?.viewer ?? null, world, scene?.ellipsoid ?? null, {
    staleAfterMs,
    hideBodyWithTerrain,
  });

  // A body-less stage. Only meaningful without a terrain source — `useWorldTerrain` owns the globe's
  // visibility once a tileset is on screen, and it re-shows the body when terrain degrades.
  useEffect(() => {
    if (scene === null) return;
    // Cesium's scene graph is mutable by design and owns its own rendering; `globe.show` is a
    // setter on a live object, not a value this component holds. The rule sees a mutation of
    // something reached from state and cannot see that the something is a WebGL scene.
    // eslint-disable-next-line react-hooks/immutability -- see the note above.
    scene.viewer.scene.globe.show = showBody;
  }, [scene, showBody]);

  const status = useMemo<GlobeStatusValue>(() => {
    if (pending) return INITIALIZING;
    if (error !== null) {
      return {
        kind: "unavailable",
        detail: `Terrain unavailable (${error.message}) — showing the bare body.`,
      };
    }
    if (worldSource === undefined) {
      return { kind: "ready", detail: `${crs.body} — no terrain source` };
    }
    return terrainStatus;
  }, [pending, error, worldSource, crs.body, terrainStatus]);

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  const context = useMemo<GlobeContextValue | null>(
    () => (scene === null ? null : { ...scene, crs, world, status }),
    [scene, crs, world, status],
  );

  return (
    <div
      className={className}
      style={{ ...frame, ...style }}
      data-testid="globe-scene"
      data-status={status.kind}
      data-body={crs.body}
      data-world-id={world?.worldId ?? ""}
    >
      <div ref={hostRef} style={canvasHost} />
      {showStatus && <GlobeStatus status={status} />}
      {context !== null && (
        <GlobeContext.Provider value={context}>
          {showCoordinates && <CoordinateReadout />}
          {children}
        </GlobeContext.Provider>
      )}
    </div>
  );
}
