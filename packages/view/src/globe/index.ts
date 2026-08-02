/**
 * `globe/` — the CesiumJS scene: Worlds terrain (3D Tiles), and the entity layer that assets,
 * trajectories, and overlays attach to (RM-P1-VIEW-02).
 *
 * The only module in the library that imports Cesium. `frames/` stays pure so it can be used, and
 * tested, without a renderer.
 */

export { GlobeScene } from "./GlobeScene";
export type { GlobeSceneProps } from "./GlobeScene";

export { GlobeStatus } from "./GlobeStatus";
export type { GlobeStatusProps } from "./GlobeStatus";

export { CoordinateReadout } from "./CoordinateReadout";
export type { CoordinateReadoutProps } from "./CoordinateReadout";

export { EntityLayer } from "./EntityLayer";
export type { EntityLayerProps } from "./EntityLayer";

export { AssetModel, DEFAULT_MINIMUM_PIXEL_SIZE } from "./AssetModel";
export type { AssetModelProps } from "./AssetModel";

export { AssetPreview } from "./AssetPreview";
export type { AssetPreviewProps } from "./AssetPreview";

export { DEFAULT_MODEL_BUDGET, DEFAULT_MODEL_RANGE_M, SwarmLayer } from "./SwarmLayer";
export type { SwarmLayerProps, SwarmPlacement } from "./SwarmLayer";

export { ReplayLayer } from "./ReplayLayer";
export type { ReplayLayerProps } from "./ReplayLayer";

export { createAssetModel, poseToModelMatrix } from "./assetGeometry";
export type { AssetModelOptions } from "./assetGeometry";

export { useResolvedAsset, useResolvedAssets } from "./useAssetGeometry";
export type { ResolvedAssetState } from "./useAssetGeometry";

export {
  AssetSourceError,
  resolveAsset,
  resolveFrameOffset,
  selectVisualGltf,
} from "./assetSource";
export type {
  AssetDocumentSource,
  AssetGltfSource,
  AssetSource,
  GeometryFormat,
  GeometryRef,
  GeometryRole,
  ResolvedAsset,
} from "./assetSource";

export { useEntityLayer, useGlobe } from "./context";
export type { EntityLayerValue, GlobeContextValue } from "./context";

export { isComplete, isDegraded } from "./status";
export type { GlobeStatus as GlobeStatusValue, GlobeStatusKind } from "./status";

export { assertLunarRadiusAgreement, bodyEllipsoid, configureBodyEllipsoid } from "./ellipsoid";

export { applyBodyAppearance, BODY_BASE_COLOR } from "./appearance";

export { DEFAULT_STALE_AFTER_MS, useResolvedWorld, useWorldTerrain } from "./useWorldTerrain";
export type { WorldTerrainOptions } from "./useWorldTerrain";

export { requireTileAnchor, resolveWorld, WorldSourceError } from "./worldSource";
export type {
  GridTransform,
  ResolvedWorld,
  TileAnchor,
  WorldGrid,
  WorldManifestSource,
  WorldSource,
  WorldTilesetSource,
} from "./worldSource";
