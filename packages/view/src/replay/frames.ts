/**
 * The ←Sim ingest seam: decoding one `astro_mine.sim.Frame` message (RM-P1-VIEW-04).
 *
 * Sim records an episode as a single MCAP channel — topic `/sim/frames`, `message_encoding: "json"`,
 * schema `astro_mine.sim.Frame` (encoding `jsonschema`) — where every message is a canonical frame:
 *
 * ```json
 * { "kind": "step", "sim_time_s": 30.0, "dt_s": 30.0,
 *   "observations": { "rover-0": { …Core Observation… } },
 *   "terminations": {…}, "truncations": {…} }
 * ```
 *
 * Each observation is a Core `Observation` dumped as JSON (`astro_mine.core.messages.model`), whose
 * `self_state` carries the pose and — crucially — the **frame that pose is expressed in**.
 *
 * **This is not Protobuf.** Core's `.proto` (and its generated TS client) cover the control plane:
 * `Action`, `ContactPlan`, `Transform`. The per-tick `Observation` family is Cap'n Proto for the
 * in-process hot path and plain JSON on the wire in MCAP. So View parses JSON here rather than
 * binding a generated decoder, and the field names below are pydantic's snake_case.
 *
 * Pure TypeScript: no Cesium, no MCAP. `mcapSource.ts` supplies the bytes, this turns them into
 * vocabulary `frames/` already speaks.
 */

import { requireFrame } from "../frames/guards";
import { requireEpoch } from "../frames/time";
import type { Epoch, ReferenceFrame } from "../frames/types";
import type { Pose } from "../frames/pose";

/** MCAP topic Sim records canonical frames on. */
export const SIM_FRAMES_TOPIC = "/sim/frames";
/** The schema name registered against that topic. */
export const SIM_FRAME_SCHEMA = "astro_mine.sim.Frame";

/** Raised when a recording's bytes are unreadable, or a known message does not match its schema. */
export class ReplayError extends Error {
  /** The underlying failure, when there was one. Declared here because the target predates ES2022. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ReplayError";
    this.cause = cause;
  }
}

/** One agent's state at one tick, as recorded. */
export interface ReplayObservation {
  readonly agentId: string;
  readonly tick: number;
  readonly simTimeS: number;
  /** The frame `pose` is expressed in. Never assumed — an agent may be inertial. */
  readonly frame: ReferenceFrame;
  readonly pose: Pose;
  readonly epoch: Epoch | null;
  readonly mode: string | null;
}

/** One recorded tick: the reset frame, or a step. */
export interface ReplayFrame {
  readonly kind: "reset" | "step";
  readonly simTimeS: number;
  readonly dtS: number | null;
  readonly observations: readonly ReplayObservation[];
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ReplayError(`frame field "${field}" must be an object, got ${JSON.stringify(value)}`);
  }
  return value as Record<string, unknown>;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ReplayError(
      `frame field "${field}" must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function requireVec3(value: unknown, field: string): { xM: number; yM: number; zM: number } {
  const raw = asObject(value, field);
  return {
    xM: requireNumber(raw.x, `${field}.x`),
    yM: requireNumber(raw.y, `${field}.y`),
    zM: requireNumber(raw.z, `${field}.z`),
  };
}

function requireQuat(value: unknown, field: string) {
  const raw = asObject(value, field);
  return {
    x: requireNumber(raw.x, `${field}.x`),
    y: requireNumber(raw.y, `${field}.y`),
    z: requireNumber(raw.z, `${field}.z`),
    w: requireNumber(raw.w, `${field}.w`),
  };
}

/**
 * An `Epoch` is optional on the wire (`Observation.epoch` defaults to `None`), but when present it
 * must be a real ephemeris epoch. `requireEpoch` already refuses a civil scale such as UTC, and
 * already reads pydantic's `tdb_seconds` — so validation lives there, not here.
 */
function optionalEpoch(value: unknown, field: string): Epoch | null {
  if (value === null || value === undefined) return null;
  try {
    return requireEpoch(value);
  } catch (cause) {
    throw new ReplayError(`frame field "${field}" is not a valid epoch`, cause);
  }
}

function decodeObservation(agentId: string, value: unknown): ReplayObservation {
  const observation = asObject(value, `observations.${agentId}`);
  const selfState = asObject(observation.self_state, `observations.${agentId}.self_state`);
  const pose = asObject(selfState.pose, `observations.${agentId}.self_state.pose`);

  let frame: ReferenceFrame;
  try {
    frame = requireFrame(selfState.frame);
  } catch (cause) {
    throw new ReplayError(
      `agent "${agentId}" records a pose with no usable reference frame — refusing to guess one`,
      cause,
    );
  }

  return {
    agentId,
    tick: requireNumber(observation.tick, `observations.${agentId}.tick`),
    simTimeS: requireNumber(observation.sim_time_s, `observations.${agentId}.sim_time_s`),
    frame,
    pose: {
      translationM: requireVec3(pose.translation_m, `observations.${agentId}.pose.translation_m`),
      rotationQuatXyzw: requireQuat(
        pose.rotation_quat_xyzw,
        `observations.${agentId}.pose.rotation_quat_xyzw`,
      ),
    },
    epoch: optionalEpoch(observation.epoch, `observations.${agentId}.epoch`),
    mode: typeof selfState.mode === "string" ? selfState.mode : null,
  };
}

/**
 * Decode one `/sim/frames` message body.
 *
 * A **reset** frame carries no `sim_time_s` — Sim omits it, so the episode starts at t = 0. A
 * malformed frame on a channel we claim to understand is a loud error, not a skipped tick: that is
 * the difference between an unknown channel (rendered generically, `channels.ts`) and a known one
 * that lied about its shape.
 */
export function decodeSimFrame(data: Uint8Array): ReplayFrame {
  let parsed: unknown;
  const text = new TextDecoder().decode(data);
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new ReplayError(`a ${SIM_FRAMES_TOPIC} message is not valid JSON`, cause);
  }
  const frame = asObject(parsed, "frame");

  const kind = frame.kind;
  if (kind !== "reset" && kind !== "step") {
    throw new ReplayError(
      `frame field "kind" must be "reset" or "step", got ${JSON.stringify(kind)}`,
    );
  }

  const observations = asObject(frame.observations, "observations");
  return {
    kind,
    simTimeS: kind === "reset" ? 0 : requireNumber(frame.sim_time_s, "sim_time_s"),
    dtS: frame.dt_s === undefined ? null : requireNumber(frame.dt_s, "dt_s"),
    // Sorted so a track's agent order does not depend on JSON key order.
    observations: Object.keys(observations)
      .sort()
      .map((agentId) => decodeObservation(agentId, observations[agentId])),
  };
}
