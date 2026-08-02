import { describe, expect, it } from "vitest";

import { LUNAR_SOUTH_POLAR_STEREOGRAPHIC } from "../frames/constants";
import { FramesValidationError } from "../frames/guards";
import { resolveWorld, WorldSourceError } from "./worldSource";

// The *actual committed fixture*, emitted by Worlds' own exporter (scripts/gen-world-fixture.py).
// Parsing it through the real ingest path is the ←Worlds contract test: if Worlds changes the shape
// of `world.json`, regenerating the fixture breaks this file rather than the browser.
import fixture from "../../fixtures/world/world.json";

const DEG = Math.PI / 180;

/** A `fetch` that serves one JSON body, or fails the way the browser would. */
function stubFetch(
  body: unknown,
  init: { ok?: boolean; status?: number; json?: () => Promise<unknown> } = {},
) {
  const { ok = true, status = 200, json = async () => body } = init;
  return (async () => ({ ok, status, json })) as unknown as typeof fetch;
}

function rejectingFetch(error: Error) {
  return (async () => {
    throw error;
  }) as unknown as typeof fetch;
}

describe("resolveWorld — the committed Worlds fixture", () => {
  it("resolves the real bundle manifest end to end", async () => {
    const world = await resolveWorld({ manifestUrl: "/world/world.json" }, stubFetch(fixture));

    expect(world.worldId).toBe("shackleton-de-gerlache-fixture");
    expect(world.worldHash).toMatch(/^[0-9a-f]{64}$/);
    expect(world.crs).toEqual(LUNAR_SOUTH_POLAR_STEREOGRAPHIC);
    expect(world.tilesetUrl.endsWith("/world/tiles/tileset.json")).toBe(true);
    expect(world.grid).toEqual({
      width: 256,
      height: 256,
      resolutionM: 20,
      transform: [20, 0, -2550, 0, -20, 32550],
    });
  });

  it("anchors the patch where Worlds says it is, at a real elevation datum", async () => {
    const world = await resolveWorld({ manifestUrl: "/world/world.json" }, stubFetch(fixture));

    // The anchor is the *mesh centroid* Worlds publishes, not the grid centre View used to compute.
    // It sits ~1° from the south pole, near the prime meridian, and — the point of WORLDS-16 — it
    // carries the patch's mean elevation, which the mesh subtracts from every vertex. Anchoring at
    // height 0, as View did before, buried the terrain by that much.
    expect(world.originFrame).toBe("MOON_ME");
    expect(world.origin.longitudeRad / DEG).toBeCloseTo(-0.0572, 4);
    expect(world.origin.latitudeRad / DEG).toBeCloseTo(-89.0097, 4);
    expect(world.origin.heightM).toBeCloseTo(-184.779, 3);
    expect(world.origin.heightM).not.toBe(0);
  });

  it("resolves the tileset URL relative to the manifest", async () => {
    const world = await resolveWorld(
      { manifestUrl: "https://tiles.example.org/bundles/shackleton/world.json" },
      stubFetch(fixture),
    );
    expect(world.tilesetUrl).toBe(
      "https://tiles.example.org/bundles/shackleton/tiles/tileset.json",
    );
  });
});

describe("resolveWorld — fail loud, never default to Earth", () => {
  const manifestUrl = "/world/world.json";

  it("rejects a manifest with no CRS", async () => {
    const noCrs = { ...fixture, crs: undefined };
    await expect(resolveWorld({ manifestUrl }, stubFetch(noCrs))).rejects.toThrow(
      /no implicit Earth\/WGS84 CRS/,
    );
  });

  it("rejects a manifest whose CRS is an Earth CRS", async () => {
    const earth = { ...fixture, crs: { ...fixture.crs, projection: "+proj=longlat +datum=WGS84" } };
    await expect(resolveWorld({ manifestUrl }, stubFetch(earth))).rejects.toThrow(
      FramesValidationError,
    );
  });

  it("rejects a manifest that publishes no tileset", async () => {
    const noTiles = { ...fixture, tiles: undefined };
    await expect(resolveWorld({ manifestUrl }, stubFetch(noTiles))).rejects.toThrow(
      /publishes no terrain tileset/,
    );
  });

  it("rejects a malformed grid", async () => {
    const shortAffine = { ...fixture, grid: { ...fixture.grid, transform: [1, 2, 3] } };
    await expect(resolveWorld({ manifestUrl }, stubFetch(shortAffine))).rejects.toThrow(
      /6-element affine/,
    );

    const noGrid = { ...fixture, grid: undefined };
    await expect(resolveWorld({ manifestUrl }, stubFetch(noGrid))).rejects.toThrow(
      /missing its "grid"/,
    );

    const badWidth = { ...fixture, grid: { ...fixture.grid, width: "256" } };
    await expect(resolveWorld({ manifestUrl }, stubFetch(badWidth))).rejects.toThrow(/grid.width/);
  });

  it("reports an unreachable, erroring, or non-JSON manifest as a WorldSourceError", async () => {
    await expect(
      resolveWorld({ manifestUrl }, rejectingFetch(new Error("offline"))),
    ).rejects.toThrow(/could not fetch world manifest/);
    await expect(
      resolveWorld({ manifestUrl }, stubFetch(null, { ok: false, status: 404 })),
    ).rejects.toThrow(/returned HTTP 404/);
    await expect(
      resolveWorld(
        { manifestUrl },
        stubFetch(null, { json: () => Promise.reject(new Error("bad")) }),
      ),
    ).rejects.toThrow(/is not valid JSON/);
    await expect(resolveWorld({ manifestUrl }, stubFetch("not-an-object"))).rejects.toThrow(
      /is not a JSON object/,
    );
  });

  it("surfaces the underlying failure as the error's cause", async () => {
    const offline = new Error("offline");
    await expect(resolveWorld({ manifestUrl }, rejectingFetch(offline))).rejects.toSatisfy(
      (error: WorldSourceError) => error.cause === offline,
    );
  });
});

describe("resolveWorld — host-supplied tileset", () => {
  it("passes a validated CRS and origin straight through, without fetching", async () => {
    const origin = { longitudeRad: 0.1, latitudeRad: -1.5, heightM: 12 };
    const world = await resolveWorld({
      tilesetUrl: "https://example.org/t.json",
      crs: LUNAR_SOUTH_POLAR_STEREOGRAPHIC,
      origin,
      worldId: "custom",
    });
    expect(world).toEqual({
      worldId: "custom",
      worldHash: null,
      crs: LUNAR_SOUTH_POLAR_STEREOGRAPHIC,
      tilesetUrl: "https://example.org/t.json",
      origin,
      originFrame: "MOON_ME",
      grid: null,
    });
  });

  it("still validates the host's CRS", async () => {
    await expect(
      resolveWorld({
        tilesetUrl: "https://example.org/t.json",
        crs: { ...LUNAR_SOUTH_POLAR_STEREOGRAPHIC, reference_radius_m: -1 },
        origin: { longitudeRad: 0, latitudeRad: 0, heightM: 0 },
      }),
    ).rejects.toThrow(/positive, finite/);
  });
});

describe("resolveWorld — tiles_anchor is required and must agree with the CRS", () => {
  const manifestUrl = "/world/world.json";

  it("rejects a bundle that predates RM-P1-WORLDS-16", async () => {
    // The old behaviour — reconstruct the origin from `crs` + `grid` — placed terrain hundreds of
    // metres off vertically. Refusing to load is the honest failure.
    const legacy = { ...fixture, tiles_anchor: undefined };
    await expect(resolveWorld({ manifestUrl }, stubFetch(legacy))).rejects.toThrow(
      /predates RM-P1-WORLDS-16/,
    );
  });

  it("rejects an anchor whose frame disagrees with the bundle's own CRS", async () => {
    const mismatched = { ...fixture, tiles_anchor: { ...fixture.tiles_anchor, frame: "MOON_PA" } };
    await expect(resolveWorld({ manifestUrl }, stubFetch(mismatched))).rejects.toThrow(
      /refusing to guess which one the terrain is in/,
    );
  });

  it("rejects a malformed anchor origin", async () => {
    const noOrigin = { ...fixture, tiles_anchor: { frame: "MOON_ME" } };
    await expect(resolveWorld({ manifestUrl }, stubFetch(noOrigin))).rejects.toThrow(
      /missing its "tiles_anchor.origin"/,
    );

    const badHeight = {
      ...fixture,
      tiles_anchor: {
        ...fixture.tiles_anchor,
        origin: { ...fixture.tiles_anchor.origin, height_m: null },
      },
    };
    await expect(resolveWorld({ manifestUrl }, stubFetch(badHeight))).rejects.toThrow(
      /tiles_anchor.origin.height_m/,
    );
  });

  it("converts the anchor's degrees to radians", async () => {
    const anchored = {
      ...fixture,
      tiles_anchor: {
        frame: "MOON_ME",
        origin: { longitude_deg: 90, latitude_deg: -45, height_m: 7 },
      },
    };
    const world = await resolveWorld({ manifestUrl }, stubFetch(anchored));
    expect(world.origin.longitudeRad).toBeCloseTo(Math.PI / 2, 12);
    expect(world.origin.latitudeRad).toBeCloseTo(-Math.PI / 4, 12);
    expect(world.origin.heightM).toBe(7);
  });
});

describe("resolveWorld — tiles_anchor.frame in both published shapes", () => {
  const manifestUrl = "/world/world.json";

  /** The manifest with its anchor frame replaced by `frame`, everything else the real fixture. */
  function withAnchorFrame(frame: unknown) {
    return { ...fixture, tiles_anchor: { ...fixture.tiles_anchor, frame } };
  }

  // The version bisect from the bug report: bundles 0.2.0/0.3.0 publish a bare frame name, 0.4.0 —
  // the version the anchor scenario pins — publishes Core's structured ReferenceFrame (RFC-0007).
  // Both must resolve to the same anchor, or terrain silently stops loading on a content bump.
  it("accepts the bare frame name published up to bundle 0.3.0", async () => {
    const world = await resolveWorld({ manifestUrl }, stubFetch(withAnchorFrame("MOON_ME")));
    expect(world.originFrame).toBe("MOON_ME");
  });

  it("accepts the structured ReferenceFrame published from bundle 0.4.0", async () => {
    const structured = withAnchorFrame({
      center: "MOON",
      frame_class: "body_fixed",
      name: "MOON_ME",
    });
    const world = await resolveWorld({ manifestUrl }, stubFetch(structured));
    expect(world.originFrame).toBe("MOON_ME");
  });

  it("resolves both shapes to an identical world", async () => {
    const bare = await resolveWorld({ manifestUrl }, stubFetch(withAnchorFrame("MOON_ME")));
    const structured = await resolveWorld(
      { manifestUrl },
      stubFetch(withAnchorFrame({ center: "MOON", frame_class: "body_fixed", name: "MOON_ME" })),
    );
    expect(structured).toEqual(bare);
  });

  it("still rejects a structured frame that disagrees with the bundle's own CRS", async () => {
    const mismatched = withAnchorFrame({
      center: "MOON",
      frame_class: "body_fixed",
      name: "MOON_PA",
    });
    await expect(resolveWorld({ manifestUrl }, stubFetch(mismatched))).rejects.toThrow(
      /refusing to guess which one the terrain is in/,
    );
  });

  it("rejects an anchor frame that is not body-fixed", async () => {
    // A tileset anchored in an inertial frame is not merely mislabelled — placing terrain from it
    // would spin the patch off the body. Reading only `name` would have missed this.
    const inertial = withAnchorFrame({ center: "MOON", frame_class: "inertial", name: "MOON_ME" });
    await expect(resolveWorld({ manifestUrl }, stubFetch(inertial))).rejects.toThrow(
      /must be body-fixed/,
    );
  });

  it("rejects an anchor frame centred on another body", async () => {
    const wrongBody = withAnchorFrame({
      center: "MARS",
      frame_class: "body_fixed",
      name: "MOON_ME",
    });
    await expect(resolveWorld({ manifestUrl }, stubFetch(wrongBody))).rejects.toThrow(
      /refusing to guess which body the terrain is on/,
    );
  });

  it("rejects a frame that is neither a name nor a ReferenceFrame", async () => {
    await expect(resolveWorld({ manifestUrl }, stubFetch(withAnchorFrame(42)))).rejects.toThrow(
      /must be a frame name or a ReferenceFrame object/,
    );
    await expect(resolveWorld({ manifestUrl }, stubFetch(withAnchorFrame("")))).rejects.toThrow(
      /must be a frame name/,
    );
    await expect(resolveWorld({ manifestUrl }, stubFetch(withAnchorFrame({})))).rejects.toThrow(
      /"tiles_anchor.frame.name" must be a frame name/,
    );
  });
});
