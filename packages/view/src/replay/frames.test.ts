import { describe, expect, it } from "vitest";

import { describeChannels, isKnownChannel } from "./channels";
import type { ReplayChannel } from "./channels";
import { decodeSimFrame, ReplayError, SIM_FRAME_SCHEMA, SIM_FRAMES_TOPIC } from "./frames";

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

/** A rover observation shaped exactly as `Observation.model_dump(mode="json")` writes it. */
function observation(agentId: string, overrides: Record<string, unknown> = {}) {
  return {
    tick: 3,
    sim_time_s: 90.0,
    agent_id: agentId,
    observable: true,
    epoch: { tdb_seconds: 800000090.0, scale: "tdb" },
    self_state: {
      agent_id: agentId,
      frame: { name: "MOON_ME", frame_class: "body_fixed", center: "MOON" },
      pose: {
        translation_m: { x: 1.0, y: 2.0, z: 3.0 },
        rotation_quat_xyzw: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
      },
      mode: "prospect",
      ...overrides,
    },
  };
}

describe("decoding a /sim/frames message", () => {
  it("reads a step frame's poses, frames, and epoch", () => {
    const frame = decodeSimFrame(
      encode({
        kind: "step",
        sim_time_s: 90.0,
        dt_s: 30.0,
        observations: { "rover-0": observation("rover-0") },
      }),
    );

    expect(frame.kind).toBe("step");
    expect(frame.simTimeS).toBe(90);
    expect(frame.dtS).toBe(30);
    expect(frame.observations).toHaveLength(1);

    const [rover] = frame.observations;
    expect(rover.agentId).toBe("rover-0");
    expect(rover.tick).toBe(3);
    expect(rover.frame).toEqual({ name: "MOON_ME", frame_class: "body_fixed", center: "MOON" });
    expect(rover.pose.translationM).toEqual({ xM: 1, yM: 2, zM: 3 });
    expect(rover.pose.rotationQuatXyzw).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(rover.epoch).toEqual({ tdb_seconds: 800000090, scale: "tdb" });
    expect(rover.mode).toBe("prospect");
  });

  it("treats a reset frame as t = 0 — Sim omits sim_time_s there", () => {
    const frame = decodeSimFrame(
      encode({ kind: "reset", observations: { "rover-0": observation("rover-0") } }),
    );
    expect(frame.kind).toBe("reset");
    expect(frame.simTimeS).toBe(0);
    expect(frame.dtS).toBeNull();
  });

  it("orders agents deterministically, whatever order the JSON keys came in", () => {
    const frame = decodeSimFrame(
      encode({
        kind: "reset",
        observations: {
          relay: observation("relay"),
          "rover-1": observation("rover-1"),
          "rover-0": observation("rover-0"),
        },
      }),
    );
    expect(frame.observations.map((o) => o.agentId)).toEqual(["relay", "rover-0", "rover-1"]);
  });

  it("accepts a missing epoch — Observation.epoch defaults to null", () => {
    const rover = observation("rover-0");
    const frame = decodeSimFrame(
      encode({ kind: "reset", observations: { "rover-0": { ...rover, epoch: null } } }),
    );
    expect(frame.observations[0].epoch).toBeNull();
  });

  describe("a known channel that lies about its shape is a loud error, not a skipped tick", () => {
    it("rejects bytes that are not JSON", () => {
      expect(() => decodeSimFrame(new TextEncoder().encode("{ not json"))).toThrow(ReplayError);
    });

    it("rejects an unknown frame kind", () => {
      expect(() => decodeSimFrame(encode({ kind: "snapshot", observations: {} }))).toThrow(
        /"kind" must be "reset" or "step"/,
      );
    });

    it("rejects a step frame with no simulated time", () => {
      expect(() => decodeSimFrame(encode({ kind: "step", observations: {} }))).toThrow(
        /sim_time_s/,
      );
    });

    it("rejects a pose with a non-finite component", () => {
      const rover = observation("rover-0");
      rover.self_state.pose.translation_m.x = "nope" as unknown as number;
      expect(() =>
        decodeSimFrame(encode({ kind: "reset", observations: { "rover-0": rover } })),
      ).toThrow(/translation_m\.x/);
    });

    it("refuses a pose with no reference frame rather than assuming one", () => {
      const rover = observation("rover-0", { frame: undefined });
      expect(() =>
        decodeSimFrame(encode({ kind: "reset", observations: { "rover-0": rover } })),
      ).toThrow(/no usable reference frame/);
    });

    it("refuses a civil-scale epoch — the waist carries TDB/ET only", () => {
      const rover = observation("rover-0");
      const frame = { ...rover, epoch: { tdb_seconds: 1.0, scale: "utc" } };
      expect(() =>
        decodeSimFrame(encode({ kind: "reset", observations: { "rover-0": frame } })),
      ).toThrow(/not a valid epoch/);
    });
  });
});

describe("the channel model", () => {
  const channel = (topic: string, schemaName: string): ReplayChannel => ({
    id: 1,
    topic,
    schemaName,
    schemaEncoding: "jsonschema",
    messageEncoding: "json",
    known: isKnownChannel(topic, schemaName),
  });

  it("knows Sim's frames channel, and only on the right schema", () => {
    expect(isKnownChannel(SIM_FRAMES_TOPIC, SIM_FRAME_SCHEMA)).toBe(true);
    expect(isKnownChannel(SIM_FRAMES_TOPIC, "some.other.Schema")).toBe(false);
    expect(isKnownChannel("/guard/verdicts", SIM_FRAME_SCHEMA)).toBe(false);
  });

  it("names the channels it cannot interpret rather than staying silent about them", () => {
    const channels = [
      channel(SIM_FRAMES_TOPIC, SIM_FRAME_SCHEMA),
      channel("/guard/verdicts", "astro_mine.core.SafetyVerdict"),
    ];
    expect(describeChannels(channels)).toBe(
      "1 of 2 channels rendered; 1 not interpreted (/guard/verdicts)",
    );
  });

  it("says nothing special when every channel is understood", () => {
    expect(describeChannels([channel(SIM_FRAMES_TOPIC, SIM_FRAME_SCHEMA)])).toBe("1 channel");
    expect(describeChannels([])).toBe("recording declares no channels");
  });
});
