import { describe, expect, it } from "vitest";

import {
  advance,
  createClock,
  DEFAULT_RATE,
  IDLE_CLOCK,
  pause,
  play,
  progress,
  seek,
  setRate,
} from "./clock";

describe("the shared clock", () => {
  it("starts parked at the beginning of its window, paused", () => {
    const clock = createClock(10, 70);
    expect(clock).toEqual({ startS: 10, endS: 70, tS: 10, playing: false, rate: DEFAULT_RATE });
  });

  it("refuses a window that is not finite, or that runs backwards", () => {
    expect(() => createClock(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => createClock(10, 5)).toThrow(/non-empty/);
    expect(() => createClock(Number.NaN, 1)).toThrow(RangeError);
  });

  it("refuses a non-positive playback rate — a clock that never advances is not a rate", () => {
    expect(() => createClock(0, 1, 0)).toThrow(/positive/);
    expect(() => setRate(createClock(0, 1), -2)).toThrow(/positive/);
    expect(setRate(createClock(0, 1), 8).rate).toBe(8);
  });

  describe("scrubbing", () => {
    it("clamps into the window rather than leaving it", () => {
      const clock = createClock(10, 70);
      expect(seek(clock, 40).tS).toBe(40);
      expect(seek(clock, -100).tS).toBe(10);
      expect(seek(clock, 1e9).tS).toBe(70);
    });

    it("does not change whether the clock is playing", () => {
      const playing = play(createClock(0, 10));
      expect(seek(playing, 5).playing).toBe(true);
      expect(seek(pause(playing), 5).playing).toBe(false);
    });

    it("refuses a non-finite target", () => {
      expect(() => seek(createClock(0, 10), Number.NaN)).toThrow(RangeError);
    });
  });

  describe("fixed-rate playback", () => {
    it("advances by elapsed wall time times the rate", () => {
      const clock = setRate(play(createClock(0, 100)), 4);
      expect(advance(clock, 0.5).tS).toBe(2);
      expect(advance(advance(clock, 0.5), 0.25).tS).toBe(3);
    });

    it("does not advance while paused, nor on a non-positive wall delta", () => {
      const paused = createClock(0, 100);
      expect(advance(paused, 10)).toBe(paused);

      const playing = play(paused);
      expect(advance(playing, 0)).toBe(playing);
      expect(advance(playing, -1)).toBe(playing);
    });

    it("stops at the end rather than looping — a silent restart is indistinguishable from a stall", () => {
      const clock = play(createClock(0, 10));
      const ended = advance(clock, 999);
      expect(ended.tS).toBe(10);
      expect(ended.playing).toBe(false);
      // And it stays there.
      expect(advance(ended, 5)).toBe(ended);
    });

    it("rewinds when told to play from the very end", () => {
      const ended = seek(createClock(0, 10), 10);
      const restarted = play(ended);
      expect(restarted.tS).toBe(0);
      expect(restarted.playing).toBe(true);
    });

    it("will not play an empty window", () => {
      const empty = createClock(5, 5);
      expect(play(empty)).toBe(empty);
      expect(play(empty).playing).toBe(false);
    });

    it("pausing an already-paused clock changes nothing", () => {
      const clock = createClock(0, 10);
      expect(pause(clock)).toBe(clock);
    });
  });

  describe("progress", () => {
    it("reports the fraction of the window elapsed", () => {
      const clock = createClock(100, 200);
      expect(progress(clock)).toBe(0);
      expect(progress(seek(clock, 150))).toBeCloseTo(0.5, 12);
      expect(progress(seek(clock, 200))).toBe(1);
    });

    it("is zero over an empty window, not NaN", () => {
      expect(progress(IDLE_CLOCK)).toBe(0);
      expect(progress(createClock(4, 4))).toBe(0);
    });
  });
});
