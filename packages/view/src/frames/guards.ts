/**
 * Fail-loud frame/CRS guards — View's implementation of Core's frame/CRS validation rules
 * (`require_frame` / `require_crs`; conventions.md §5, RFC-0007 Design §3).
 *
 * The *types* these guards produce are generated from Core's `units.schema.json` (see `types.ts`).
 * The guard *rules* are the two contracts JSON Schema cannot express, so View implements them here
 * and pins them to Core's shared `conformance.json` vectors, run in View's CI (`conformance.test.ts`).
 * That vector run — not a hand-written copy of the rules — is what keeps View in lock-step with
 * Core's Python reference implementation instead of drifting from it (RFC-0007 §Motivation 3).
 *
 * View is a viewer, so its boundary is *ingest*: a world manifest, or a host's props. Spatial data
 * arriving without an explicit frame or CRS is refused here rather than silently rendered against
 * Cesium's default WGS84 ellipsoid — the failure mode this guard exists to prevent (view.md §2
 * principle 6; conventions.md §5).
 *
 * **Ingest affordance (AC4).** The ingested JSON is Core's snake_case (`world.json` is a
 * `PlanetaryCRS.model_dump()`), so snake_case is canonical here. The guards ALSO read View's
 * historical camelCase field names (`frameClass`, `referenceRadiusM`, `bodyFixedFrame`) as a
 * deliberate, documented backward-compatibility affordance for a host that still hands View props in
 * the old shape — not a second vocabulary. It can be dropped once every producer is schema-pinned.
 */

import { EARTH } from "./constants";
import type { FrameClass, PlanetaryCRS, ReferenceFrame } from "./types";
import { FrameClass as FrameClassEnum } from "./types";

/** Raised when a frame or CRS fails validation at View's ingest boundary. */
export class FramesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FramesValidationError";
  }
}

const FRAME_CLASSES: readonly string[] = Object.values(FrameClassEnum);

/**
 * Earth CRS identifiers that must never reach a planetary scene. Cesium defaults to WGS84, so an
 * Earth-shaped CRS slipping through would render *plausibly* and wrongly — the exact
 * "silently defaulted" outcome conventions.md §5 forbids.
 */
const EARTH_CRS_MARKERS: readonly string[] = ["wgs84", "wgs 84", "epsg:4326", "urn:ogc:def:crs:og"];

function requireToken(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    /\s/.test(value)
  ) {
    throw new FramesValidationError(
      `${field} must be a non-empty, whitespace-free token, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function optionalToken(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : requireToken(value, field);
}

/** Validate an explicit reference frame. Rejects null/missing — there is no implicit frame. */
export function requireFrame(value: unknown): ReferenceFrame {
  if (value === null || value === undefined) {
    throw new FramesValidationError(
      "a reference frame is required; none was given (no implicit Earth/WGS84 frame)",
    );
  }
  if (typeof value !== "object") {
    throw new FramesValidationError(
      `invalid reference frame: expected an object, got ${typeof value}`,
    );
  }
  const raw = value as Record<string, unknown>;
  const frameClass = raw.frame_class ?? raw.frameClass;
  if (typeof frameClass !== "string" || !FRAME_CLASSES.includes(frameClass)) {
    throw new FramesValidationError(
      `invalid frame_class ${JSON.stringify(frameClass)}; expected one of ${FRAME_CLASSES.join(", ")}`,
    );
  }
  return {
    name: requireToken(raw.name, "frame name"),
    frame_class: frameClass as FrameClass,
    center: optionalToken(raw.center, "frame center"),
  };
}

/**
 * Validate a planetary CRS against **Core's** waist rules (conventions.md §5 rules 4 & 6; RFC-0007
 * Design §3): presence, token `body` / `body_fixed_frame`, a finite positive `reference_radius_m`,
 * and the Earth-CRS **consistency** rule — an Earth datum/projection marker (`WGS84`, `EPSG:4326`,
 * `urn:ogc:def:crs:OGC`) is a defaulting bug ONLY when `body` is not `EARTH`. `body="EARTH"` + a
 * WGS84 marker is **valid at the waist** (Phase-2 Earth-analog deployments need it expressible).
 *
 * This is the function View runs Core's shared `conformance.json` vectors against. View's own ingest
 * guard `requireCrs` layers a stricter, component-local refusal on top (see below).
 */
export function validateCrsAtWaist(value: unknown): PlanetaryCRS {
  if (value === null || value === undefined) {
    throw new FramesValidationError(
      "a planetary CRS is required; none was given (no implicit Earth/WGS84 CRS)",
    );
  }
  if (typeof value !== "object") {
    throw new FramesValidationError(
      `invalid planetary CRS: expected an object, got ${typeof value}`,
    );
  }
  const raw = value as Record<string, unknown>;

  const radius = raw.reference_radius_m ?? raw.referenceRadiusM;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0) {
    throw new FramesValidationError(
      `reference_radius_m must be a positive, finite number, got ${JSON.stringify(radius)}`,
    );
  }

  const body = requireToken(raw.body, "CRS body");
  const bodyFixedFrame = requireToken(
    raw.body_fixed_frame ?? raw.bodyFixedFrame,
    "CRS body_fixed_frame",
  );
  const projection = optionalRawString(raw.projection);
  const datum = optionalRawString(raw.datum);

  // Core rule 6 (consistency, not a ban): an Earth marker on a non-Earth body can only be a
  // defaulting bug. On body EARTH it is legitimate and left to a component's own policy.
  if (body !== EARTH) {
    for (const [field, text] of [
      ["projection", projection],
      ["datum", datum],
    ] as const) {
      if (text !== null && isEarthCrs(text)) {
        throw new FramesValidationError(
          `${field} names an Earth CRS (${JSON.stringify(text)}) but body is ${JSON.stringify(body)}, ` +
            "not EARTH — that combination can only be a defaulting bug (conventions.md §5 rule 6)",
        );
      }
    }
  }

  return {
    body,
    body_fixed_frame: bodyFixedFrame,
    reference_radius_m: radius,
    projection,
    datum,
  };
}

/**
 * View's ingest guard for a planetary CRS: Core's waist rules (`validateCrsAtWaist`) **plus** View's
 * component-local policy — View renders planetary bodies only, so it refuses *any* Earth CRS
 * outright, even the `body="EARTH"` one Core accepts. Rejecting it here, with a distinct error, is
 * the difference between a lunar scene and an Earth scene wearing lunar terrain (view.md §2 principle
 * 6; conventions.md §5). This extra refusal is View's, not Core's: the shared vectors assert only the
 * Core rule (RFC-0007 Design §3 rule 6) and it is tested separately (`conformance.test.ts`).
 */
export function requireCrs(value: unknown): PlanetaryCRS {
  const crs = validateCrsAtWaist(value);
  for (const [field, text] of [
    ["projection", crs.projection],
    ["datum", crs.datum],
  ] as const) {
    if (text != null && isEarthCrs(text)) {
      throw new FramesValidationError(
        `${field} names an Earth CRS (${JSON.stringify(text)}); View renders planetary bodies only ` +
          "(no implicit Earth/WGS84 — conventions.md §5)",
      );
    }
  }
  return crs;
}

function optionalRawString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new FramesValidationError(`expected a string or null, got ${typeof value}`);
  }
  return value;
}

/** Whether a PROJ/WKT/EPSG string names an Earth CRS. */
export function isEarthCrs(text: string): boolean {
  const lowered = text.toLowerCase();
  return EARTH_CRS_MARKERS.some((marker) => lowered.includes(marker));
}
