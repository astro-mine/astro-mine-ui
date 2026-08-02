import { describe, expect, it } from "vitest";

import { IDENTITY_POSE } from "../frames/pose";
import {
  AssetSourceError,
  resolveAsset,
  resolveFrameOffset,
  selectVisualGltf,
} from "./assetSource";
import type { GeometryRef } from "./assetSource";

// The *actual committed fixture*, emitted by Fleet's own exporter (scripts/gen-asset-fixture.py)
// from Fleet's own `prospecting-rover` library asset. Parsing it through the real ingest path is the
// ←Fleet contract test: if Fleet or Core changes SADF's shape, regenerating the fixture breaks this
// file rather than the browser.
import fixture from "../../fixtures/asset/prospecting-rover.sadf.json";

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

const documentUrl = "/asset/prospecting-rover.sadf.json";

describe("resolveAsset — the committed Fleet fixture", () => {
  it("resolves the real SADF document end to end", async () => {
    const asset = await resolveAsset({ documentUrl }, stubFetch(fixture));

    expect(asset.assetId).toBe("astro-mine.fleet.prospecting-rover");
    expect(asset.name).toBe("Prospecting Rover");
    expect(asset.kind).toBe("rover");
    expect(asset.version).toBe("0.1.0");
    expect(asset.lod).toBe(0);
    expect(asset.geometryOffset).toEqual(IDENTITY_POSE);
  });

  it("picks the visual glTF and ignores the USD and the collision hull", async () => {
    const asset = await resolveAsset({ documentUrl }, stubFetch(fixture));

    // The fixture declares four refs: visual/collision x gltf/usd. Exactly one is renderable.
    expect(fixture.asset.geometry).toHaveLength(4);
    expect(asset.gltfUrl.endsWith("/asset/geometry/prospecting-rover.glb")).toBe(true);
    expect(asset.gltfUrl).not.toContain("collision");
    expect(asset.gltfUrl).not.toContain(".usda");
  });

  it("resolves the geometry URI relative to the document", async () => {
    const asset = await resolveAsset(
      { documentUrl: "https://hub.example.org/assets/rover/asset.sadf.json" },
      stubFetch(fixture),
    );
    expect(asset.gltfUrl).toBe(
      "https://hub.example.org/assets/rover/geometry/prospecting-rover.glb",
    );
  });
});

describe("selectVisualGltf", () => {
  const ref = (role: "visual" | "collision", format: "usd" | "gltf", lod: number): GeometryRef => ({
    role,
    format,
    uri: `${role}-${format}-${lod}`,
    frame: "body",
    lod,
  });

  it("prefers the highest detail when no LOD is requested", () => {
    const chosen = selectVisualGltf([ref("visual", "gltf", 2), ref("visual", "gltf", 0)]);
    expect(chosen.lod).toBe(0);
  });

  it("honours a coarser LOD budget", () => {
    const geometry = [ref("visual", "gltf", 0), ref("visual", "gltf", 2), ref("visual", "gltf", 5)];
    expect(selectVisualGltf(geometry, 3).lod).toBe(2);
    expect(selectVisualGltf(geometry, 5).lod).toBe(5);
  });

  it("falls back to the finest mesh when the asset publishes nothing coarse enough", () => {
    // A distant asset asking for lod 4 must still render, not vanish.
    expect(selectVisualGltf([ref("visual", "gltf", 0)], 4).lod).toBe(0);
  });

  it("refuses a USD-only asset, loudly — Cesium cannot load USD in a browser", () => {
    expect(() => selectVisualGltf([ref("visual", "usd", 0), ref("collision", "usd", 0)])).toThrow(
      /declares no visual glTF geometry \(has: visual\/usd, collision\/usd\)/,
    );
  });

  it("refuses an asset whose only glTF is a collision hull", () => {
    expect(() => selectVisualGltf([ref("collision", "gltf", 0)])).toThrow(AssetSourceError);
  });
});

describe("resolveFrameOffset", () => {
  const offset = (x: number) => ({
    translation_m: { x, y: 0, z: 0 },
    rotation_quat_xyzw: { x: 0, y: 0, z: 0, w: 1 },
  });

  it("is identity for geometry declared in the root frame", () => {
    expect(resolveFrameOffset([{ name: "body" }], "body", "body")).toEqual(IDENTITY_POSE);
  });

  it("treats a frame with no transform as coincident with its parent", () => {
    const frames = [{ name: "body" }, { name: "mast", parent: "body" }];
    expect(resolveFrameOffset(frames, "body", "mast")).toEqual(IDENTITY_POSE);
  });

  it("composes a chain of transforms up to the root", () => {
    const frames = [
      { name: "body" },
      { name: "mast", parent: "body", transform: offset(1) },
      { name: "camera", parent: "mast", transform: offset(0.25) },
    ];
    const pose = resolveFrameOffset(frames, "body", "camera");
    expect(pose.translationM.xM).toBeCloseTo(1.25, 12);
  });

  it("applies the parent's rotation to the child's translation", () => {
    // `mast` is turned a quarter turn about +z, so the camera's +x offset lands on the body's +y.
    const frames = [
      { name: "body" },
      {
        name: "mast",
        parent: "body",
        transform: {
          translation_m: { x: 0, y: 0, z: 0 },
          rotation_quat_xyzw: { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 },
        },
      },
      { name: "camera", parent: "mast", transform: offset(2) },
    ];
    const pose = resolveFrameOffset(frames, "body", "camera");
    expect(pose.translationM.xM).toBeCloseTo(0, 12);
    expect(pose.translationM.yM).toBeCloseTo(2, 12);
  });

  it("rejects a frame the asset never defines", () => {
    expect(() => resolveFrameOffset([{ name: "body" }], "body", "ghost")).toThrow(
      /declared in frame "ghost", which the asset does not define/,
    );
  });

  it("rejects a frame tree that never reaches the root", () => {
    const frames = [{ name: "body" }, { name: "orphan" }];
    expect(() => resolveFrameOffset(frames, "body", "orphan")).toThrow(/disconnected/);
  });

  it("rejects a cycle rather than looping forever", () => {
    const frames = [{ name: "body" }, { name: "a", parent: "b" }, { name: "b", parent: "a" }];
    expect(() => resolveFrameOffset(frames, "body", "a")).toThrow(/cycle through/);
  });
});

describe("resolveAsset — fail loud", () => {
  it("rejects a document with no asset", async () => {
    await expect(resolveAsset({ documentUrl }, stubFetch({ sadf_version: "0.1" }))).rejects.toThrow(
      /it is not a SADF document/,
    );
  });

  it("rejects an asset with no geometry", async () => {
    const bare = { ...fixture, asset: { ...fixture.asset, geometry: [] } };
    await expect(resolveAsset({ documentUrl }, stubFetch(bare))).rejects.toThrow(
      /declares no "geometry"/,
    );
  });

  it("rejects a malformed geometry ref", async () => {
    const badRole = {
      ...fixture,
      asset: { ...fixture.asset, geometry: [{ ...fixture.asset.geometry[0], role: "decorative" }] },
    };
    await expect(resolveAsset({ documentUrl }, stubFetch(badRole))).rejects.toThrow(
      /is not a GeometryRole/,
    );
  });

  it("reports an unreachable, erroring, or non-JSON document as an AssetSourceError", async () => {
    await expect(
      resolveAsset({ documentUrl }, rejectingFetch(new Error("offline"))),
    ).rejects.toThrow(/could not fetch SADF asset/);
    await expect(
      resolveAsset({ documentUrl }, stubFetch(null, { ok: false, status: 404 })),
    ).rejects.toThrow(/returned HTTP 404/);
    await expect(
      resolveAsset(
        { documentUrl },
        stubFetch(null, { json: () => Promise.reject(new Error("x")) }),
      ),
    ).rejects.toThrow(/is not valid JSON/);
  });

  it("surfaces the underlying failure as the error's cause", async () => {
    const offline = new Error("offline");
    await expect(resolveAsset({ documentUrl }, rejectingFetch(offline))).rejects.toSatisfy(
      (error: AssetSourceError) => error.cause === offline,
    );
  });
});

describe("resolveAsset — host-supplied glTF", () => {
  it("passes the URL straight through, without fetching", async () => {
    const asset = await resolveAsset({ gltfUrl: "https://example.org/r.glb", assetId: "custom" });
    expect(asset.gltfUrl).toBe("https://example.org/r.glb");
    expect(asset.assetId).toBe("custom");
    expect(asset.geometryOffset).toEqual(IDENTITY_POSE);
  });
});
