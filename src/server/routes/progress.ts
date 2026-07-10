import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type {
  LessonGroupSubmitRequest,
  LessonGroupSubmitResponse,
  LessonState,
  LessonStateResponse,
  PassGroupStat,
  ProgressUpdateResponse,
} from '../../shared/api';
import {
  CURRICULUM,
  FREE_LESSON_STEPS,
  MAX_LESSON_NUMBER,
} from '../../shared/curriculum';
import { resolveMemberId, resolveUsername, todayUtc } from '../core/dailyBoard';

export const progress = new Hono();

const PASS_GROUPS = 10;
const PASS_ACCURACY = 0.9;

function userProgressKey(memberId: string): string {
  return `progress:user:${memberId}`;
}

function userCharKey(memberId: string, char: string): string {
  return `char:user:${memberId}:${char}`;
}

function defaultLessonState(): LessonState {
  const lesson1 = CURRICULUM[0];
  return {
    currentLesson: 1,
    chars: lesson1?.cumulative ?? [],
    masteredChars: [],
    totalCorrect: 0,
    totalAttempts: 0,
    passGroupsCompleted: 0,
    passLetterCorrect: 0,
    passLetterAttempts: 0,
    passRecentGroups: [],
    practiceStreakDays: 0,
    lastPracticeDate: '',
    completedLessons: [],
  };
}

function recomputePassTotals(groups: PassGroupStat[]): {
  passGroupsCompleted: number;
  passLetterCorrect: number;
  passLetterAttempts: number;
} {
  let passLetterCorrect = 0;
  let passLetterAttempts = 0;
  for (const g of groups) {
    passLetterCorrect += g.correct;
    passLetterAttempts += g.attempts;
  }
  return {
    passGroupsCompleted: Math.min(PASS_GROUPS, groups.length),
    passLetterCorrect,
    passLetterAttempts,
  };
}

function accuracyPct(correct: number, attempts: number): number | null {
  if (attempts <= 0) return null;
  return Math.round((100 * correct) / attempts);
}

function normalizeState(raw: unknown): LessonState {
  const base = defaultLessonState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<LessonState>;
  const currentLesson = Math.min(
    MAX_LESSON_NUMBER,
    Math.max(1, Math.round(Number(s.currentLesson) || 1))
  );
  const lesson = CURRICULUM.find((l) => l.lessonNumber === currentLesson) ?? CURRICULUM[0];
  const passRecentGroups = Array.isArray(s.passRecentGroups)
    ? s.passRecentGroups
        .filter(
          (g): g is PassGroupStat =>
            !!g &&
            typeof g === 'object' &&
            Number.isFinite((g as PassGroupStat).correct) &&
            Number.isFinite((g as PassGroupStat).attempts)
        )
        .map((g) => ({
          correct: Math.max(0, Math.round(g.correct)),
          attempts: Math.max(0, Math.round(g.attempts)),
        }))
        .slice(-PASS_GROUPS)
    : [];
  const totals = recomputePassTotals(passRecentGroups);
  return {
    currentLesson,
    chars: Array.isArray(s.chars) ? s.chars : (lesson?.cumulative ?? []),
    masteredChars: Array.isArray(s.masteredChars) ? s.masteredChars : [],
    totalCorrect: Math.max(0, Math.round(Number(s.totalCorrect) || 0)),
    totalAttempts: Math.max(0, Math.round(Number(s.totalAttempts) || 0)),
    passGroupsCompleted: totals.passGroupsCompleted,
    passLetterCorrect: totals.passLetterCorrect,
    passLetterAttempts: totals.passLetterAttempts,
    passRecentGroups,
    practiceStreakDays: Math.max(0, Math.round(Number(s.practiceStreakDays) || 0)),
    lastPracticeDate: typeof s.lastPracticeDate === 'string' ? s.lastPracticeDate : '',
    completedLessons: Array.isArray(s.completedLessons)
      ? s.completedLessons.filter(
          (n): n is number =>
            typeof n === 'number' && n >= 1 && n <= MAX_LESSON_NUMBER
        )
      : [],
  };
}

function touchPracticeStreak(state: LessonState): void {
  const today = todayUtc();
  if (state.lastPracticeDate === today) return;
  if (!state.lastPracticeDate) {
    state.practiceStreakDays = 1;
  } else {
    const prev = new Date(`${state.lastPracticeDate}T12:00:00.000Z`).getTime();
    const now = new Date(`${today}T12:00:00.000Z`).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const delta = Math.round((now - prev) / dayMs);
    state.practiceStreakDays = delta === 1 ? state.practiceStreakDays + 1 : 1;
  }
  state.lastPracticeDate = today;
}

async function loadState(memberId: string): Promise<LessonState> {
  const key = userProgressKey(memberId);
  const cached = await redis.get(key);
  if (cached) return normalizeState(JSON.parse(cached));
  const state = defaultLessonState();
  await redis.set(key, JSON.stringify(state));
  return state;
}

async function saveState(memberId: string, state: LessonState): Promise<void> {
  await redis.set(userProgressKey(memberId), JSON.stringify(state));
}

progress.get('/lesson-state', async (c) => {
  const username = await resolveUsername();
  const memberId = resolveMemberId(username);
  if (!memberId || memberId === 'name:anonymous') {
    return c.json<LessonStateResponse>({
      type: 'lesson-state',
      state: defaultLessonState(),
    });
  }

  const state = await loadState(memberId);
  return c.json<LessonStateResponse>({ type: 'lesson-state', state });
});

/**
 * Record a completed practice group toward Pass (10 groups · ≥90% letters, last-10 window).
 */
progress.post('/lesson-group', async (c) => {
  const username = await resolveUsername();
  const memberId = resolveMemberId(username);
  if (!memberId || memberId === 'name:anonymous') {
    return c.json({ status: 'error', message: 'Sign in to save progress' }, 401);
  }

  let body: LessonGroupSubmitRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const lessonNumber = Math.round(Number(body.lessonNumber));
  const letterCorrect = Math.max(0, Math.round(Number(body.letterCorrect)));
  const letterAttempts = Math.max(0, Math.round(Number(body.letterAttempts)));

  if (
    !Number.isFinite(lessonNumber) ||
    lessonNumber < 1 ||
    lessonNumber > MAX_LESSON_NUMBER
  ) {
    return c.json({ status: 'error', message: 'Invalid lessonNumber' }, 400);
  }
  if (!Number.isFinite(letterAttempts) || letterAttempts < 1) {
    return c.json({ status: 'error', message: 'Invalid letterAttempts' }, 400);
  }
  if (letterCorrect > letterAttempts) {
    return c.json({ status: 'error', message: 'letterCorrect > letterAttempts' }, 400);
  }

  const state = await loadState(memberId);
  const unlocked =
    lessonNumber <= state.currentLesson || state.completedLessons.includes(lessonNumber);
  if (!unlocked) {
    return c.json({ status: 'error', message: 'Lesson locked' }, 403);
  }

  touchPracticeStreak(state);
  state.totalCorrect += letterCorrect;
  state.totalAttempts += letterAttempts;

  let lessonPassed = false;

  // Pass progress only on the current in-progress lesson
  if (lessonNumber === state.currentLesson && !state.completedLessons.includes(lessonNumber)) {
    const nextGroups: PassGroupStat[] = [
      ...state.passRecentGroups,
      { correct: letterCorrect, attempts: letterAttempts },
    ].slice(-PASS_GROUPS);
    state.passRecentGroups = nextGroups;
    const totals = recomputePassTotals(nextGroups);
    state.passGroupsCompleted = totals.passGroupsCompleted;
    state.passLetterCorrect = totals.passLetterCorrect;
    state.passLetterAttempts = totals.passLetterAttempts;

    const acc =
      totals.passLetterAttempts > 0
        ? totals.passLetterCorrect / totals.passLetterAttempts
        : 0;
    if (nextGroups.length >= PASS_GROUPS && acc >= PASS_ACCURACY) {
      lessonPassed = true;
      if (!state.completedLessons.includes(lessonNumber)) {
        state.completedLessons.push(lessonNumber);
      }
      // Free intro only: unlock next until FREE_LESSON_STEPS; no lesson 5 in this app
      if (lessonNumber < FREE_LESSON_STEPS) {
        const next = lessonNumber + 1;
        state.currentLesson = next;
        const def = CURRICULUM.find((l) => l.lessonNumber === next);
        state.chars = def?.cumulative ?? state.chars;
      } else {
        // Intro complete — stay on lesson 4 for optional drill
        state.currentLesson = FREE_LESSON_STEPS;
        const def = CURRICULUM.find((l) => l.lessonNumber === FREE_LESSON_STEPS);
        state.chars = def?.cumulative ?? state.chars;
      }
      state.passRecentGroups = [];
      state.passGroupsCompleted = 0;
      state.passLetterCorrect = 0;
      state.passLetterAttempts = 0;
    }
  }

  await saveState(memberId, state);

  const accPct = accuracyPct(state.passLetterCorrect, state.passLetterAttempts);

  return c.json<LessonGroupSubmitResponse>({
    type: 'lesson-group',
    state,
    lessonPassed,
    accuracyPct: accPct,
  });
});

progress.post('/progress', async (c) => {
  const username = await resolveUsername();
  const memberId = resolveMemberId(username);
  if (!memberId || memberId === 'name:anonymous') {
    return c.json({ status: 'error', message: 'Sign in to save progress' }, 401);
  }

  let body: { char: string; correct: boolean; latencyMs: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { char, correct, latencyMs } = body;
  if (typeof char !== 'string' || char.length < 1) {
    return c.json({ status: 'error', message: 'Invalid char' }, 400);
  }

  const state = await loadState(memberId);
  state.totalAttempts += 1;
  if (correct) state.totalCorrect += 1;

  const charKey = userCharKey(memberId, char);
  const charData = await redis.get(charKey);
  const charMastery = charData
    ? (JSON.parse(charData) as { correct: number; total: number; avgLatencyMs: number })
    : { correct: 0, total: 0, avgLatencyMs: 0 };

  charMastery.total += 1;
  if (correct) charMastery.correct += 1;
  charMastery.avgLatencyMs = (charMastery.avgLatencyMs + Number(latencyMs || 0)) / 2;

  const accuracy = charMastery.correct / charMastery.total;
  if (charMastery.total >= 20 && accuracy >= 0.95) {
    if (!state.masteredChars.includes(char)) {
      state.masteredChars.push(char);
    }
  }

  await saveState(memberId, state);
  await redis.set(charKey, JSON.stringify(charMastery));

  return c.json<ProgressUpdateResponse>({
    type: 'progress-update',
    updated: true,
  });
});
