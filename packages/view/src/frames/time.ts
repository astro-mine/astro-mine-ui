/**
 * SPICE-time helpers: epochs in TDB/ET seconds past J2000.
 *
 * **View never renders a UTC timestamp.** Converting TDB to UTC requires leap-second and
 * relativistic-offset kernels, which live in `astro-mine-spice` (RFC-0002) — Core deliberately
 * carries the TDB seconds and nothing else. Displaying a TDB instant with a `Z`/UTC label would be a
 * quietly wrong time, so every string this module produces is suffixed `TDB`.
 *
 * The calendar rendering below *is* exact: TDB is a uniform SI-second scale with no leap seconds, so
 * days are exactly 86 400 s and civil-calendar arithmetic from the J2000 epoch is well-defined.
 */

import { FramesValidationError } from "./guards";
import { TimeScale } from "./types";
import type { Epoch, EpochWindow } from "./types";

/** The J2000 TDB epoch expressed as a JavaScript epoch offset: 2000-01-01T12:00:00 TDB. */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const SCALES: readonly string[] = Object.values(TimeScale);

/** Construct an `Epoch` from TDB seconds past J2000. */
export function epochFromTdbSeconds(tdbSeconds: number, scale: TimeScale = TimeScale.TDB): Epoch {
  if (!Number.isFinite(tdbSeconds)) {
    throw new FramesValidationError(`tdb_seconds must be finite, got ${tdbSeconds}`);
  }
  return { tdb_seconds: tdbSeconds, scale };
}

/**
 * Validate an epoch, failing loudly on a missing or non-ephemeris time scale.
 *
 * Reads Core's snake_case `tdb_seconds`; also tolerates View's historical `tdbSeconds` as a
 * documented ingest affordance (see `guards.ts`).
 */
export function requireEpoch(value: unknown): Epoch {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new FramesValidationError(
      "an epoch is required; none was given (no implicit time scale)",
    );
  }
  const raw = value as Record<string, unknown>;
  const seconds = raw.tdb_seconds ?? raw.tdbSeconds;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    throw new FramesValidationError(
      `tdb_seconds must be a finite number, got ${JSON.stringify(seconds)}`,
    );
  }
  const scale = raw.scale;
  if (typeof scale !== "string" || !SCALES.includes(scale)) {
    throw new FramesValidationError(
      `epoch scale must be one of ${SCALES.join(", ")} (a civil scale such as UTC cannot be ` +
        `represented at the waist), got ${JSON.stringify(scale)}`,
    );
  }
  return { tdb_seconds: seconds, scale: scale as TimeScale };
}

/** Validate a half-open epoch window `[start, end)`. */
export function requireEpochWindow(value: unknown): EpochWindow {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new FramesValidationError("an epoch window is required; none was given");
  }
  const raw = value as Record<string, unknown>;
  const start = requireEpoch(raw.start);
  const end = requireEpoch(raw.end);
  if (end.tdb_seconds <= start.tdb_seconds) {
    throw new FramesValidationError(
      `EpochWindow end must be strictly after start (start=${start.tdb_seconds}, end=${end.tdb_seconds})`,
    );
  }
  return { start, end };
}

/**
 * Render an epoch as a TDB calendar instant, e.g. `2026-07-08T12:34:56.789 TDB`.
 *
 * The `TDB` suffix is mandatory and the ISO `Z` is deliberately absent — this is not a UTC time.
 */
export function formatEpoch(epoch: Epoch, fractionDigits = 3): string {
  const calendar = new Date(J2000_MS + epoch.tdb_seconds * 1000);
  if (Number.isNaN(calendar.getTime())) {
    throw new FramesValidationError(
      `epoch is not representable as a calendar date: ${epoch.tdb_seconds}`,
    );
  }
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  const seconds = calendar.getUTCSeconds() + calendar.getUTCMilliseconds() / 1000;
  const label = epoch.scale === TimeScale.ET ? "ET" : "TDB";
  return (
    `${pad(calendar.getUTCFullYear(), 4)}-${pad(calendar.getUTCMonth() + 1)}-${pad(calendar.getUTCDate())}` +
    `T${pad(calendar.getUTCHours())}:${pad(calendar.getUTCMinutes())}:` +
    `${seconds.toFixed(fractionDigits).padStart(fractionDigits > 0 ? fractionDigits + 3 : 2, "0")} ${label}`
  );
}

/** Render an epoch as its raw ephemeris-time offset, e.g. `J2000+8.3000e+8 s TDB`. */
export function formatEphemerisSeconds(epoch: Epoch): string {
  const label = epoch.scale === TimeScale.ET ? "ET" : "TDB";
  const sign = epoch.tdb_seconds < 0 ? "-" : "+";
  return `J2000${sign}${Math.abs(epoch.tdb_seconds).toExponential(4)} s ${label}`;
}
