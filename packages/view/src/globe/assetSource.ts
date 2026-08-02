/**
 * The ←Fleet ingest seam: resolve a Fleet SADF asset document into the one renderable mesh, in the
 * one frame, that the scene can draw (view.md §3, §6; fleet.md §5).
 *
 * `view.md` §6 has no `←Fleet` arrow — Fleet claims View as its glTF consumer (`fleet.md` §5, and
 * `conventions.md` §3: "USD (preferred for Sim) and glTF (web/View)") but View's integration table
 * never specs the path. This module is that seam.
 *
 * Three properties of a SADF asset shape it:
 *
 * 1. **Geometry is never embedded.** `asset.geometry` is a list of Core `GeometryRef`s naming
 *    external URIs, resolved relative to the document.
 * 2. **glTF, not USD.** Cesium loads glTF/glb natively and does not load USD in a browser. Fleet
 *    ships both (`fleet.md` §11), so View reads the glTF and any USD is converted upstream by
 *    Fleet's `exporters/`. An asset with only USD geometry is a loud error, not a silent blank.
 * 3. **Geometry is declared in a frame, not at the root.** `GeometryRef.frame` names a `Frame` in
 *    the asset's frame tree; placing the mesh means walking that frame's `transform` chain up to
 *    `asset.root_frame` and composing the result with the pose the host supplied.
 *
 * Nothing here imports Cesium: `AssetModel` turns a `ResolvedAsset` into a primitive.
 */

import { composePose, IDENTITY_POSE } from "../frames/pose";
import type { Pose } from "../frames/pose";

/** Core's `GeometryRole` (`astro_mine.core.sadf.enums.GeometryRole`). */
export type GeometryRole = "visual" | "collision";
/** Core's `GeometryFormat`. `gltf` covers `.gltf` and `.glb` alike — the extension lives in `uri`. */
export type GeometryFormat = "usd" | "gltf";

/** Core's `GeometryRef`. `lod` is a *render* level of detail — 0 is the highest, not a fidelity tier. */
export interface GeometryRef {
  readonly role: GeometryRole;
  readonly format: GeometryFormat;
  readonly uri: string;
  readonly frame: string;
  readonly lod: number;
}

/** Load an asset by its Fleet-published SADF document. The normal path. */
export interface AssetDocumentSource {
  readonly documentUrl: string;
  /** Prefer this render LOD when the asset declares several. Defaults to the highest detail. */
  readonly lod?: number;
}

/** Load a bare glTF whose provenance the host already knows. The escape hatch. */
export interface AssetGltfSource {
  readonly gltfUrl: string;
  readonly assetId?: string;
}

export type AssetSource = AssetDocumentSource | AssetGltfSource;

/** An asset resolved to the point where the scene can render it. */
export interface ResolvedAsset {
  /** SADF `identity.id` — stable across versions. */
  readonly assetId: string;
  /** SADF `identity.name`, for a menu label. */
  readonly name: string;
  /** SADF `identity.kind`. A free, Fleet-namespaced string — never switch on a closed set. */
  readonly kind: string;
  readonly version: string;
  /** Absolute URL of the visual glTF/glb to load. */
  readonly gltfUrl: string;
  /** The chosen ref's render LOD. */
  readonly lod: number;
  /**
   * The mesh's pose in the asset's `root_frame`, resolved through the SADF frame tree. Identity when
   * the geometry is declared directly in the root frame, which is the common case.
   */
  readonly geometryOffset: Pose;
}

/** Raised when a SADF document is missing, malformed, or declares nothing View can render. */
export class AssetSourceError extends Error {
  /** The underlying failure, when there was one. Declared here because the target predates ES2022. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AssetSourceError";
    this.cause = cause;
  }
}

function isDocumentSource(source: AssetSource): source is AssetDocumentSource {
  return "documentUrl" in source;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AssetSourceError(
      `SADF field "${field}" must be a non-empty string, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AssetSourceError(
      `SADF field "${field}" must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function requireGeometry(value: unknown): readonly GeometryRef[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AssetSourceError('SADF asset declares no "geometry" — there is nothing to render');
  }
  return value.map((entry, index) => {
    if (entry === null || typeof entry !== "object") {
      throw new AssetSourceError(`SADF field "geometry[${index}]" must be an object`);
    }
    const raw = entry as Record<string, unknown>;
    const role = raw.role;
    const format = raw.format;
    if (role !== "visual" && role !== "collision") {
      throw new AssetSourceError(`SADF field "geometry[${index}].role" is not a GeometryRole`);
    }
    if (format !== "usd" && format !== "gltf") {
      throw new AssetSourceError(`SADF field "geometry[${index}].format" is not a GeometryFormat`);
    }
    return {
      role,
      format,
      uri: requireString(raw.uri, `geometry[${index}].uri`),
      frame: requireString(raw.frame, `geometry[${index}].frame`),
      // `lod` is optional in the schema and defaults to the highest detail.
      lod: raw.lod === undefined ? 0 : requireNumber(raw.lod, `geometry[${index}].lod`),
    };
  });
}

/**
 * Choose the one mesh a browser can draw: `role: visual`, `format: gltf`.
 *
 * With no `lod` preference the highest-detail ref (lowest `lod`) wins. With one, the closest ref at
 * or below that detail budget wins, so a distant asset can ask for a coarser mesh without an asset
 * that publishes only `lod: 0` failing to render.
 */
export function selectVisualGltf(geometry: readonly GeometryRef[], lod?: number): GeometryRef {
  const visual = geometry.filter((ref) => ref.role === "visual" && ref.format === "gltf");
  if (visual.length === 0) {
    const declared = geometry.map((ref) => `${ref.role}/${ref.format}`).join(", ");
    throw new AssetSourceError(
      `SADF asset declares no visual glTF geometry (has: ${declared}). Cesium does not load USD ` +
        "in a browser — Fleet's exporters must publish a glTF alongside it",
    );
  }
  const sorted = [...visual].sort((a, b) => a.lod - b.lod);
  if (lod === undefined) return sorted[0];
  const affordable = sorted.filter((ref) => ref.lod <= lod);
  return affordable.length === 0 ? sorted[0] : affordable[affordable.length - 1];
}

/** SADF `Transform` as it appears on the wire: snake_case, scalar-last quaternion, SI metres. */
function readTransform(value: unknown, field: string): Pose {
  if (value === null || value === undefined) return IDENTITY_POSE;
  if (typeof value !== "object") {
    throw new AssetSourceError(`SADF field "${field}" must be a Transform object`);
  }
  const raw = value as Record<string, unknown>;
  const t = (raw.translation_m ?? {}) as Record<string, unknown>;
  const q = (raw.rotation_quat_xyzw ?? {}) as Record<string, unknown>;
  return {
    translationM: {
      xM: requireNumber(t.x, `${field}.translation_m.x`),
      yM: requireNumber(t.y, `${field}.translation_m.y`),
      zM: requireNumber(t.z, `${field}.translation_m.z`),
    },
    rotationQuatXyzw: {
      x: requireNumber(q.x, `${field}.rotation_quat_xyzw.x`),
      y: requireNumber(q.y, `${field}.rotation_quat_xyzw.y`),
      z: requireNumber(q.z, `${field}.rotation_quat_xyzw.z`),
      w: requireNumber(q.w, `${field}.rotation_quat_xyzw.w`),
    },
  };
}

/**
 * The pose of `frameName` in `rootFrame`, walking the SADF frame tree's parent chain.
 *
 * A `Frame` with no `transform` is coincident with its parent. A frame that names a missing parent,
 * or that sits in a cycle, is a malformed asset and is reported as one — a mesh silently drawn at
 * the wrong place on a rover is worse than an asset that refuses to load.
 */
export function resolveFrameOffset(
  frames: readonly unknown[],
  rootFrame: string,
  frameName: string,
): Pose {
  const byName = new Map<string, Record<string, unknown>>();
  frames.forEach((frame, index) => {
    if (frame === null || typeof frame !== "object") {
      throw new AssetSourceError(`SADF field "frames[${index}]" must be an object`);
    }
    const raw = frame as Record<string, unknown>;
    byName.set(requireString(raw.name, `frames[${index}].name`), raw);
  });

  // Walk child -> root, collecting each frame's pose in its parent.
  const chain: Pose[] = [];
  const seen = new Set<string>();
  let current = frameName;
  while (current !== rootFrame) {
    if (seen.has(current)) {
      throw new AssetSourceError(`SADF frame tree has a cycle through "${current}"`);
    }
    seen.add(current);

    const frame = byName.get(current);
    if (frame === undefined) {
      throw new AssetSourceError(
        `SADF geometry is declared in frame "${current}", which the asset does not define`,
      );
    }
    chain.push(readTransform(frame.transform, `frames["${current}"].transform`));

    const parent = frame.parent;
    if (typeof parent !== "string" || parent.length === 0) {
      throw new AssetSourceError(
        `SADF frame "${current}" has no parent, so it never reaches the root frame ` +
          `"${rootFrame}" — the asset's frame tree is disconnected`,
      );
    }
    current = parent;
  }

  // Compose root-most first: T_root_from_geometry = T_root_from_p1 ∘ … ∘ T_pn_from_geometry.
  return chain.reduceRight((accumulated, link) => composePose(accumulated, link), IDENTITY_POSE);
}

async function fetchDocument(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new AssetSourceError(`could not fetch SADF asset ${url}`, cause);
  }
  if (!response.ok) {
    throw new AssetSourceError(`SADF asset ${url} returned HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new AssetSourceError(`SADF asset ${url} is not valid JSON`, cause);
  }
}

/** Resolve an `AssetSource` into a `ResolvedAsset`. */
export async function resolveAsset(
  source: AssetSource,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedAsset> {
  if (!isDocumentSource(source)) {
    return {
      assetId: source.assetId ?? "(host-supplied geometry)",
      name: source.assetId ?? "(host-supplied geometry)",
      kind: "unknown",
      version: "0.0.0",
      gltfUrl: source.gltfUrl,
      lod: 0,
      geometryOffset: IDENTITY_POSE,
    };
  }

  const document = await fetchDocument(source.documentUrl, fetchImpl);
  if (document === null || typeof document !== "object") {
    throw new AssetSourceError(`SADF asset ${source.documentUrl} is not a JSON object`);
  }
  const asset = (document as Record<string, unknown>).asset;
  if (asset === null || typeof asset !== "object") {
    throw new AssetSourceError(
      `SADF document ${source.documentUrl} has no "asset" — it is not a SADF document`,
    );
  }
  const raw = asset as Record<string, unknown>;

  const identity = (raw.identity ?? {}) as Record<string, unknown>;
  const rootFrame = requireString(raw.root_frame, "root_frame");
  const ref = selectVisualGltf(requireGeometry(raw.geometry), source.lod);
  const frames = Array.isArray(raw.frames) ? raw.frames : [];

  return {
    assetId: requireString(identity.id, "identity.id"),
    name: requireString(identity.name, "identity.name"),
    kind: requireString(identity.kind, "identity.kind"),
    version: requireString(identity.version, "identity.version"),
    gltfUrl: new URL(ref.uri, new URL(source.documentUrl, globalThis.location?.href)).toString(),
    lod: ref.lod,
    geometryOffset: resolveFrameOffset(frames, rootFrame, ref.frame),
  };
}
