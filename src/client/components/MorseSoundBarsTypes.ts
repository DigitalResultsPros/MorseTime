import type { MorseElement } from '../../shared/morse';

/** One tone event on the listen clock (drives on/off only — not a full string UI). */
export type ToneMark = {
  type: MorseElement;
  /** Offset from listen lead start, ms (same timeline as scheduled tones). */
  startMs: number;
  durationMs: number;
  charIndex: number;
};

/** Flatten char schedule into per-tone marks (same clock as listen audio). */
export function buildToneMarks(
  chars: { startMs: number; elements: MorseElement[] }[],
  timing: { ditMs: number; dahMs: number; intraCharGapMs: number },
  leadMs: number
): ToneMark[] {
  const marks: ToneMark[] = [];
  for (let ci = 0; ci < chars.length; ci++) {
    const ch = chars[ci]!;
    let t = leadMs + ch.startMs;
    for (let j = 0; j < ch.elements.length; j++) {
      const el = ch.elements[j]!;
      const durationMs = el === 'dit' ? timing.ditMs : timing.dahMs;
      marks.push({
        type: el,
        startMs: t,
        durationMs,
        charIndex: ci,
      });
      t += durationMs;
      if (j < ch.elements.length - 1) {
        t += timing.intraCharGapMs;
      }
    }
  }
  return marks;
}