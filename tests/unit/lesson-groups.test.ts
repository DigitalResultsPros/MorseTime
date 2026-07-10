import { describe, expect, it } from 'vitest';
import { generateLessonGroup, generateLessonGroupForLesson } from '../../src/shared/lessonGroups';
import {
  CURRICULUM,
  FREE_LETTER_COUNT,
  FREE_LESSON_STEPS,
  hasCompletedIntro,
} from '../../src/shared/curriculum';
import { encodeChar } from '../../src/shared/morse';

describe('lessonGroups', () => {
  it('generates length within bounds from cumulative set', () => {
    const cum = ['K', 'M', 'R', 'S'];
    const neu = ['R', 'S'];
    for (let i = 0; i < 40; i++) {
      const g = generateLessonGroup(cum, neu, { minLen: 2, maxLen: 5 });
      expect(g.length).toBeGreaterThanOrEqual(2);
      expect(g.length).toBeLessThanOrEqual(5);
      for (const ch of g) {
        expect(cum).toContain(ch);
        expect(() => encodeChar(ch)).not.toThrow();
      }
    }
  });

  it('lesson 1 only uses K/M', () => {
    for (let i = 0; i < 20; i++) {
      const g = generateLessonGroupForLesson(1);
      for (const ch of g) {
        expect(['K', 'M']).toContain(ch);
      }
    }
  });

  it('covers free intro lessons without empty groups', () => {
    expect(CURRICULUM).toHaveLength(FREE_LESSON_STEPS);
    for (const lesson of CURRICULUM) {
      const g = generateLessonGroupForLesson(lesson.lessonNumber);
      expect(g.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('free intro is 4 steps and 5 letters ending in U', () => {
    expect(FREE_LESSON_STEPS).toBe(4);
    expect(FREE_LETTER_COUNT).toBe(5);
    const last = CURRICULUM[CURRICULUM.length - 1]!;
    expect(last.cumulative).toEqual(['K', 'M', 'R', 'S', 'U']);
    expect(last.cumulative).toHaveLength(FREE_LETTER_COUNT);
    expect(hasCompletedIntro([1, 2, 3, 4])).toBe(true);
    expect(hasCompletedIntro([1, 2, 3])).toBe(false);
  });
});
