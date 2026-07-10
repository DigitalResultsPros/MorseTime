/**
 * Random practice groups for Koch-style lessons.
 * Length 2–5 from cumulative set, biased toward newChars.
 */

import { encodeChar } from './morse';
import { CURRICULUM } from './curriculum';

export type GroupGenOptions = {
  minLen?: number;
  maxLen?: number;
  /** Probability a slot prefers a new char (default 0.6). */
  newBias?: number;
};

function isEncodable(ch: string): boolean {
  try {
    encodeChar(ch);
    return true;
  } catch {
    return false;
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Build one random group string (no spaces) for a lesson.
 */
export function generateLessonGroup(
  cumulative: string[],
  newChars: string[],
  opts: GroupGenOptions = {}
): string {
  const minLen = opts.minLen ?? 2;
  const maxLen = opts.maxLen ?? 5;
  const newBias = opts.newBias ?? 0.6;

  const cum = cumulative.map((c) => c.toUpperCase()).filter(isEncodable);
  const neu = newChars.map((c) => c.toUpperCase()).filter(isEncodable);
  const pool = cum.length > 0 ? cum : neu;
  if (pool.length === 0) return 'K';

  const span = Math.max(0, maxLen - minLen);
  const len = minLen + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
  const chars: string[] = [];

  for (let i = 0; i < len; i++) {
    const preferNew = neu.length > 0 && Math.random() < newBias;
    const source = preferNew ? neu : pool;
    chars.push(pick(source.length > 0 ? source : pool));
  }

  return chars.join('');
}

export function generateLessonGroupForLesson(
  lessonNumber: number,
  opts?: GroupGenOptions
): string {
  const lesson = CURRICULUM.find((l) => l.lessonNumber === lessonNumber) ?? CURRICULUM[0]!;
  return generateLessonGroup(lesson.cumulative, lesson.newChars, opts);
}
