import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';
import type {
  LessonStateResponse,
  ProgressUpdateResponse,
} from '../../shared/api';
import { CURRICULUM } from '../../shared/curriculum';

export const progress = new Hono();

progress.get('/lesson-state', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json({ status: 'error', message: 'postId missing' }, 400);
  }

  const key = `progress:${postId}`;
  const cached = await redis.get(key);

  if (cached) {
    const state = JSON.parse(cached);
    return c.json<LessonStateResponse>({
      type: 'lesson-state',
      state,
    });
  }

  // Initialize new user
  const state = {
    currentLesson: 1,
    chars: CURRICULUM[0]?.cumulative ?? [],
    masteredChars: [],
    totalCorrect: 0,
    totalAttempts: 0,
  };

  await redis.set(key, JSON.stringify(state));

  return c.json<LessonStateResponse>({
    type: 'lesson-state',
    state,
  });
});

progress.post('/progress', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json({ status: 'error', message: 'postId missing' }, 400);
  }

  const body = await c.req.json<{ char: string; correct: boolean; latencyMs: number }>();
  const { char, correct, latencyMs } = body;

  const key = `progress:${postId}`;
  const cached = await redis.get(key);

  if (!cached) {
    return c.json({ status: 'error', message: 'No progress found' }, 400);
  }

  const state = JSON.parse(cached);
  state.totalAttempts += 1;
  if (correct) state.totalCorrect += 1;

  // Track per-char mastery
  const charKey = `char:${postId}:${char}`;
  const charData = await redis.get(charKey);
  const charMastery = charData ? JSON.parse(charData) : { correct: 0, total: 0, avgLatencyMs: 0 };

  charMastery.total += 1;
  if (correct) charMastery.correct += 1;
  charMastery.avgLatencyMs = (charMastery.avgLatencyMs + latencyMs) / 2;

  // Check mastery
  const accuracy = charMastery.correct / charMastery.total;
  if (charMastery.total >= 20 && accuracy >= 0.95) {
    if (!state.masteredChars.includes(char)) {
      state.masteredChars.push(char);
    }
  }

  await redis.set(key, JSON.stringify(state));
  await redis.set(charKey, JSON.stringify(charMastery));

  return c.json<ProgressUpdateResponse>({
    type: 'progress-update',
    updated: true,
  });
});
