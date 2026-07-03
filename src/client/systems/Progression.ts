/**
 * Koch method progression system.
 * Lessons add one character at a time; mastery is tracked per character.
 */

export interface CharMastery {
  char: string;
  correct: number;
  total: number;
  avgLatencyMs: number;
  lastPracticed: number; // timestamp
  mastered: boolean;
}

import { CURRICULUM } from '../../shared/curriculum';

export const MASTERY_THRESHOLD = 0.95; // 95% correct
export const MASTERY_TRIALS = 20; // minimum trials before mastery check

export class Progression {
  private mastery: Map<string, CharMastery> = new Map();
  private currentLesson: number = 1;

  getCurrentLesson(): number {
    return this.currentLesson;
  }

  getLessonChars(lessonNumber: number): string[] {
    const lesson = CURRICULUM.find((l) => l.lessonNumber === lessonNumber);
    return lesson?.cumulative ?? [];
  }

  getCurrentChars(): string[] {
    return this.getLessonChars(this.currentLesson);
  }

  recordAttempt(char: string, correct: boolean, latencyMs: number): void {
    const existing = this.mastery.get(char);
    if (existing) {
      existing.total += 1;
      existing.correct += correct ? 1 : 0;
      existing.avgLatencyMs = (existing.avgLatencyMs + latencyMs) / 2;
      existing.lastPracticed = Date.now();
      if (existing.total >= MASTERY_TRIALS && existing.correct / existing.total >= MASTERY_THRESHOLD) {
        existing.mastered = true;
      }
    } else {
      this.mastery.set(char, {
        char,
        correct: correct ? 1 : 0,
        total: 1,
        avgLatencyMs: latencyMs,
        lastPracticed: Date.now(),
        mastered: false,
      });
    }

    this.checkAdvancement();
  }

  isCharMastered(char: string): boolean {
    return this.mastery.get(char)?.mastered ?? false;
  }

  getMastery(char: string): CharMastery | undefined {
    return this.mastery.get(char);
  }

  getAllMastery(): CharMastery[] {
    return Array.from(this.mastery.values());
  }

  getStats(): { totalCorrect: number; totalAttempts: number; accuracy: number } {
    let totalCorrect = 0;
    let totalAttempts = 0;
    for (const m of this.mastery.values()) {
      totalCorrect += m.correct;
      totalAttempts += m.total;
    }
    return {
      totalCorrect,
      totalAttempts,
      accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
    };
  }

  private checkAdvancement(): void {
    const currentChars = this.getCurrentChars();
    const allMastered = currentChars.every((char) => this.isCharMastered(char));
    if (allMastered && this.currentLesson < CURRICULUM.length) {
      this.currentLesson += 1;
    }
  }

  load(state: { currentLesson: number; masteredChars: { char: string; correct: number; total: number; avgLatencyMs: number; lastPracticed: number; mastered: boolean }[] }): void {
    this.currentLesson = state.currentLesson;
    this.mastery.clear();
    for (const m of state.masteredChars) {
      this.mastery.set(m.char, m);
    }
  }

  serialize(): { currentLesson: number; masteredChars: CharMastery[] } {
    return {
      currentLesson: this.currentLesson,
      masteredChars: this.getAllMastery(),
    };
  }
}
