import { describe, expect, it } from "vitest";

import { FrameClass } from "../frames/types";
import type { ReferenceFrame } from "../frames/types";
import type { Pose } from "../frames/pose";
import type { ReplayFrame, ReplayObservation } from "./frames";
import { buildTrack, epochAt, posesAt } from "./track";

const MOON_ME: ReferenceFrame = {
  name: "MOON_ME",
  frame_class: FrameClass.BODY_FIXED,
  center: "MOON",
};
const J2000: ReferenceFrame = { name: "J2000", frame_class: FrameClass.INERTIAL, center: null };
const MARS_IAU: ReferenceFrame = {
  name: "IAU_MARS",
  frame_class: FrameClass.BODY_FIXED,
  center: "MARS",
};

function pose(x: number): Pose {
  return {
    translationM: { xM: x, yM: 0, zM: 0 },
    rotationQuatXyzw: { x: 0, y: 0, z: 0, w: 1 },
  };
}

function observation(
  agentId: string,
  frame: ReferenceFrame,
  simTimeS: number,
  x: number,
): ReplayObservation {
  return {
    agentId,
    tick: simTimeS / 30,
    simTimeS,
    frame,
    pose: pose(x),
    epoch: { tdb_seconds: 8e8 + simTimeS, scale: "tdb" },
    mode: null,
  };
}

function frame(simTimeS: number, observations: ReplayObservation[]): ReplayFrame {
  return { kind: simTimeS === 0 ? "reset" : "step", simTimeS, dtS: 30, observations };
}

const EPISODE: ReplayFrame[] = [
  frame(0, [observation("rover", MOON_ME, 0, 0), observation("relay", J2000, 0, 100)]),
  frame(30, [observation("rover", MOON_ME, 30, 10), observation("relay", J2000, 30, 110)]),
  frame(60, [observation("rover", MOON_ME, 60, 20), observation("relay", J2000, 60, 120)]),
];

describe("building a track", () => {
  const track = buildTrack(EPISODE, { bodyFixedFrame: "MOON_ME" });

  it("spans the recorded times and sorts agents", () => {
    expect(track.startS).toBe(0);
    expect(track.endS).toBe(60);
    expect(track.agents.map((agent) => agent.agentId)).toEqual(["relay", "rover"]);
  });

  it("carries the first epoch it saw, and extrapolates later ones exactly", () => {
    expect(track.startEpoch).toEqual({ tdb_seconds: 8e8, scale: "tdb" });
    expect(epochAt(track, 45)).toEqual({ tdb_seconds: 8e8 + 45, scale: "tdb" });
  });

  it("has no epoch when the recording carried none", () => {
    const bare = buildTrack([frame(0, [{ ...observation("rover", MOON_ME, 0, 0), epoch: null }])], {
      bodyFixedFrame: "MOON_ME",
    });
    expect(bare.startEpoch).toBeNull();
    expect(epochAt(bare, 10)).toBeNull();
  });

  it("is empty, not broken, over an empty recording", () => {
    const empty = buildTrack([], { bodyFixedFrame: "MOON_ME" });
    expect(empty).toMatchObject({ startS: 0, endS: 0, agents: [], startEpoch: null });
    expect(posesAt(empty, 5).size).toBe(0);
  });

  it("throws if an agent changes reference frame mid-episode", () => {
    const inconsistent = [
      frame(0, [observation("rover", MOON_ME, 0, 0)]),
      frame(30, [observation("rover", J2000, 30, 10)]),
    ];
    expect(() => buildTrack(inconsistent, { bodyFixedFrame: "MOON_ME" })).toThrow(
      /changes reference frame mid-episode/,
    );
  });
});

describe("which agents a body-fixed scene may draw", () => {
  const track = buildTrack(EPISODE, { bodyFixedFrame: "MOON_ME" });

  it("places an agent recorded in the scene's own frame", () => {
    const rover = track.agents.find((agent) => agent.agentId === "rover")!;
    expect(rover.placeable).toBe(true);
    expect(rover.unplaceableReason).toBeNull();
  });

  it("refuses to plot an inertial agent on a body-fixed globe, and says why", () => {
    const relay = track.agents.find((agent) => agent.agentId === "relay")!;
    expect(relay.placeable).toBe(false);
    expect(relay.unplaceableReason).toMatch(/inertial frame "J2000"/);
    expect(relay.unplaceableReason).toMatch(/needs SPICE/);
    expect(posesAt(track, 30).has("relay")).toBe(false);
  });

  it("refuses another body's body-fixed frame too — MOON_ME is not IAU_MARS", () => {
    const other = buildTrack([frame(0, [observation("digger", MARS_IAU, 0, 0)])], {
      bodyFixedFrame: "MOON_ME",
    });
    expect(other.agents[0].placeable).toBe(false);
    expect(other.agents[0].unplaceableReason).toMatch(/body-fixed frame "IAU_MARS"/);
  });
});

describe("sampling a track (zero-order hold, never interpolation)", () => {
  const track = buildTrack(EPISODE, { bodyFixedFrame: "MOON_ME" });
  const roverX = (tS: number) => posesAt(track, tS).get("rover")!.translationM.xM;

  it("returns the recorded pose exactly on a sample", () => {
    expect(roverX(0)).toBe(0);
    expect(roverX(30)).toBe(10);
    expect(roverX(60)).toBe(20);
  });

  it("holds the previous sample between them, rather than inventing one in between", () => {
    expect(roverX(29.999)).toBe(0);
    expect(roverX(30.001)).toBe(10);
    // The midpoint would be 5 if we interpolated. It is not.
    expect(roverX(15)).toBe(0);
  });

  it("clamps outside the recording rather than extrapolating", () => {
    expect(roverX(-100)).toBe(0);
    expect(roverX(1e6)).toBe(20);
  });

  it("holds correctly across a long track (binary search, not linear scan)", () => {
    const frames = Array.from({ length: 1000 }, (_, i) =>
      frame(i * 30, [observation("rover", MOON_ME, i * 30, i)]),
    );
    const long = buildTrack(frames, { bodyFixedFrame: "MOON_ME" });
    expect(posesAt(long, 30 * 777 + 1).get("rover")!.translationM.xM).toBe(777);
    expect(posesAt(long, 30 * 777 - 1).get("rover")!.translationM.xM).toBe(776);
  });
});
