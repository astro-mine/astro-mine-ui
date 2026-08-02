import { afterEach, describe, expect, it } from "vitest";
import { Ellipsoid } from "cesium";

import { LUNAR_SOUTH_POLAR_STEREOGRAPHIC, MOON_RADIUS_M } from "../frames/constants";
import { assertLunarRadiusAgreement, bodyEllipsoid, configureBodyEllipsoid } from "./ellipsoid";

// `Ellipsoid.default` is process-global state that a Viewer captures at construction. Restore it so
// these tests cannot leak an ellipsoid into each other.
const ORIGINAL_DEFAULT = Ellipsoid.default;
afterEach(() => {
  Ellipsoid.default = ORIGINAL_DEFAULT;
});

describe("the WGS84 hazard this module exists to close", () => {
  it("confirms Cesium's out-of-the-box default really is Earth", () => {
    // If this ever fails, the guard below has become unnecessary — but until it does, every
    // ellipsoid-defaulting Cesium API would silently place lunar terrain on Earth.
    expect(Ellipsoid.default.maximumRadius).toBe(Ellipsoid.WGS84.maximumRadius);
    expect(Ellipsoid.default.maximumRadius).not.toBe(MOON_RADIUS_M);
  });
});

describe("bodyEllipsoid", () => {
  it("builds a sphere from the CRS reference radius", () => {
    const ellipsoid = bodyEllipsoid(LUNAR_SOUTH_POLAR_STEREOGRAPHIC);
    expect(ellipsoid.radii.x).toBe(MOON_RADIUS_M);
    expect(ellipsoid.radii.y).toBe(MOON_RADIUS_M);
    expect(ellipsoid.radii.z).toBe(MOON_RADIUS_M);
    expect(ellipsoid.maximumRadius).toBe(ellipsoid.minimumRadius);
  });

  it("honours a CRS for some other body", () => {
    const ceres = {
      ...LUNAR_SOUTH_POLAR_STEREOGRAPHIC,
      body: "CERES",
      reference_radius_m: 469_730,
    };
    expect(bodyEllipsoid(ceres).maximumRadius).toBe(469_730);
  });
});

describe("configureBodyEllipsoid", () => {
  it("installs the body as Cesium's ellipsoid default", () => {
    const installed = configureBodyEllipsoid(LUNAR_SOUTH_POLAR_STEREOGRAPHIC);
    expect(Ellipsoid.default).toBe(installed);
    expect(Ellipsoid.default.maximumRadius).toBe(MOON_RADIUS_M);
  });
});

describe("assertLunarRadiusAgreement — a contract, not a coincidence", () => {
  it("holds for the installed Cesium: Ellipsoid.MOON agrees with Core's MOON_RADIUS_M", () => {
    expect(Ellipsoid.MOON.maximumRadius).toBe(MOON_RADIUS_M);
    expect(() => assertLunarRadiusAgreement()).not.toThrow();
  });
});
