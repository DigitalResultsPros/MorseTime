import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';
import type {
  LeaderboardResponse,
  LeaderboardSubmitRequest,
  LeaderboardSubmitResponse,
} from '../../shared/api';
import {
  boardKey,
  metaKey,
  todayUtc,
  resolveUsername,
  resolveMemberId,
  loadMeta,
  buildEntries,
  rankOf,
  computeWpm,
  loadDailyStreak,
  touchDailyStreak,
  recordParticipant,
  getParticipantCount,
  minPlausibleMs,
  validateDailyToken,
  MIN_ELAPSED_MS,
  MAX_ELAPSED_MS,
  MAX_LETTERS,
  type StoredScore,
} from '../core/dailyBoard';
import { ensureStickyBoardComment, syncStickyBoardComment } from '../core/boardComment';

export const leaderboard = new Hono();

leaderboard.get('/leaderboard', async (c) => {
  const date = todayUtc();
  const entries = await buildEntries(date);

  // Await sticky ensure — background work is dropped when the response is sent
  if (context.postId) {
    try {
      await ensureStickyBoardComment(context.postId);
    } catch (err) {
      console.error('ensureSticky on GET leaderboard:', err);
    }
  }

  let me: LeaderboardResponse['me'] = null;
  const username = await resolveUsername();
  const memberId = resolveMemberId(username);
  const myRank = await rankOf(date, memberId);
  if (myRank !== null) {
    const meta = await loadMeta(date, memberId);
    if (meta) {
      me = {
        rank: myRank,
        username: meta.username,
        elapsedMs: meta.elapsedMs,
        wpm: meta.wpm,
      };
    }
  }

  const [streak, participants] = await Promise.all([
    loadDailyStreak(memberId),
    getParticipantCount(date),
  ]);

  return c.json<LeaderboardResponse>({
    type: 'leaderboard',
    date,
    entries,
    me,
    streak,
    participants,
  });
});

leaderboard.post('/leaderboard', async (c) => {
  let body: LeaderboardSubmitRequest;
  try {
    body = await c.req.json<LeaderboardSubmitRequest>();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const elapsedMs = Math.round(Number(body.elapsedMs));
  const letterCount = Math.round(Number(body.letterCount));

  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_ELAPSED_MS || elapsedMs > MAX_ELAPSED_MS) {
    return c.json({ status: 'error', message: 'Invalid elapsedMs' }, 400);
  }
  if (!Number.isFinite(letterCount) || letterCount < 1 || letterCount > MAX_LETTERS) {
    return c.json({ status: 'error', message: 'Invalid letterCount' }, 400);
  }

  const date = todayUtc();
  const username = await resolveUsername();
  const memberId = resolveMemberId(username);

  // Anti-cheat: verify the per-day token issued by GET /api/daily-frequency.
  // Anonymous players (no member id) are allowed through without a token.
  if (memberId !== 'name:anonymous' && !(await validateDailyToken(body.token, memberId, date))) {
    return c.json({ status: 'error', message: 'Missing or invalid anti-cheat token' }, 400);
  }

  // Anti-cheat: a correct copy cannot be faster than its elements keyed at an
  // extreme pace plus gaps + buffer.
  if (elapsedMs < minPlausibleMs(letterCount)) {
    return c.json(
      { status: 'error', message: 'Transmission implausibly fast — nice try, agent.' },
      400
    );
  }

  const wpm = computeWpm(elapsedMs, letterCount);

  // Consecutive daily-transmission streak (idempotent per day) + participation signal.
  const streak = await touchDailyStreak(memberId);
  await recordParticipant(memberId, date);

  const existing = await redis.zScore(boardKey(date), memberId);
  const improved = existing === undefined || elapsedMs < existing;

  if (improved) {
    await redis.zAdd(boardKey(date), { member: memberId, score: elapsedMs });
    const stored: StoredScore = { username, elapsedMs, wpm };
    await redis.hSet(metaKey(date), { [memberId]: JSON.stringify(stored) });
    await redis.expire(boardKey(date), 60 * 60 * 24 * 14);
    await redis.expire(metaKey(date), 60 * 60 * 24 * 14);
  }

  const rank = (await rankOf(date, memberId)) ?? 0;
  const bestMs = improved ? elapsedMs : Math.round(existing ?? elapsedMs);
  const bestMeta = improved ? { username, elapsedMs, wpm } : await loadMeta(date, memberId);

  // Auto-update pinned board comment (force on new best so top-N stays fresh)
  try {
    await syncStickyBoardComment({ force: improved });
  } catch (err) {
    console.error('Sticky board sync failed:', err);
  }

  return c.json<LeaderboardSubmitResponse>({
    type: 'leaderboard-submit',
    date,
    elapsedMs: bestMeta?.elapsedMs ?? bestMs,
    wpm: bestMeta?.wpm ?? wpm,
    rank,
    improved,
    username,
    streak,
  });
});
