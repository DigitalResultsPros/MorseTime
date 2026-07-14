import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../../shared/api';

export type LeaderboardPanelProps = {
  /** Bump to force a refresh (e.g. after a successful transmit). */
  refreshKey?: number;
  /**
   * How many ranks to show. Prefer 3 (podium) for feed height;
   * 6 with columns=2 is for expanded if you want more depth.
   */
  limit?: number;
  /** Column count for the grid (3 → top-3 podium; 2 → two columns). */
  columns?: 2 | 3;
  className?: string;
};

async function fetchLeaderboard(limit: number): Promise<{
  entries: LeaderboardEntry[];
  me: LeaderboardResponse['me'];
  date: string;
  participants?: number;
}> {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) throw new Error('Failed to load leaderboard');
  const data = (await res.json()) as LeaderboardResponse;
  if (data.type !== 'leaderboard') throw new Error('Invalid response');
  return {
    entries: data.entries.slice(0, limit),
    me: data.me,
    date: data.date,
    participants: data.participants,
  };
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

export const LeaderboardPanel = ({
  refreshKey = 0,
  limit = 3,
  columns = 3,
  className = '',
}: LeaderboardPanelProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardResponse['me']>(null);
  const [date, setDate] = useState<string>('');
  const [participants, setParticipants] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLeaderboard(limit);
        if (cancelled) return;
        setEntries(data.entries);
        setMe(data.me);
        setDate(data.date);
        setParticipants(data.participants ?? null);
        setStatus('ready');
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit, refreshKey, retryTick]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRetryTick((t) => t + 1);
  }, []);

  const gridClass =
    columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-3 gap-1.5';

  return (
    <section
      className={`w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-2.5 py-1.5 ${className}`}
      aria-label="Today's leaderboard"
    >
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <h2 className="text-xs font-semibold text-slate-200">Today&apos;s Leaderboard</h2>
        <span className="text-[10px] text-slate-600 font-mono">{date || '—'}</span>
      </div>

      {status === 'ready' && participants !== null && participants > 0 && (
        <p className="text-[10px] text-slate-500 mb-1">
          {participants === 1
            ? '1 operator copied today'
            : `${participants} operators copied today`}
        </p>
      )}

      {status === 'loading' && (
        <p className="text-[11px] text-slate-500 py-1">Loading ranks…</p>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between gap-2 py-0.5">
          <p className="text-[11px] text-red-400">Could not load board</p>
          <button
            type="button"
            className="text-[11px] text-orange-400 hover:text-orange-300"
            onClick={retry}
          >
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && entries.length === 0 && (
        <p className="text-[11px] text-slate-500 py-1 text-center">
          No times yet — finish a run to claim #1.
        </p>
      )}

      {status === 'ready' && entries.length > 0 && (
        <ol className={gridClass}>
          {entries.map((row) => {
            const isMe = me?.username === row.username && me.rank === row.rank;
            return (
              <li
                key={`${row.rank}-${row.username}`}
                className={`flex flex-col items-center text-center rounded-lg px-1 py-1.5 min-w-0 ${
                  isMe
                    ? 'bg-orange-500/20 ring-1 ring-orange-500/40'
                    : 'bg-slate-900/70'
                }`}
              >
                <span className="text-sm leading-none" aria-hidden>
                  {medal(row.rank)}
                </span>
                <span
                  className={`mt-0.5 w-full truncate text-[11px] font-sans font-medium ${
                    isMe ? 'text-orange-100' : 'text-slate-200'
                  }`}
                  title={row.username}
                >
                  {row.username}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-white leading-tight">
                  {row.elapsedMs}
                  <span className="text-slate-500 text-[9px] ml-0.5">ms</span>
                </span>
                <span className="font-mono text-[9px] tabular-nums text-slate-500">
                  {row.wpm.toFixed(1)} WPM
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {status === 'ready' && me && me.rank > limit && (
        <p className="mt-1 text-[10px] text-slate-500 font-mono text-center">
          You · #{me.rank} · {me.elapsedMs} ms
        </p>
      )}
    </section>
  );
};
