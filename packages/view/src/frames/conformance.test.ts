/**
 * Core's shared units conformance vectors, run against View's guard implementations
 * (RM-P1-VIEW-06; RM-P1-CORE-08; RFC-0007 Design §3; conventions.md §5).
 *
 * `conformance.json` is vendored byte-for-byte from `astro-mine-core`
 * (`src/astro_mine/core/units/schema/conformance.json`, rev 27ed80d…). It is the **data form** of
 * the frame/CRS/time guard rules: each case is `{name, valid, value}`, where `valid` is the verdict
 * `require_<kind>(value)` MUST produce. Running these vectors in View's own CI is what proves View's
 * TypeScript guards enforce the *same* rules as Core's Python reference — the anti-drift contract
 * that replaces the byte-for-byte PROJ-string mirror test (now retired).
 *
 * Scope of the vectors (RFC-0007 Design §3 rule 6): `body="EARTH"` + a WGS84/EPSG:4326 marker is
 * **valid at the waist** — the shared rule is a body/datum consistency check, not a ban. View's
 * stricter, component-local refusal of Earth CRSs is NOT encoded in the vectors; it is asserted
 * separately at the bottom of this file. So the planetary_crs vectors run against `validateCrsAtWaist`
 * (Core's rule), not View's stricter `requireCrs`.
 */

import { describe, expect, it } from "vitest";

import conformance from "./schema/conformance.json";
import { requireCrs, requireFrame, validateCrsAtWaist } from "./guards";
import { requireEpoch, requireEpochWindow } from "./time";
import type { PlanetaryCRS } from "./types";

/** One shared conformance case. `valid` is the verdict the matching guard MUST produce. */
interface Vector {
  readonly name: string;
  readonly valid: boolean;
  readonly value: unknown;
}

/**
 * The guard each section is run against. `si_unit` is intentionally `null`: SI units are a display
 * concern in View (`units.ts` formats them) and are not one of the six frame/CRS/time waist types in
 * `units.schema.json`, so View carries no SI-unit ingest guard. `planetary_crs` runs against Core's
 * waist rule (`validateCrsAtWaist`), per the scope note above.
 */
const RUNNERS: Record<string, ((value: unknown) => unknown) | null> = {
  reference_frame: requireFrame,
  epoch: requireEpoch,
  epoch_window: requireEpochWindow,
  planetary_crs: validateCrsAtWaist,
  si_unit: null,
};

const vectors = conformance as unknown as Record<string, Vector[] | string>;

describe("Core units conformance vectors (conformance.json — RM-P1-CORE-08, RFC-0007 Design §3)", () => {
  it("handles every section the vectors ship — a new Core section fails loudly, is not skipped", () => {
    const sections = Object.keys(vectors).filter((key) => !key.startsWith("$"));
    expect(sections.slice().sort()).toEqual(Object.keys(RUNNERS).slice().sort());
  });

  for (const [section, runner] of Object.entries(RUNNERS)) {
    if (runner === null) {
      it(`${section}: not part of View's ingest vocabulary — no guard, so not run`, () => {
        expect(Array.isArray(vectors[section])).toBe(true);
      });
      continue;
    }
    describe(section, () => {
      for (const vector of vectors[section] as Vector[]) {
        it(`${vector.valid ? "accepts" : "rejects"} ${vector.name}`, () => {
          if (vector.valid) {
            expect(() => runner(vector.value)).not.toThrow();
          } else {
            expect(() => runner(vector.value)).toThrow();
          }
        });
      }
    });
  }
});

describe("guard rules the vectors pin, asserted directly (conventions.md §5)", () => {
  it("rule 3: an ET-scaled epoch is accepted everywhere a TDB one is (SPICE ET ≡ TDB)", () => {
    expect(requireEpoch({ tdb_seconds: 1.23456789e8, scale: "et" })).toEqual({
      tdb_seconds: 1.23456789e8,
      scale: "et",
    });
    // …and ET/TDB are ordered against each other with no reinterpretation of the scale.
    expect(() =>
      requireEpochWindow({
        start: { tdb_seconds: 0, scale: "tdb" },
        end: { tdb_seconds: 86_400, scale: "et" },
      }),
    ).not.toThrow();
  });

  it("rule 4: reference_radius_m = +∞ is rejected in-language (JSON has no infinity literal)", () => {
    expect(() =>
      validateCrsAtWaist({
        body: "MOON",
        body_fixed_frame: "MOON_ME",
        reference_radius_m: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/positive, finite/);
  });

  it("rule 6: body=EARTH + a WGS84 datum is VALID at the waist", () => {
    const earthAnalog = {
      body: "EARTH",
      body_fixed_frame: "ITRF93",
      reference_radius_m: 6_378_137.0,
      projection: "+proj=longlat +datum=WGS84",
    };
    expect(() => validateCrsAtWaist(earthAnalog)).not.toThrow();
    expect((validateCrsAtWaist(earthAnalog) as PlanetaryCRS).body).toBe("EARTH");
  });
});

describe("View's Earth-CRS refusal is a component-local policy, stricter than Core's", () => {
  const earthAnalogWgs84 = {
    body: "EARTH",
    body_fixed_frame: "ITRF93",
    reference_radius_m: 6_378_137.0,
    projection: "+proj=longlat +datum=WGS84",
  };
  const earthAnalogEpsg = {
    body: "EARTH",
    body_fixed_frame: "ITRF93",
    reference_radius_m: 6_378_137.0,
    datum: "EPSG:4326",
  };

  it("accepts body=EARTH+WGS84 at the waist but View's requireCrs refuses it, with a distinct error", () => {
    // The waist rule (what the shared vectors assert) admits it…
    expect(() => validateCrsAtWaist(earthAnalogWgs84)).not.toThrow();
    // …but View renders planetary bodies only, so its ingest guard refuses it outright (view.md §2
    // principle 6). The error is View's, not the Core "defaulting bug" one.
    expect(() => requireCrs(earthAnalogWgs84)).toThrow(/View renders planetary bodies only/);
  });

  it("refuses a body=EARTH EPSG:4326 datum the same way", () => {
    expect(() => validateCrsAtWaist(earthAnalogEpsg)).not.toThrow();
    expect(() => requireCrs(earthAnalogEpsg)).toThrow(/View renders planetary bodies only/);
  });
});
