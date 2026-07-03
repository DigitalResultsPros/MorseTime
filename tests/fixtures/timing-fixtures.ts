/**
 * Shared test fixtures and helpers for timing tests.
 */

export const STANDARD_WPM = 20;
export const FARNSWORTH_CHAR_WPM = 20;
export const FARNSWORTH_EFFECTIVE_WPM = 5;
export const DIT_THRESHOLD_MS = 150;
export const DAH_MIN_MS = 150;
export const MAX_DAH_MS = 2000;
export const TONE_FREQUENCY_HZ = 700;
export const ATTACK_MS = 2;
export const RELEASE_MS = 2;

export const TIMING_TOLERANCE_MS = 2;

export function assertApprox(
  actual: number,
  expected: number,
  tolerance: number = TIMING_TOLERANCE_MS
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ~${expected}ms (±${tolerance}ms), got ${actual}ms`
    );
  }
}
