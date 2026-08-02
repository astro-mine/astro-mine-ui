import { describe, expect, it } from "vitest";

import { LUNAR_SOUTH_POLAR_STEREOGRAPHIC } from "./constants";
import { geodeticToCartesian } from "./coords";
import { enuToBodyFixedQuat, IDENTITY_QUAT, multiplyQuat, poseFromGeodetic } from "./pose";
import type { Quat } from "./pose";

// The committed fixture, emitted by Worlds' own exporter. `tileset.json`'s `root.transform` is an
// east-north-up basis at `world.json`'s `tiles_anchor` — computed by Worlds' `enu_to_body_fixed`.
// Reproducing it from View's own closed form is the contract test: if either side's frame
// convention drifts, this fails rather than a swarm rendering underground.
import tileset from "../../fixtures/world/tiles/tileset.json";
import world from "../../fixtures/world/world.json";

const DEG = Math.PI / 180;

type Vec3 = readonly [number, number, number];

/** Rotate `v` by the unit quaternion `q`. */
function rotate(q: Quat, [x, y, z]: Vec3): Vec3 {
  const tx = 2 * (q.y * z - q.z * y);
  const ty = 2 * (q.z * x - q.x * z);
  const tz = 2 * (q.x * y - q.y * x);
  return [
    x + q.w * tx + (q.y * tz - q.z * ty),
    y + q.w * ty + (q.z * tx - q.x * tz),
    z + q.w * tz + (q.x * ty - q.y * tx),
  ];
}

/** The three columns of the rotation matrix `q` represents. */
function columns(q: Quat): readonly [Vec3, Vec3, Vec3] {
  return [rotate(q, [1, 0, 0]), rotate(q, [0, 1, 0]), rotate(q, [0, 0, 1])];
}

function expectVecCloseTo(actual: Vec3, expected: Vec3, digits = 12) {
  actual.forEach((component, index) => expect(component).toBeCloseTo(expected[index], digits));
}

function norm(q: Quat): number {
  return Math.hypot(q.x, q.y, q.z, q.w);
}

describe("enuToBodyFixedQuat", () => {
  it("maps east, north and up onto the body-fixed axes at (0°, 0°)", () => {
    const [east, north, up] = columns(
      enuToBodyFixedQuat({ longitudeRad: 0, latitudeRad: 0, heightM: 0 }),
    );
    // On the prime meridian at the equator: up is +x, east is +y, north is +z.
    expectVecCloseTo(east, [0, 1, 0]);
    expectVecCloseTo(north, [0, 0, 1]);
    expectVecCloseTo(up, [1, 0, 0]);
  });

  it("stays a unit quaternion at the south pole, where a cross-product basis degenerates", () => {
    const q = enuToBodyFixedQuat({ longitudeRad: 0, latitudeRad: -Math.PI / 2, heightM: 0 });
    expect(norm(q)).toBeCloseTo(1, 12);

    const [, , up] = columns(q);
    expectVecCloseTo(up, [0, 0, -1]);
  });

  it("reproduces the east-north-up basis Worlds published in root.transform", () => {
    const { longitude_deg, latitude_deg, height_m } = world.tiles_anchor.origin;
    const anchor = {
      longitudeRad: longitude_deg * DEG,
      latitudeRad: latitude_deg * DEG,
      heightM: height_m,
    };

    // 3D Tiles `transform` is a column-major 4x4; its columns are east, north, up, translation.
    const m = tileset.root.transform;
    const [east, north, up] = columns(enuToBodyFixedQuat(anchor));
    expectVecCloseTo(east, [m[0], m[1], m[2]], 9);
    expectVecCloseTo(north, [m[4], m[5], m[6]], 9);
    expectVecCloseTo(up, [m[8], m[9], m[10]], 9);

    // And the anchor itself is where Worlds put the tile's origin, to sub-micrometre agreement.
    const origin = geodeticToCartesian(LUNAR_SOUTH_POLAR_STEREOGRAPHIC, anchor);
    expect(origin.xM).toBeCloseTo(m[12], 6);
    expect(origin.yM).toBeCloseTo(m[13], 6);
    expect(origin.zM).toBeCloseTo(m[14], 6);
  });
});

describe("multiplyQuat", () => {
  it("leaves a rotation unchanged when composed with identity", () => {
    const q = enuToBodyFixedQuat({ longitudeRad: 0.3, latitudeRad: -1.2, heightM: 0 });
    const composed = multiplyQuat(q, IDENTITY_QUAT);
    expect(composed.x).toBeCloseTo(q.x, 12);
    expect(composed.y).toBeCloseTo(q.y, 12);
    expect(composed.z).toBeCloseTo(q.z, 12);
    expect(composed.w).toBeCloseTo(q.w, 12);
  });

  it("applies the right-hand operand first", () => {
    // A quarter turn about +z, twice, is a half turn about +z: (1,0,0) -> (-1,0,0).
    const quarter: Quat = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };
    expectVecCloseTo(rotate(multiplyQuat(quarter, quarter), [1, 0, 0]), [-1, 0, 0]);
  });
});

describe("poseFromGeodetic", () => {
  const crs = LUNAR_SOUTH_POLAR_STEREOGRAPHIC;
  const site = { longitudeRad: 0, latitudeRad: 0, heightM: 0 };

  it("puts the asset's translation on the reference sphere", () => {
    const pose = poseFromGeodetic(crs, { ...site, heightM: 100 });
    expect(pose.translationM).toEqual(geodeticToCartesian(crs, { ...site, heightM: 100 }));
    expect(norm(pose.rotationQuatXyzw)).toBeCloseTo(1, 12);
  });

  it("stands the asset upright: body +z is local up", () => {
    const pose = poseFromGeodetic(crs, site);
    const [, , bodyUp] = columns(pose.rotationQuatXyzw);
    expectVecCloseTo(bodyUp, [1, 0, 0]); // local up at (0°, 0°) is body-fixed +x
  });

  it("faces the body's forward (+x) axis north at heading 0", () => {
    const pose = poseFromGeodetic(crs, site, { headingRad: 0 });
    const [forward] = columns(pose.rotationQuatXyzw);
    expectVecCloseTo(forward, [0, 0, 1]); // local north at (0°, 0°) is body-fixed +z
  });

  it("swings forward toward east as heading grows", () => {
    const pose = poseFromGeodetic(crs, site, { headingRad: Math.PI / 2 });
    const [forward] = columns(pose.rotationQuatXyzw);
    expectVecCloseTo(forward, [0, 1, 0]); // local east at (0°, 0°) is body-fixed +y
  });

  it("keeps the body frame right-handed at every heading", () => {
    for (const headingRad of [0, 0.7, Math.PI / 2, Math.PI, -2.4]) {
      const [forward, left, up] = columns(
        poseFromGeodetic(crs, site, { headingRad }).rotationQuatXyzw,
      );
      const cross: Vec3 = [
        forward[1] * left[2] - forward[2] * left[1],
        forward[2] * left[0] - forward[0] * left[2],
        forward[0] * left[1] - forward[1] * left[0],
      ];
      expectVecCloseTo(cross, up, 9);
    }
  });

  it("stays upright at the pole, where the anchor world's assets actually stand", () => {
    const pole = { longitudeRad: 0, latitudeRad: -89.0097 * DEG, heightM: -184.78 };
    const pose = poseFromGeodetic(crs, pole, { headingRad: 1.1 });
    const [, , bodyUp] = columns(pose.rotationQuatXyzw);

    // Local up is the outward radial direction — the asset's own +z must land on it.
    const radial = geodeticToCartesian(crs, pole);
    const length = Math.hypot(radial.xM, radial.yM, radial.zM);
    expectVecCloseTo(bodyUp, [radial.xM / length, radial.yM / length, radial.zM / length], 9);
  });
});
