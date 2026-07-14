import { redis, reddit, context } from '@devvit/web/server';
import type { LeaderboardEntry } from '../../shared/api';
import { transmitWpm } from '../../shared/wpm';

export const TOP_N = 10;
export const MIN_ELAPSED_MS = 200;
export const MAX_ELAPSED_MS = 30 * 60 * 1000;
export const MAX_LETTERS = 64;

/** Anti-cheat token lifetime: issued per day, valid until day end + buffer. */
const TOKEN_TTL_MS = 60 * 60 * 24 * 2;

export type StoredScore = {
  username: string;
  elapsedMs: number;
  wpm: number;
};

export type DailyStreak = {
  count: number;
  lastDate: string;
};

export function todayUtc(): string {
  return new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
}

export function streakKey(memberId: string): string {
  return `streak:user:${memberId}`;
}

export function boardKey(date: string): string {
  return `lb:daily:${date}`;
}

export function metaKey(date: string): string {
  return `lb:daily:${date}:meta`;
}

export function stickyCommentKey(postId: string): string {
  return `lb:post:${postId}:sticky`;
}

export function stickyThrottleKey(postId: string): string {
  return `lb:post:${postId}:sticky:throttle`;
}

export function participantsKey(date: string): string {
  return `lb:daily:${date}:participants`;
}

export const ALL_PARTICIPANTS_KEY = 'lb:all:participants';

export function tokenKey(token: string): string {
  return `token:${token}`;
}

export async function resolveUsername(): Promise<string> {
  if (context.username) return context.username;
  try {
    return (await reddit.getCurrentUsername()) ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function resolveMemberId(username: string): string {
  return context.userId ?? `name:${username}`;
}

export async function loadMeta(date: string, memberId: string): Promise<StoredScore | null> {
  const raw = await redis.hGet(metaKey(date), memberId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredScore;
  } catch {
    return null;
  }
}

export async function buildEntries(date: string, limit = TOP_N): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(boardKey(date), 0, limit - 1, { by: 'rank' });
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const meta = await loadMeta(date, row.member);
    const elapsedMs = meta?.elapsedMs ?? Math.round(row.score);
    const wpm = meta?.wpm ?? 0;
    const username = meta?.username ?? row.member.replace(/^name:/, '');
    entries.push({
      rank: i + 1,
      username,
      elapsedMs,
      wpm,
    });
  }

  return entries;
}

export async function rankOf(date: string, memberId: string): Promise<number | null> {
  const rank = await redis.zRank(boardKey(date), memberId);
  if (rank === undefined) return null;
  return rank + 1;
}

export function computeWpm(elapsedMs: number, letterCount: number): number {
  return Math.round(transmitWpm(elapsedMs, letterCount) * 10) / 10;
}

/** Markdown body for the sticky leaderboard comment. */
export function formatBoardCommentMarkdown(
  date: string,
  entries: LeaderboardEntry[],
  participants?: number
): string {
  const lines: string[] = [
    `📻 **MorseTime — Today's Frequency**`,
    `*Leaderboard · ${date} UTC · fastest correct copy*`,
    '',
  ];

  if (entries.length === 0) {
    lines.push('_No times yet. Play the post, then **Post my time** to claim a spot._');
  } else {
    for (const row of entries) {
      const medal =
        row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `${row.rank}.`;
      lines.push(
        `${medal} **u/${row.username}** — ${row.elapsedMs.toLocaleString()} ms · ${row.wpm.toFixed(1)} WPM`
      );
    }
  }

  lines.push('');
  if (participants && participants > 0) {
    lines.push(
      `📡 ${participants} operator${participants === 1 ? '' : 's'} on this frequency today`
    );
    lines.push('');
  }
  lines.push(
    '_Board auto-updates. Reply under this comment to brag — or use **Post my time** in the app._'
  );
  lines.push("_Play the interactive post above to transmit today's word._");

  return lines.join('\n');
}

/**
 * Plausibility floor (ms) for a valid daily transmit of `letterCount` letters.
 * Generous: a fast operator keys a letter in well under ~200ms, but a send of
 * only a few hundred ms across many letters is impossible. This only kills
 * `1ms`/sub-second cheats and absurd times — never real fast fists.
 */
export function minPlausibleMs(letterCount: number): number {
  const perLetter = 160;
  const base = 400;
  return Math.max(MIN_ELAPSED_MS, Math.round(letterCount * perLetter + base));
}

/** Read the current daily-play streak for a member (0 if none). */
export async function loadDailyStreak(memberId: string): Promise<number> {
  const raw = await redis.get(streakKey(memberId));
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as DailyStreak;
    return Math.max(0, Math.round(parsed.count || 0));
  } catch {
    return 0;
  }
}

/**
 * Increment the daily-play streak on a completed daily transmission.
 * - Already counted today → unchanged.
 * - Yesterday → +1. Otherwise (gap or first) → reset to 1.
 */
export async function touchDailyStreak(memberId: string): Promise<number> {
  const today = todayUtc();
  const raw = await redis.get(streakKey(memberId));
  let count = 1;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DailyStreak;
      if (parsed.lastDate === today) {
        return Math.max(0, Math.round(parsed.count || 0));
      }
      const prev = new Date(`${parsed.lastDate}T12:00:00.000Z`).getTime();
      const now = new Date(`${today}T12:00:00.000Z`).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const delta = Math.round((now - prev) / dayMs);
      count = delta === 1 ? Math.max(1, Math.round(parsed.count || 0)) + 1 : 1;
    } catch {
      count = 1;
    }
  }

  const stored: DailyStreak = { count, lastDate: today };
  await redis.set(streakKey(memberId), JSON.stringify(stored));
  return count;
}

/**
 * Record a distinct participant for the date (and all-time) using a hash so the
 * same operator submitting repeatedly doesn't inflate the "copied today" count.
 */
export async function recordParticipant(memberId: string, date = todayUtc()): Promise<void> {
  await redis.hSet(participantsKey(date), { [memberId]: '1' });
  await redis.expire(participantsKey(date), 60 * 60 * 24 * 14);
  await redis.hSet(ALL_PARTICIPANTS_KEY, { [memberId]: '1' });
  await redis.expire(ALL_PARTICIPANTS_KEY, 60 * 60 * 24 * 365 * 2);
}

/** Distinct participants who transmitted today. */
export async function getParticipantCount(date = todayUtc()): Promise<number> {
  return redis.hLen(participantsKey(date));
}

/** Issue a one-time-per-day anti-cheat token, valid for the current UTC day. */
export async function issueDailyToken(memberId: string, date: string): Promise<string> {
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `t_${memberId}_${date}_${Math.random().toString(36).slice(2)}`;
  await redis.set(tokenKey(token), JSON.stringify({ memberId, date }), {
    expiration: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

/**
 * Validate an anti-cheat token for `memberId` on `date`.
 * Returns true when the token exists, matches the member, and is for today.
 */
export async function validateDailyToken(
  token: string | undefined,
  memberId: string,
  date: string
): Promise<boolean> {
  if (!token) return false;
  const raw = await redis.get(tokenKey(token));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { memberId: string; date: string };
    return parsed.memberId === memberId && parsed.date === date;
  } catch {
    return false;
  }
}
