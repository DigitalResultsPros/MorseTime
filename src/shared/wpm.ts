/**
 * WPM (Words Per Minute) calculation utilities for Morse code.
 *
 * Standard: "PARIS" = 50 dit units = 1 word at 1 WPM
 */

export function ditMsFromWpm(wpm: number): number {
  return 1200 / wpm;
}

export function wpmFromDitMs(ditMs: number): number {
  return 1200 / ditMs;
}

export function effectiveWpm(
  charWpm: number,
  totalDurationMs: number,
  charCount: number
): number {
  if (charCount === 0 || totalDurationMs === 0) return 0;
  // Standard: 50 dit units per word
  // At charWpm, each char takes: 1 (dit) + (avg elements - 1) * 3 + 3 (gap)
  // Simplified: use total duration vs standard PARIS duration
  const standardParisDurationMs = ditMsFromWpm(charWpm) * 50;
  return (standardParisDurationMs / totalDurationMs) * charWpm;
}

export function getStandardParisDurationMs(wpm: number): number {
  return ditMsFromWpm(wpm) * 50;
}
