import { describe, it, expect } from 'vitest';
import type { MorseElement } from '../../src/shared/morse';
import {
  getDitMs,
  getDahMs,
  getIntraCharGapMs,
  getInterCharGapMs,
  getWordGapMs,
  getStandardTiming,
  getTimingWithInterCharUnits,
  STANDARD_INTER_CHAR_UNITS,
  WIDE_INTER_CHAR_UNITS,
  calculateFarnsworthTiming,
  encode,
  encodeChar,
  encodeString,
  decode,
  getSequenceDurationMs,
  getStringDurationMs,
  isMorsePrefix,
  matchLetterBuffer,
  ditDahThresholdMs,
  elementsToGlyphs,
  lettersOnly,
} from '../../src/shared/morse';
import { TIMING_TOLERANCE_MS } from '../fixtures/timing-fixtures';

function assertApprox(actual: number, expected: number, tolerance = TIMING_TOLERANCE_MS) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('MorseCodec — ITU-R M.1677-1 Timing', () => {
  describe('getDitMs', () => {
    it('MC-01: 20 WPM → 60ms', () => {
      expect(getDitMs(20)).toBeCloseTo(60, 0);
    });

    it('MC-11: 5 WPM → 240ms', () => {
      expect(getDitMs(5)).toBeCloseTo(240, 0);
    });

    it('MC-12: 40 WPM → 30ms', () => {
      expect(getDitMs(40)).toBeCloseTo(30, 0);
    });
  });

  describe('getDahMs', () => {
    it('MC-02: 20 WPM → 180ms (3 × dit)', () => {
      expect(getDahMs(20)).toBeCloseTo(180, 0);
    });
  });

  describe('getIntraCharGapMs', () => {
    it('MC-03: 20 WPM → 60ms', () => {
      expect(getIntraCharGapMs(20)).toBeCloseTo(60, 0);
    });
  });

  describe('getInterCharGapMs', () => {
    it('MC-04: 20 WPM → 180ms', () => {
      expect(getInterCharGapMs(20)).toBeCloseTo(180, 0);
    });
  });

  describe('getWordGapMs', () => {
    it('MC-05: 20 WPM → 420ms (7 × dit)', () => {
      expect(getWordGapMs(20)).toBeCloseTo(420, 0);
    });
  });

  describe('getStandardTiming', () => {
    it('returns correct timing at 20 WPM', () => {
      const t = getStandardTiming(20);
      expect(t.ditMs).toBeCloseTo(60, 0);
      expect(t.dahMs).toBeCloseTo(180, 0);
      expect(t.intraCharGapMs).toBeCloseTo(60, 0);
      expect(t.interCharGapMs).toBeCloseTo(180, 0);
      expect(t.wordGapMs).toBeCloseTo(420, 0);
    });
  });

  describe('getTimingWithInterCharUnits', () => {
    it('keeps element speed; stretches inter-char only', () => {
      const std = getStandardTiming(20);
      const wide = getTimingWithInterCharUnits(20, WIDE_INTER_CHAR_UNITS);
      expect(wide.ditMs).toBeCloseTo(std.ditMs, 0);
      expect(wide.dahMs).toBeCloseTo(std.dahMs, 0);
      expect(wide.intraCharGapMs).toBeCloseTo(std.intraCharGapMs, 0);
      expect(wide.interCharGapMs).toBeCloseTo(std.ditMs * WIDE_INTER_CHAR_UNITS, 0);
      expect(wide.interCharGapMs).toBeGreaterThan(std.interCharGapMs);
    });

    it('standard units match getStandardTiming', () => {
      const a = getStandardTiming(20);
      const b = getTimingWithInterCharUnits(20, STANDARD_INTER_CHAR_UNITS);
      expect(b.interCharGapMs).toBeCloseTo(a.interCharGapMs, 0);
    });
  });
});

describe('MorseCodec — Farnsworth Timing', () => {
  it('MC-08: 20/5 WPM stretches gaps', () => {
    const t = calculateFarnsworthTiming(20, 5);
    expect(t.charWpm).toBe(20);
    expect(t.effectiveWpm).toBe(5);
    expect(t.ditMs).toBeCloseTo(60, 0);
    expect(t.dahMs).toBeCloseTo(180, 0);
    // Gaps should be stretched beyond standard
    expect(t.interCharGapMs).toBeGreaterThan(180);
    expect(t.wordGapMs).toBeGreaterThan(420);
  });

  it('MC-09: 20/20 WPM = standard timing', () => {
    const standard = getStandardTiming(20);
    const farnsworth = calculateFarnsworthTiming(20, 20);
    expect(farnsworth.interCharGapMs).toBeCloseTo(standard.interCharGapMs, 0);
    expect(farnsworth.wordGapMs).toBeCloseTo(standard.wordGapMs, 0);
  });
});

describe('MorseCodec — Encoding', () => {
  it('MC-06: encode("K") → dah-dit-dah', () => {
    expect(encode('K')).toEqual(['dah', 'dit', 'dah']);
  });

  it('MC-07: encodeString("SOS") → ...---...', () => {
    expect(encodeString('SOS')).toEqual([
      ['dit', 'dit', 'dit'],
      ['dah', 'dah', 'dah'],
      ['dit', 'dit', 'dit'],
    ]);
  });

  it('throws on unknown character', () => {
    expect(() => encode('!')).toThrow();
  });
});

describe('MorseCodec — Decoding', () => {
  it('MC-10: decode([dit,dit,dit]) → S', () => {
    expect(decode(['dit', 'dit', 'dit'])).toBe('S');
  });

  it('decode unknown sequence → ?', () => {
    expect(decode(['dit', 'dah', 'dit', 'dah', 'dit', 'dah', 'dit'])).toBe('?');
  });
});

describe('MorseCodec — Duration Calculations', () => {
  const timing20 = getStandardTiming(20);

  it('single dit duration', () => {
    assertApprox(getSequenceDurationMs(['dit'], timing20), 60);
  });

  it('single dah duration', () => {
    assertApprox(getSequenceDurationMs(['dah'], timing20), 180);
  });

  it('dit-dah sequence includes intra-char gap', () => {
    // dit(60) + gap(60) + dah(180) = 300
    assertApprox(getSequenceDurationMs(['dit', 'dah'], timing20), 300);
  });

  it('string "SOS" duration at 20 WPM', () => {
    const chars = encodeString('SOS');
    // S: 3 dits + 2 gaps = 3*60 + 2*60 = 300
    // gap between S and O: 180
    // O: 3 dahs + 2 gaps = 3*180 + 2*60 = 660
    // gap between O and S: 180
    // S: 300
    const expected = 300 + 180 + 660 + 180 + 300;
    assertApprox(getStringDurationMs(chars, timing20), expected);
  });

  it('word gap for space', () => {
    const chars: MorseElement[][] = [['dit'], [], ['dit']];
    // dit(60) + word gap(420) + dit(60) = 540
    assertApprox(getStringDurationMs(chars, timing20), 540);
  });
});

describe('MorseCodec — letter match helpers', () => {
  it('encodeChar matches encode', () => {
    expect(encodeChar('R')).toEqual(encode('R'));
  });

  it('isMorsePrefix accepts proper prefixes', () => {
    const target = encode('C'); // dah dit dah dit
    expect(isMorsePrefix([], target)).toBe(true);
    expect(isMorsePrefix(['dah'], target)).toBe(true);
    expect(isMorsePrefix(['dah', 'dit'], target)).toBe(true);
    expect(isMorsePrefix(['dit'], target)).toBe(false);
  });

  it('matchLetterBuffer: continue / complete / wrong', () => {
    const target = encode('A'); // dit dah
    expect(matchLetterBuffer([], target)).toBe('continue');
    expect(matchLetterBuffer(['dit'], target)).toBe('continue');
    expect(matchLetterBuffer(['dit', 'dah'], target)).toBe('complete');
    expect(matchLetterBuffer(['dah'], target)).toBe('wrong');
    expect(matchLetterBuffer(['dit', 'dah', 'dit'], target)).toBe('wrong');
  });

  it('ditDahThresholdMs: midpoint at 20 WPM is 120ms', () => {
    // dit=60, dah=180 → midpoint 120
    expect(ditDahThresholdMs(20)).toBeCloseTo(120, 0);
  });

  it('ditDahThresholdMs: fallback 150 when missing', () => {
    expect(ditDahThresholdMs()).toBe(150);
    expect(ditDahThresholdMs(0)).toBe(150);
  });

  it('elementsToGlyphs formats ·/−', () => {
    expect(elementsToGlyphs(['dit', 'dah', 'dit'])).toBe('·−·');
  });

  it('lettersOnly strips spaces', () => {
    expect(lettersOnly('hi there')).toBe('HITHERE');
  });
});
