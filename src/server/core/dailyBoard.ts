import { redis, reddit, context } from '@devvit/web/server';
import type { LeaderboardEntry } from '../../shared/api';
import { transmitWpm } from '../../shared/wpm';

export const TOP_N = 10;
export const MIN_ELAPSED_MS = 200;
export const MAX_ELAPSED_MS = 30 * 60 * 1000;
export const MAX_LETTERS = 64;

export type StoredScore = {
  username: string;
  elapsedMs: number;
  wpm: number;
};

export function todayUtc(): string {
  return new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
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
  entries: LeaderboardEntry[]
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
  lines.push(
    '_Board auto-updates. Reply under this comment to brag — or use **Post my time** in the app._'
  );
  lines.push("_Play the interactive post above to transmit today's word._");

  return lines.join('\n');
}
