/**
 * Free intro curriculum for the Reddit app only.
 *
 * Locked product (see project/design/training.md · DECISIONS.md):
 * - Lesson 1 = 2 letters (K M)
 * - Lessons 2–4 = +1 letter each (R, S, U)
 * - 4 free lessons · 5 free letters total
 * - Full path / other games live on morsetime.com (separate product — not this repo)
 */

export interface LessonDefinition {
  lessonNumber: number;
  newChars: string[];
  cumulative: string[];
  focus: string;
}

/** Free intro: 4 lessons (step 1 adds two letters). */
export const FREE_LESSON_STEPS = 4;

/** Distinct glyphs in the free intro: K M R S U. */
export const FREE_LETTER_COUNT = 5;

/** Highest lesson number in this Reddit app. */
export const MAX_LESSON_NUMBER = FREE_LESSON_STEPS;

/**
 * Reddit free intro only. Do not expand into a full web ladder here.
 */
export const CURRICULUM: LessonDefinition[] = [
  {
    lessonNumber: 1,
    newChars: ['K', 'M'],
    cumulative: ['K', 'M'],
    focus: 'Rhythm foundation',
  },
  {
    lessonNumber: 2,
    newChars: ['R'],
    cumulative: ['K', 'M', 'R'],
    focus: 'Add R',
  },
  {
    lessonNumber: 3,
    newChars: ['S'],
    cumulative: ['K', 'M', 'R', 'S'],
    focus: 'Add S',
  },
  {
    lessonNumber: 4,
    newChars: ['U'],
    cumulative: ['K', 'M', 'R', 'S', 'U'],
    focus: 'Add U · intro complete',
  },
];

export function getLesson(lessonNumber: number): LessonDefinition | undefined {
  return CURRICULUM.find((l) => l.lessonNumber === lessonNumber);
}

/** Intro complete when lesson 4 is cleared (implies prior steps if path was strict). */
export function hasCompletedIntro(completedLessons: number[]): boolean {
  return completedLessons.includes(FREE_LESSON_STEPS);
}
