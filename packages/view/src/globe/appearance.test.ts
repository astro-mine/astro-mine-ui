import { describe, expect, it } from "vitest";
import { Color } from "cesium";
import type { Globe } from "cesium";

import { applyBodyAppearance, BODY_BASE_COLOR } from "./appearance";

/** A duck-typed stand-in: constructing a real `Globe` would need a WebGL context jsdom lacks. */
function stubGlobe(): Globe {
  return {
    baseColor: Color.BLUE,
    enableLighting: true,
    showGroundAtmosphere: true,
  } as unknown as Globe;
}

describe("the blue-Earth hazard this module exists to close", () => {
  it("confirms Cesium's own globe default is blue", () => {
    // Cesium's `Globe.baseColor` defaults to `Color.BLUE`. If that ever changes, the guard below is
    // moot — until then, an unset base colour renders any airless body as an ocean world.
    expect(Color.BLUE.blue).toBe(1);
    expect(Color.BLUE.red).toBe(0);
  });
});

describe("BODY_BASE_COLOR", () => {
  it("is not Cesium's Earth-blue default", () => {
    expect(BODY_BASE_COLOR.equals(Color.BLUE)).toBe(false);
  });

  it("is achromatic — no channel dominates, so it can never read as ocean or vegetation", () => {
    const { red, green, blue } = BODY_BASE_COLOR;
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    expect(spread).toBeLessThan(0.05);
    expect(blue).toBeLessThanOrEqual(red);
  });

  it("is dark and opaque, so it reads as an unlit airless surface", () => {
    expect(BODY_BASE_COLOR.red).toBeLessThan(0.5);
    expect(BODY_BASE_COLOR.alpha).toBe(1);
  });
});

describe("applyBodyAppearance", () => {
  it("replaces the blue default and disables the Earth-only atmosphere and lighting", () => {
    const globe = stubGlobe();
    applyBodyAppearance(globe);

    expect(globe.baseColor).toBe(BODY_BASE_COLOR);
    expect(globe.baseColor.equals(Color.BLUE)).toBe(false);
    expect(globe.enableLighting).toBe(false);
    expect(globe.showGroundAtmosphere).toBe(false);
  });
});
