import { describe, expect, it } from "vitest";

import {
  cartesianToGeodetic,
  epochFromTdbSeconds,
  formatCoordinate,
  formatEpoch,
  formatEphemerisSeconds,
  formatHeight,
  formatLatitude,
  formatLength,
  formatLongitude,
  FramesValidationError,
  FrameClass,
  geodeticToCartesian,
  INERTIAL_J2000,
  isEarthCrs,
  J2000_EPOCH,
  LUNAR_SOUTH_POLAR_STEREOGRAPHIC,
  MOON_BODY_FIXED,
  MOON_RADIUS_M,
  normalizeLongitude,
  parsePolarStereographic,
  projectToGrid,
  requireCrs,
  requireEpoch,
  requireEpochWindow,
  requireFrame,
  TimeScale,
  unprojectFromGrid,
} from "./index";

const DEG = Math.PI / 180;

describe("constants mirror Core's units vocabulary", () => {
  it("names the Moon's body-fixed frame and the J2000 inertial frame", () => {
    expect(MOON_BODY_FIXED).toEqual({
      name: "MOON_ME",
      frame_class: FrameClass.BODY_FIXED,
      center: "MOON",
    });
    expect(INERTIAL_J2000.name).toBe("J2000");
    expect(INERTIAL_J2000.center).toBeNull();
  });

  it("carries the Moon's reference radius as an exact sphere", () => {
    expect(MOON_RADIUS_M).toBe(1_737_400);
    expect(J2000_EPOCH).toEqual({ tdb_seconds: 0, scale: TimeScale.TDB });
  });

  // RM-P1-VIEW-06: the byte-for-byte PROJ-string drift test against Worlds' output is retired. The
  // shared units conformance vectors (`conformance.test.ts`, from Core's conformance.json) are the
  // anti-drift contract now — a byte-equality assertion against one producer no longer is.
});

describe("requireFrame", () => {
  it("accepts a well-formed frame and a snake_case frame_class", () => {
    expect(requireFrame({ name: "MOON_ME", frame_class: "body_fixed", center: "MOON" })).toEqual(
      MOON_BODY_FIXED,
    );
  });

  it("rejects a missing frame rather than defaulting to Earth", () => {
    expect(() => requireFrame(null)).toThrow(/no implicit Earth\/WGS84 frame/);
    expect(() => requireFrame(undefined)).toThrow(FramesValidationError);
  });

  it("rejects an unknown frame class and a padded/blank name", () => {
    expect(() => requireFrame({ name: "MOON_ME", frameClass: "galactic" })).toThrow(
      /invalid frame_class/,
    );
    expect(() => requireFrame({ name: " MOON_ME ", frameClass: "body_fixed" })).toThrow(
      /whitespace-free/,
    );
    expect(() => requireFrame({ name: "", frameClass: "inertial" })).toThrow(/non-empty/);
  });

  it("rejects a non-object", () => {
    expect(() => requireFrame("MOON_ME")).toThrow(/expected an object/);
  });
});

describe("requireCrs", () => {
  const worldsJson = {
    body: "MOON",
    body_fixed_frame: "MOON_ME",
    reference_radius_m: 1_737_400.0,
    projection: LUNAR_SOUTH_POLAR_STEREOGRAPHIC.projection,
    datum: null,
  };

  it("accepts the snake_case CRS Worlds serializes into world.json", () => {
    expect(requireCrs(worldsJson)).toEqual(LUNAR_SOUTH_POLAR_STEREOGRAPHIC);
  });

  it("rejects a missing CRS rather than defaulting to Earth", () => {
    expect(() => requireCrs(null)).toThrow(/no implicit Earth\/WGS84 CRS/);
    expect(() => requireCrs(42)).toThrow(/expected an object/);
  });

  it("rejects a non-positive or non-finite reference radius", () => {
    expect(() => requireCrs({ ...worldsJson, reference_radius_m: 0 })).toThrow(/positive, finite/);
    expect(() => requireCrs({ ...worldsJson, reference_radius_m: "1737400" })).toThrow(
      /positive, finite/,
    );
  });

  it("rejects an Earth CRS smuggled in through projection or datum", () => {
    expect(() => requireCrs({ ...worldsJson, projection: "+proj=longlat +datum=WGS84" })).toThrow(
      /names an Earth CRS/,
    );
    expect(() => requireCrs({ ...worldsJson, projection: null, datum: "EPSG:4326" })).toThrow(
      /names an Earth CRS/,
    );
  });

  it("recognizes Earth CRS markers case-insensitively", () => {
    expect(isEarthCrs("+proj=longlat +datum=wgs84")).toBe(true);
    expect(isEarthCrs("EPSG:4326")).toBe(true);
    expect(isEarthCrs("+proj=stere +R=1737400.0")).toBe(false);
  });
});

describe("parsePolarStereographic", () => {
  it("parses the anchor world's south-polar CRS", () => {
    const proj = parsePolarStereographic(LUNAR_SOUTH_POLAR_STEREOGRAPHIC.projection as string);
    expect(proj.south).toBe(true);
    expect(proj.radiusM).toBe(MOON_RADIUS_M);
    expect(proj.lon0Rad).toBe(0);
    expect(proj.falseEastingM).toBe(0);
    expect(proj.falseNorthingM).toBe(0);
    // +lat_ts=-90 puts true scale at the pole, so k0 is exactly 1.
    expect(proj.k0).toBeCloseTo(1, 12);
  });

  it("parses the north-polar aspect", () => {
    expect(parsePolarStereographic("+proj=stere +lat_0=90 +lat_ts=90 +R=1737400.0").south).toBe(
      false,
    );
  });

  it("derives k0 from a non-polar +lat_ts", () => {
    // k0 = (1 + sin|lat_ts|) / 2; at lat_ts = 0 that is 1/2.
    expect(parsePolarStereographic("+proj=stere +lat_0=-90 +lat_ts=0 +R=1737400.0").k0).toBeCloseTo(
      0.5,
      12,
    );
  });

  it("refuses a projection it cannot invert exactly", () => {
    expect(() => parsePolarStereographic("+proj=merc +R=1737400.0")).toThrow(/\+proj=stere only/);
    expect(() => parsePolarStereographic("+proj=stere +lat_0=45 +R=1737400.0")).toThrow(
      /not a polar aspect/,
    );
    expect(() => parsePolarStereographic("+proj=stere +lat_0=-90 +a=1737400 +b=1736000")).toThrow(
      /ellipsoidal PROJ parameters/,
    );
    expect(() => parsePolarStereographic("+proj=stere +lat_0=-90 +R=1737400.0 +units=ft")).toThrow(
      /not SI/,
    );
    expect(() => parsePolarStereographic("+proj=stere +lat_0=-90")).toThrow(
      /\+R must be a positive/,
    );
    expect(() => parsePolarStereographic("proj=stere")).toThrow(/malformed PROJ string/);
  });
});

describe("polar-stereographic projection", () => {
  const proj = parsePolarStereographic(LUNAR_SOUTH_POLAR_STEREOGRAPHIC.projection as string);

  it("places the south pole at the grid origin", () => {
    expect(projectToGrid(proj, 0, -90 * DEG)).toEqual({ xM: 0, yM: 0 });
    const geodetic = unprojectFromGrid(proj, { xM: 0, yM: 0 });
    expect(geodetic.latitudeRad).toBeCloseTo(-90 * DEG, 12);
    expect(geodetic.longitudeRad).toBe(0);
  });

  it("matches the closed form at a known off-pole point", () => {
    // rho = 2·R·k0·tan(π/4 + φ/2) at φ = -80° ⇒ 3 474 800 · tan(5°) ≈ 304 005.6 m, on the +y axis
    // because the central meridian (λ = 0) maps to +y in the south aspect.
    const grid = projectToGrid(proj, 0, -80 * DEG);
    expect(grid.xM).toBeCloseTo(0, 6);
    expect(grid.yM).toBeCloseTo(2 * MOON_RADIUS_M * Math.tan(5 * DEG), 6);
    expect(grid.yM).toBeCloseTo(304_005.6, 1);
  });

  it("maps +90° east onto the +x axis", () => {
    const grid = projectToGrid(proj, 90 * DEG, -80 * DEG);
    expect(grid.xM).toBeGreaterThan(0);
    expect(grid.yM).toBeCloseTo(0, 6);
  });

  it("round-trips lon/lat through the grid and back", () => {
    for (const lonDeg of [-179, -90, -12.3456, 0, 45, 179.9]) {
      for (const latDeg of [-89.9, -85, -80, -60, -20]) {
        const grid = projectToGrid(proj, lonDeg * DEG, latDeg * DEG);
        const back = unprojectFromGrid(proj, grid);
        expect(back.longitudeRad).toBeCloseTo(lonDeg * DEG, 9);
        expect(back.latitudeRad).toBeCloseTo(latDeg * DEG, 9);
      }
    }
  });

  it("round-trips through the north aspect too", () => {
    const north = parsePolarStereographic("+proj=stere +lat_0=90 +lat_ts=90 +lon_0=0 +R=1737400.0");
    const grid = projectToGrid(north, 30 * DEG, 75 * DEG);
    const back = unprojectFromGrid(north, grid);
    expect(back.longitudeRad).toBeCloseTo(30 * DEG, 9);
    expect(back.latitudeRad).toBeCloseTo(75 * DEG, 9);
    expect(unprojectFromGrid(north, { xM: 0, yM: 0 }).latitudeRad).toBeCloseTo(90 * DEG, 12);
  });

  it("honours false easting/northing and a rotated central meridian", () => {
    const shifted = parsePolarStereographic(
      "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=45 +x_0=1000 +y_0=-2000 +R=1737400.0",
    );
    expect(unprojectFromGrid(shifted, { xM: 1000, yM: -2000 }).longitudeRad).toBeCloseTo(
      45 * DEG,
      12,
    );
    const grid = projectToGrid(shifted, 45 * DEG, -70 * DEG);
    const back = unprojectFromGrid(shifted, grid);
    expect(back.latitudeRad).toBeCloseTo(-70 * DEG, 9);
  });

  it("carries height through the inverse untouched", () => {
    expect(unprojectFromGrid(proj, { xM: 1234, yM: 5678 }, 42.5).heightM).toBe(42.5);
  });

  it("rejects an out-of-range latitude", () => {
    expect(() => projectToGrid(proj, 0, 91 * DEG)).toThrow(FramesValidationError);
  });
});

describe("normalizeLongitude", () => {
  it("wraps into (-π, π]", () => {
    expect(normalizeLongitude(0)).toBe(0);
    expect(normalizeLongitude(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeLongitude(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeLongitude(1.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI, 12);
  });
});

describe("body-fixed coordinates on the reference sphere", () => {
  const crs = LUNAR_SOUTH_POLAR_STEREOGRAPHIC;

  it("places the prime meridian on +x and the north pole on +z", () => {
    expect(geodeticToCartesian(crs, { longitudeRad: 0, latitudeRad: 0, heightM: 0 })).toEqual({
      xM: MOON_RADIUS_M,
      yM: 0,
      zM: 0,
    });
    const pole = geodeticToCartesian(crs, {
      longitudeRad: 0,
      latitudeRad: Math.PI / 2,
      heightM: 0,
    });
    expect(pole.zM).toBeCloseTo(MOON_RADIUS_M, 6);
  });

  it("round-trips geodetic → cartesian → geodetic", () => {
    const geodetic = { longitudeRad: -1.2, latitudeRad: -1.5, heightM: 2500 };
    const back = cartesianToGeodetic(crs, geodeticToCartesian(crs, geodetic));
    expect(back.longitudeRad).toBeCloseTo(geodetic.longitudeRad, 9);
    expect(back.latitudeRad).toBeCloseTo(geodetic.latitudeRad, 9);
    expect(back.heightM).toBeCloseTo(geodetic.heightM, 6);
  });

  it("reports height relative to the reference sphere, not the centre", () => {
    const surface = cartesianToGeodetic(crs, { xM: MOON_RADIUS_M + 100, yM: 0, zM: 0 });
    expect(surface.heightM).toBeCloseTo(100, 6);
  });

  it("degenerates gracefully on the polar axis and at the centre", () => {
    expect(cartesianToGeodetic(crs, { xM: 0, yM: 0, zM: MOON_RADIUS_M }).longitudeRad).toBe(0);
    expect(cartesianToGeodetic(crs, { xM: 0, yM: 0, zM: 0 }).latitudeRad).toBe(0);
  });
});

describe("unit formatting", () => {
  it("promotes to kilometres only above 10 km, and always names the unit", () => {
    expect(formatLength(1234.5)).toBe("1234.5 m");
    expect(formatLength(9999)).toBe("9999.0 m");
    expect(formatLength(10_000)).toBe("10.0 km");
    expect(formatLength(1_737_400, 2)).toBe("1737.40 km");
    expect(formatLength(Number.NaN)).toBe("— m");
  });

  it("formats hemispheres and signed heights", () => {
    expect(formatLatitude(-89.9012 * DEG)).toBe("89.9012° S");
    expect(formatLatitude(12 * DEG, 1)).toBe("12.0° N");
    expect(formatLongitude(12.3456 * DEG)).toBe("12.3456° E");
    expect(formatLongitude(-12.3456 * DEG)).toBe("12.3456° W");
    expect(formatHeight(1234.5)).toBe("+1234.5 m");
    expect(formatHeight(-20)).toBe("-20.0 m");
    expect(formatHeight(Number.POSITIVE_INFINITY)).toBe("— m");
    expect(formatLatitude(Number.NaN)).toBe("—°");
    expect(formatLongitude(Number.NaN)).toBe("—°");
  });

  it("always names the frame a coordinate is expressed in", () => {
    const geodetic = { longitudeRad: 12.3456 * DEG, latitudeRad: -89.9012 * DEG, heightM: 1234.5 };
    expect(formatCoordinate(geodetic, MOON_BODY_FIXED)).toBe(
      "89.9012° S, 12.3456° E, +1234.5 m (MOON_ME)",
    );
    // A CRS names its body-fixed frame; a bare string is taken as the frame name.
    expect(formatCoordinate(geodetic, LUNAR_SOUTH_POLAR_STEREOGRAPHIC)).toContain("(MOON_ME)");
    expect(formatCoordinate(geodetic, "SITE_ENU")).toContain("(SITE_ENU)");
  });
});

describe("epochs are TDB, never UTC", () => {
  it("renders the J2000 epoch as its defining calendar instant, labelled TDB", () => {
    expect(formatEpoch(J2000_EPOCH)).toBe("2000-01-01T12:00:00.000 TDB");
  });

  it("never emits a UTC/Z marker", () => {
    const rendered = formatEpoch(epochFromTdbSeconds(830_000_000));
    expect(rendered).toMatch(/ TDB$/);
    expect(rendered).not.toContain("Z");
    expect(rendered).not.toContain("UTC");
  });

  it("advances by exactly 86 400 s per day — TDB has no leap seconds", () => {
    expect(formatEpoch(epochFromTdbSeconds(86_400))).toBe("2000-01-02T12:00:00.000 TDB");
    expect(formatEpoch(epochFromTdbSeconds(-86_400))).toBe("1999-12-31T12:00:00.000 TDB");
  });

  it("labels an ET-scaled epoch as ET", () => {
    expect(formatEpoch({ tdb_seconds: 0, scale: TimeScale.ET })).toMatch(/ ET$/);
    expect(formatEphemerisSeconds({ tdb_seconds: 0, scale: TimeScale.ET })).toMatch(/ ET$/);
  });

  it("renders raw ephemeris seconds with a sign", () => {
    expect(formatEphemerisSeconds(epochFromTdbSeconds(830_000_000))).toBe("J2000+8.3000e+8 s TDB");
    expect(formatEphemerisSeconds(epochFromTdbSeconds(-1))).toBe("J2000-1.0000e+0 s TDB");
  });

  it("rejects a non-finite epoch", () => {
    expect(() => epochFromTdbSeconds(Number.NaN)).toThrow(/must be finite/);
  });
});

describe("requireEpoch / requireEpochWindow", () => {
  it("returns Core's snake_case Epoch shape", () => {
    expect(requireEpoch({ tdb_seconds: 12.5, scale: "tdb" })).toEqual({
      tdb_seconds: 12.5,
      scale: TimeScale.TDB,
    });
  });

  it("refuses a civil time scale, a missing scale, and a non-finite instant", () => {
    expect(() => requireEpoch({ tdb_seconds: 0, scale: "utc" })).toThrow(/cannot be\s+represented/);
    expect(() => requireEpoch({ tdb_seconds: 0 })).toThrow(FramesValidationError);
    expect(() => requireEpoch(null)).toThrow(/no implicit time scale/);
    expect(() => requireEpoch({ tdb_seconds: "0", scale: "tdb" })).toThrow(/finite number/);
  });

  it("still reads View's historical camelCase tdbSeconds (documented ingest affordance, AC4)", () => {
    expect(requireEpoch({ tdbSeconds: 7, scale: "tdb" })).toEqual({
      tdb_seconds: 7,
      scale: TimeScale.TDB,
    });
  });

  it("requires a strictly ordered window", () => {
    const start = { tdb_seconds: 0, scale: "tdb" };
    expect(
      requireEpochWindow({ start, end: { tdb_seconds: 10, scale: "tdb" } }).end.tdb_seconds,
    ).toBe(10);
    expect(() => requireEpochWindow({ start, end: { tdb_seconds: 0, scale: "tdb" } })).toThrow(
      /strictly after start/,
    );
    expect(() => requireEpochWindow(null)).toThrow(/epoch window is required/);
  });
});
