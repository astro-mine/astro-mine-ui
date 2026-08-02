/**
 * The ←Worlds ingest seam: resolve a world bundle's `world.json` into everything the scene needs to
 * place its terrain on the body (view.md §6 ←Worlds; worlds.md §5).
 *
 * Worlds publishes a world bundle as a manifest plus a **3D Tiles 1.1** tileset (`tileset.json` +
 * `terrain.glb`, `RM-P0-WORLDS-07`). Two properties of that artifact shape this module:
 *
 * 1. It is a *3D Tiles tileset*, not quantized-mesh, so it loads as a `Cesium3DTileset` rather than
 *    a Cesium `TerrainProvider`.
 * 2. Since `RM-P1-WORLDS-16` the exporter **georeferences the patch itself**: `tileset.json` carries
 *    a `root.transform` (an east-north-up basis at the patch centroid, in the body-fixed frame), and
 *    the manifest carries the same anchoring as a `tiles_anchor` object for consumers that do not
 *    read 3D Tiles. We take the anchor from `tiles_anchor` and never re-derive it.
 *
 * Before that, the transform was identity and the centroid was discarded, so View reconstructed an
 * approximate anchor from `crs` + `grid` — with a sub-cell planimetric offset and no way at all to
 * recover the patch's mean elevation, which the mesh subtracts from every vertex (a ~680 m vertical
 * error). `tiles_anchor.origin.height_m` *is* that mean elevation, so `vertex_height + height_m`
 * recovers an absolute elevation. A manifest without it is rejected rather than mis-placed.
 */

import { requireCrs } from "../frames/guards";
import type { Geodetic, PlanetaryCRS, ReferenceFrame } from "../frames/types";

/** The affine grid geotransform Worlds writes: `x = a·col + b·row + c`, `y = d·col + e·row + f`. */
export type GridTransform = readonly [number, number, number, number, number, number];

/** The world bundle's raster grid, as published in `world.json`. */
export interface WorldGrid {
  readonly width: number;
  readonly height: number;
  readonly resolutionM: number;
  readonly transform: GridTransform;
}

/** Load a world by its Worlds-published bundle manifest (`world.json`). The normal path. */
export interface WorldManifestSource {
  readonly manifestUrl: string;
}

/** Load a tileset whose CRS the host already knows. The escape hatch for a non-bundle tileset. */
export interface WorldTilesetSource {
  readonly tilesetUrl: string;
  readonly crs: PlanetaryCRS;
  readonly origin: Geodetic;
  readonly worldId?: string;
}

export type WorldSource = WorldManifestSource | WorldTilesetSource;

/**
 * Where a tileset's local frame sits on the body — Worlds' `tiles_anchor` (`RM-P1-WORLDS-16`).
 *
 * `origin.heightM` is the patch mean elevation the exported mesh subtracts from every vertex, so it
 * is a real datum, not a convenience zero.
 */
export interface TileAnchor {
  /** The body-fixed frame the origin is expressed in. Must match the bundle's own CRS. */
  readonly frame: string;
  readonly origin: Geodetic;
}

/** A world resolved to the point where the scene can render it. */
export interface ResolvedWorld {
  readonly worldId: string;
  /** Content hash of the world bundle, when the source was a manifest. */
  readonly worldHash: string | null;
  readonly crs: PlanetaryCRS;
  readonly tilesetUrl: string;
  /**
   * Body-fixed position of the terrain patch's local frame origin — the tileset's own
   * `root.transform` expressed as a geodetic point. The scene uses it only to anchor a *legacy*
   * tileset whose `root.transform` is identity; a georeferenced tileset places itself.
   */
  readonly origin: Geodetic;
  /** The frame `origin` is expressed in — always the bundle CRS's body-fixed frame. */
  readonly originFrame: string;
  readonly grid: WorldGrid | null;
}

/** Raised when a world manifest is missing, malformed, or unfetchable. */
export class WorldSourceError extends Error {
  /** The underlying failure, when there was one. Declared here because the target predates ES2022. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WorldSourceError";
    this.cause = cause;
  }
}

const DEG = Math.PI / 180;

function isManifestSource(source: WorldSource): source is WorldManifestSource {
  return "manifestUrl" in source;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WorldSourceError(
      `world manifest field "${field}" must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function requireGrid(value: unknown): WorldGrid {
  if (value === null || typeof value !== "object") {
    throw new WorldSourceError('world manifest is missing its "grid" object');
  }
  const raw = value as Record<string, unknown>;
  const transform = raw.transform;
  if (!Array.isArray(transform) || transform.length !== 6) {
    throw new WorldSourceError('world manifest field "grid.transform" must be a 6-element affine');
  }
  const affine = transform.map((entry, index) => requireNumber(entry, `grid.transform[${index}]`));
  return {
    width: requireNumber(raw.width, "grid.width"),
    height: requireNumber(raw.height, "grid.height"),
    resolutionM: requireNumber(raw.resolution_m ?? raw.resolutionM, "grid.resolution_m"),
    transform: affine as unknown as GridTransform,
  };
}

/**
 * Read `tiles_anchor.frame`, which Worlds publishes in two shapes.
 *
 * Bundles up to 0.3.0 wrote a bare SPICE frame name (`"MOON_ME"`). From 0.4.0 the field is Core's
 * structured `ReferenceFrame` — RFC-0007 (units/frames/time on the wire) landing in the bundle, and
 * the bundle says so itself via `units_schema.tiles_anchor_frame`. Both are read here: the producer
 * moved, and a consumer that only understands the old shape rejects the very world the anchor
 * scenario pins.
 *
 * The structured form carries more than the name, and what it carries is checked rather than
 * ignored — an anchor that is not body-fixed, or is centred on another body, is a real mismatch and
 * guessing past it would place terrain on the wrong world.
 */
function requireAnchorFrameName(value: unknown, crs: PlanetaryCRS): string {
  if (typeof value === "string") {
    if (value.length === 0) {
      throw new WorldSourceError('world manifest field "tiles_anchor.frame" must be a frame name');
    }
    return value;
  }
  if (value === null || typeof value !== "object") {
    throw new WorldSourceError(
      'world manifest field "tiles_anchor.frame" must be a frame name or a ReferenceFrame object',
    );
  }
  const frame = value as Partial<ReferenceFrame>;
  if (typeof frame.name !== "string" || frame.name.length === 0) {
    throw new WorldSourceError(
      'world manifest field "tiles_anchor.frame.name" must be a frame name',
    );
  }
  if (frame.frame_class !== undefined && frame.frame_class !== "body_fixed") {
    throw new WorldSourceError(
      `world manifest anchors its tiles in a "${frame.frame_class}" frame, but a tileset anchor ` +
        "must be body-fixed — refusing to place terrain from a non-body-fixed frame",
    );
  }
  if (frame.center !== undefined && frame.center !== null && frame.center !== crs.body) {
    throw new WorldSourceError(
      `world manifest anchors its tiles in a frame centred on "${frame.center}", but its CRS body ` +
        `is "${crs.body}" — refusing to guess which body the terrain is on`,
    );
  }
  return frame.name;
}

/**
 * Read the manifest's `tiles_anchor` — the tileset's own georeferencing, published by Worlds.
 *
 * A bundle that predates `RM-P1-WORLDS-16` carries no anchor. We reject it rather than fall back to
 * reconstructing the origin from `crs` + `grid`: that reconstruction was wrong by the patch's
 * unpublished mean elevation (hundreds of metres vertically), and terrain silently placed hundreds
 * of metres off is worse than terrain that refuses to load and says why.
 */
export function requireTileAnchor(value: unknown, crs: PlanetaryCRS): TileAnchor {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new WorldSourceError(
      'world manifest has no "tiles_anchor"; it predates RM-P1-WORLDS-16 — regenerate the bundle ' +
        "with a Worlds that publishes the tileset-to-body transform",
    );
  }
  const raw = value as Record<string, unknown>;
  const frame = requireAnchorFrameName(raw.frame, crs);
  if (frame !== crs.body_fixed_frame) {
    throw new WorldSourceError(
      `world manifest anchors its tiles in frame "${frame}", but its CRS is body-fixed in ` +
        `"${crs.body_fixed_frame}" — refusing to guess which one the terrain is in`,
    );
  }
  if (raw.origin === null || typeof raw.origin !== "object") {
    throw new WorldSourceError('world manifest is missing its "tiles_anchor.origin" object');
  }
  const origin = raw.origin as Record<string, unknown>;

  return {
    frame,
    origin: {
      longitudeRad: requireNumber(origin.longitude_deg, "tiles_anchor.origin.longitude_deg") * DEG,
      latitudeRad: requireNumber(origin.latitude_deg, "tiles_anchor.origin.latitude_deg") * DEG,
      // Not a convenience zero: this is the patch mean elevation the mesh subtracts from every
      // vertex, so `vertex_height + heightM` is an absolute elevation.
      heightM: requireNumber(origin.height_m, "tiles_anchor.origin.height_m"),
    },
  };
}

async function fetchManifest(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new WorldSourceError(`could not fetch world manifest ${url}`, cause);
  }
  if (!response.ok) {
    throw new WorldSourceError(`world manifest ${url} returned HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new WorldSourceError(`world manifest ${url} is not valid JSON`, cause);
  }
}

/**
 * Resolve a `WorldSource` into a `ResolvedWorld`.
 *
 * A manifest with no CRS, or with an Earth CRS, is rejected here rather than rendered against
 * Cesium's WGS84 default (view.md §2 principle 6; conventions.md §5).
 */
export async function resolveWorld(
  source: WorldSource,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedWorld> {
  if (!isManifestSource(source)) {
    const crs = requireCrs(source.crs);
    return {
      worldId: source.worldId ?? "(host-supplied tileset)",
      worldHash: null,
      crs,
      tilesetUrl: source.tilesetUrl,
      origin: source.origin,
      originFrame: crs.body_fixed_frame,
      grid: null,
    };
  }

  const manifest = await fetchManifest(source.manifestUrl, fetchImpl);
  if (manifest === null || typeof manifest !== "object") {
    throw new WorldSourceError(`world manifest ${source.manifestUrl} is not a JSON object`);
  }
  const raw = manifest as Record<string, unknown>;

  const tiles = raw.tiles;
  if (typeof tiles !== "string" || tiles.length === 0) {
    throw new WorldSourceError(
      `world manifest ${source.manifestUrl} has no "tiles" entry; it publishes no terrain tileset`,
    );
  }

  const crs = requireCrs(raw.crs);
  const grid = requireGrid(raw.grid);
  const anchor = requireTileAnchor(raw.tiles_anchor, crs);

  return {
    worldId: typeof raw.world_id === "string" ? raw.world_id : "(unnamed world)",
    worldHash: typeof raw.world_hash === "string" ? raw.world_hash : null,
    crs,
    tilesetUrl: new URL(tiles, new URL(source.manifestUrl, globalThis.location?.href)).toString(),
    origin: anchor.origin,
    originFrame: anchor.frame,
    grid,
  };
}
