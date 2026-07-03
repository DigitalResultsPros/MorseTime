import { describe, it, expect } from 'vitest';
import {
  ditMsFromWpm,
  wpmFromDitMs,
  effectiveWpm,
  getStandardParisDurationMs,
} from '../../src/shared/wpm';
import { TIMING_TOLERANCE_MS } from '../fixtures/timing-fixtures';

function assertApprox(actual: number, expected: number, tolerance = TIMING_TOLERANCE_MS) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('WPM Calculator', () => {
  describe('ditMsFromWpm', () => {
    it('WP-01: 20 WPM → 60ms', () => {
      assertApprox(ditMsFromWpm(20), 60);
    });

    it('WP-04: 1 WPM → 1200ms', () => {
      assertApprox(ditMsFromWpm(1), 1200);
    });

    it('WP-05: 100 WPM → 12ms', () => {
      assertApprox(ditMsFromWpm(100), 12);
    });
  });

  describe('wpmFromDitMs', () => {
    it('WP-02: 60ms → 20 WPM', () => {
      assertApprox(wpmFromDitMs(60), 20);
    });

    it('round-trip: wpm → ms → wpm', () => {
      for (const wpm of [1, 5, 10, 20, 40, 100]) {
        const ms = ditMsFromWpm(wpm);
        assertApprox(wpmFromDitMs(ms), wpm);
      }
    });
  });

  describe('getStandardParisDurationMs', () => {
    it('20 WPM → 3000ms (50 dit units)', () => {
      assertApprox(getStandardParisDurationMs(20), 3000);
    });
  });

  describe('effectiveWpm', () => {
    it('WP-03: calculates effective speed correctly', () => {
      // At 20 WPM char speed, PARIS takes 3000ms
      // If we stretch it to 6000ms, effective WPM = 10
      const result = effectiveWpm(20, 6000, 50);
      assertApprox(result, 10);
    });

    it('returns 0 for zero chars', () => {
      expect(effectiveWpm(20, 60000, 0)).toBe(0);
    });

    it('returns 0 for zero duration', () => {
      expect(effectiveWpm(20, 0, 50)).toBe(0);
    });
  });
});
