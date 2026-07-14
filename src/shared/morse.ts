/**
 * ITU-R M.1677-1 Morse code timing and encoding/decoding.
 */

export type MorseElement = 'dit' | 'dah';

export interface Timing {
  ditMs: number;
  dahMs: number;
  intraCharGapMs: number;
  interCharGapMs: number;
  wordGapMs: number;
}

export interface FarnsworthTiming extends Timing {
  charWpm: number;
  effectiveWpm: number;
}

export const MORSE_MAP: Record<string, MorseElement[]> = {
  A: ['dit', 'dah'],
  B: ['dah', 'dit', 'dit', 'dit'],
  C: ['dah', 'dit', 'dah', 'dit'],
  D: ['dah', 'dit', 'dit'],
  E: ['dit'],
  F: ['dit', 'dit', 'dah', 'dit'],
  G: ['dah', 'dah', 'dit'],
  H: ['dit', 'dit', 'dit', 'dit'],
  I: ['dit', 'dit'],
  J: ['dit', 'dah', 'dah', 'dah'],
  K: ['dah', 'dit', 'dah'],
  L: ['dit', 'dah', 'dit', 'dit'],
  M: ['dah', 'dah'],
  N: ['dah', 'dit'],
  O: ['dah', 'dah', 'dah'],
  P: ['dit', 'dah', 'dah', 'dit'],
  Q: ['dah', 'dah', 'dit', 'dah'],
  R: ['dit', 'dah', 'dit'],
  S: ['dit', 'dit', 'dit'],
  T: ['dah'],
  U: ['dit', 'dit', 'dah'],
  V: ['dit', 'dit', 'dit', 'dah'],
  W: ['dit', 'dah', 'dah'],
  X: ['dah', 'dit', 'dit', 'dah'],
  Y: ['dah', 'dit', 'dah', 'dah'],
  Z: ['dah', 'dah', 'dit', 'dit'],
  '0': ['dah', 'dah', 'dah', 'dah', 'dah'],
  '1': ['dit', 'dah', 'dah', 'dah', 'dah'],
  '2': ['dit', 'dit', 'dah', 'dah', 'dah'],
  '3': ['dit', 'dit', 'dit', 'dah', 'dah'],
  '4': ['dit', 'dit', 'dit', 'dit', 'dah'],
  '5': ['dit', 'dit', 'dit', 'dit', 'dit'],
  '6': ['dah', 'dit', 'dit', 'dit', 'dit'],
  '7': ['dah', 'dah', 'dit', 'dit', 'dit'],
  '8': ['dah', 'dah', 'dah', 'dit', 'dit'],
  '9': ['dah', 'dah', 'dah', 'dah', 'dit'],
  '.': ['dit', 'dah', 'dit', 'dah', 'dit', 'dah'],
  ',': ['dah', 'dah', 'dit', 'dit', 'dah', 'dah'],
  '?': ['dit', 'dit', 'dah', 'dah', 'dit', 'dit'],
  '/': ['dah', 'dit', 'dit', 'dah', 'dit'],
};

export function getDitMs(wpm: number): number {
  return 1200 / wpm;
}

export function getDahMs(wpm: number): number {
  return 3 * getDitMs(wpm);
}

export function getIntraCharGapMs(wpm: number): number {
  return getDitMs(wpm);
}

export function getInterCharGapMs(wpm: number): number {
  return 3 * getDitMs(wpm);
}

export function getWordGapMs(wpm: number): number {
  return 7 * getDitMs(wpm);
}

export function getStandardTiming(wpm: number): Timing {
  const dit = getDitMs(wpm);
  return {
    ditMs: dit,
    dahMs: 3 * dit,
    intraCharGapMs: dit,
    interCharGapMs: 3 * dit,
    wordGapMs: 7 * dit,
  };
}

/** ITU standard inter-character gap = 3 units. */
export const STANDARD_INTER_CHAR_UNITS = 3;

/**
 * Wide inter-character gap (units of dit) so letter boundaries stay clear
 * (E vs I vs S). Elements still play at full char WPM (Farnsworth-style).
 */
export const WIDE_INTER_CHAR_UNITS = 7;

/**
 * Standard element timing at `wpm`, with custom inter-character gap in dit units.
 * Intra-char gaps stay 1 unit; only between-letter silence stretches.
 */
export function getTimingWithInterCharUnits(
  wpm: number,
  interCharUnits: number = STANDARD_INTER_CHAR_UNITS
): Timing {
  const standard = getStandardTiming(wpm);
  const units = interCharUnits > 0 ? interCharUnits : STANDARD_INTER_CHAR_UNITS;
  return {
    ...standard,
    interCharGapMs: standard.ditMs * units,
  };
}

export function calculateFarnsworthTiming(
  charWpm: number,
  effectiveWpm: number
): FarnsworthTiming {
  const standard = getStandardTiming(charWpm);
  if (effectiveWpm >= charWpm) {
    return { ...standard, charWpm, effectiveWpm };
  }

  // Farnsworth: stretch gaps so effective speed is lower
  // Each character takes: 1 dit + (n-1)*3 dits + 3 dits inter-char gap
  // For a word of C chars: C*dit + (C-1)*3*dit + 7*dit = (4C + 4)*dit
  // We want effectiveWpm = (50 * C) / totalDuration_seconds
  // Solve for gap stretch factor
  const standardCharTime =
    standard.ditMs +
    (standard.dahMs - standard.ditMs) +
    standard.interCharGapMs;
  const targetTotalTime = (50 * standardCharTime) / effectiveWpm;
  const extraTime = targetTotalTime - standardCharTime;

  // Distribute extra time proportionally into inter-char and word gaps
  const stretchedInterChar = standard.interCharGapMs + extraTime * 0.7;
  const stretchedWord = standard.wordGapMs + extraTime * 0.3;

  return {
    ...standard,
    interCharGapMs: stretchedInterChar,
    wordGapMs: stretchedWord,
    charWpm,
    effectiveWpm,
  };
}

export function encode(char: string): MorseElement[] {
  const upper = char.toUpperCase();
  const result = MORSE_MAP[upper];
  if (!result) {
    throw new Error(`Cannot encode character: ${char}`);
  }
  return result;
}

/** Alias for single-character encode (letter-by-letter matching). */
export function encodeChar(char: string): MorseElement[] {
  return encode(char);
}

export function encodeString(str: string): MorseElement[][] {
  return str
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch === ' ') return [];
      return encode(ch);
    });
}

export function decode(elements: MorseElement[]): string {
  for (const [char, code] of Object.entries(MORSE_MAP)) {
    if (arraysEqual(elements, code)) return char;
  }
  return '?';
}

function arraysEqual(a: MorseElement[], b: MorseElement[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function isMorseEqual(a: MorseElement[], b: MorseElement[]): boolean {
  return arraysEqual(a, b);
}

/** True if `buffer` is a prefix of `target` (including equal). */
export function isMorsePrefix(buffer: MorseElement[], target: MorseElement[]): boolean {
  if (buffer.length > target.length) return false;
  return buffer.every((el, i) => el === target[i]);
}

export type LetterMatchResult = 'continue' | 'complete' | 'wrong';

/**
 * Match in-progress keying for one letter.
 * - complete: exact match
 * - wrong: not a prefix, or longer than target
 * - continue: proper prefix, still building
 */
export function matchLetterBuffer(
  buffer: MorseElement[],
  target: MorseElement[]
): LetterMatchResult {
  if (buffer.length === 0) return 'continue';
  if (buffer.length > target.length) return 'wrong';
  if (!isMorsePrefix(buffer, target)) return 'wrong';
  if (buffer.length === target.length) return 'complete';
  return 'continue';
}

/**
 * Dit/dah classification threshold (ms).
 * Midpoint between 1-unit dit and 3-unit dah at charWpm; fallback 150ms.
 */
export function ditDahThresholdMs(charWpm?: number): number {
  if (charWpm === undefined || charWpm <= 0 || !Number.isFinite(charWpm)) {
    return 150;
  }
  const dit = getDitMs(charWpm);
  return (dit + 3 * dit) / 2;
}

/** Display glyphs for live ·/− strip. */
export function elementsToGlyphs(elements: MorseElement[]): string {
  return elements.map((el) => (el === 'dit' ? '·' : '−')).join('');
}

/** Letters only (skip spaces) for letter-by-letter transmit index. */
export function lettersOnly(word: string): string {
  return word
    .toUpperCase()
    .split('')
    .filter((ch) => ch !== ' ')
    .join('');
}

export function getSequenceDurationMs(
  elements: MorseElement[],
  timing: Timing
): number {
  if (elements.length === 0) return 0;

  let duration = 0;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    duration += el === 'dit' ? timing.ditMs : timing.dahMs;
    if (i < elements.length - 1) {
      duration += timing.intraCharGapMs;
    }
  }
  return duration;
}

export function getStringDurationMs(
  chars: MorseElement[][],
  timing: Timing
): number {
  if (chars.length === 0) return 0;

  let duration = 0;
  for (let i = 0; i < chars.length; i++) {
    const charElements = chars[i]!;
    if (charElements.length === 0) {
      // word gap
      duration += timing.wordGapMs;
    } else {
      duration += getSequenceDurationMs(charElements, timing);
      if (i < chars.length - 1) {
        const next = chars[i + 1]!;
        if (next.length > 0) {
          duration += timing.interCharGapMs;
        }
        // If next is empty (space), the word gap will be added when we process the space
      }
    }
  }
  return duration;
}
