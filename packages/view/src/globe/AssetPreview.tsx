/**
 * `<AssetPreview>` — one Fleet asset's geometry, framed, for a catalog or menu thumbnail.
 *
 * This is the "geometry preview" Studio's asset menu shows (RM-P1-FLEET-11 / astro-mine-fleet#22:
 * "a Hub-published asset appears in the menu with a geometry preview, with no Fleet code change").
 * Embeddable first (view.md §2 principle 4): a framed, self-contained component a host mounts many
 * of, with no globe of its own to configure.
 *
 * The model sits at the body centre with the reference sphere hidden, and the camera frames its
 * bounding sphere. Placing it at a surface pose instead would put the camera 1.7 Mm from the origin
 * to photograph a two-metre rover — all the float precision spent on coordinates nobody can see.
 * A preview is a picture of an asset, not a place on a body.
 */
import { useState } from "react";
import type { CSSProperties, JSX } from "react";
import type { Viewer } from "cesium";

import { AssetModel } from "./AssetModel";
import { EntityLayer } from "./EntityLayer";
import { GlobeScene } from "./GlobeScene";
import { GlobeStatus } from "./GlobeStatus";
import { INITIALIZING } from "./status";
import type { GlobeStatus as GlobeStatusValue } from "./status";
import type { AssetSource } from "./assetSource";
import type { PlanetaryCRS } from "../frames/types";

export interface AssetPreviewProps {
  /** The Fleet asset to preview — normally `{ documentUrl }` pointing at a SADF document. */
  readonly source: AssetSource;
  /** The body whose ellipsoid the scene is built on. Never WGS84 (view.md §2 principle 6). */
  readonly crs?: PlanetaryCRS;
  /** Show the geometry-load status chip. Degradation still happens either way. */
  readonly showStatus?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly onReady?: (viewer: Viewer) => void;
  readonly onStatusChange?: (status: GlobeStatusValue) => void;
  readonly fetchImpl?: typeof fetch;
}

const frame: CSSProperties = { position: "relative", width: "100%", height: "100%" };

export function AssetPreview({
  source,
  crs,
  showStatus = true,
  className,
  style,
  onReady,
  onStatusChange,
  fetchImpl,
}: AssetPreviewProps): JSX.Element {
  // The preview's status is the *asset's*, not the scene's: a scene with no terrain is "ready", which
  // says nothing about whether the rover arrived.
  const [status, setStatus] = useState<GlobeStatusValue>(INITIALIZING);

  return (
    <div
      className={className}
      style={{ ...frame, ...style }}
      data-testid="asset-preview"
      data-status={status.kind}
    >
      <GlobeScene
        crs={crs}
        showBody={false}
        showStatus={false}
        showCoordinates={false}
        onReady={onReady}
        style={frame}
      >
        <EntityLayer name="asset-preview">
          <AssetModel
            source={source}
            frameCamera
            fetchImpl={fetchImpl}
            onStatusChange={(next) => {
              setStatus(next);
              onStatusChange?.(next);
            }}
          />
        </EntityLayer>
      </GlobeScene>
      {showStatus && <GlobeStatus status={status} />}
    </div>
  );
}
