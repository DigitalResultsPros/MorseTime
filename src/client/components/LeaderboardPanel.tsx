import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../../shared/api';

export type LeaderboardPanelProps = {
  /** Bump to force a refresh (e.g. after a successful transmit). */
  refreshKey?: number;
  /** How many ranks to show while collapsed (default: just the top result). */
  limit?: number;
  /** How many ranks to show when expanded (default 10). */
  expandedLimit?: number;
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
  limit = 1,
  expandedLimit = 10,
  className = '',
}: LeaderboardPanelProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardResponse['me']>(null);
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryTick, setRetryTick] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const fetchCount = Math.max(limit, expandedLimit);
  const shownLimit = expanded ? expandedLimit : limit;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLeaderboard(fetchCount);
        if (cancelled) return;
        setEntries(data.entries);
        setMe(data.me);
        setDate(data.date);
        setStatus('ready');
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCount, refreshKey, retryTick]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRetryTick((t) => t + 1);
  }, []);

  return (
    <section
      className={`w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-2 py-1 ${className}`}
      aria-label="Today's leaderboard"
    >
      {status === 'ready' && entries.length > 0 && entries.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 mb-0.5 cursor-pointer text-left"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-1">
            <span
              className="text-[10px] text-slate-500 transition-transform"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
              aria-hidden
            >
              ▸
            </span>
            <h2 className="text-xs font-semibold text-slate-200">Today&apos;s Leaderboard</h2>
          </span>
          <span className="text-[10px] text-slate-600 font-mono">{date || '—'}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h2 className="text-xs font-semibold text-slate-200">Today&apos;s Leaderboard</h2>
          <span className="text-[10px] text-slate-600 font-mono">{date || '—'}</span>
        </div>
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
        <ul className="flex flex-col">
          {entries.slice(0, shownLimit).map((row, i) => {
            const isMe = me?.username === row.username && me.rank === row.rank;
            const isFirst = i === 0;
            const canRevealMore = entries.length > limit;
            return (
              <li
                key={`${row.rank}-${row.username}`}
                className={`flex items-center gap-2 rounded px-1 py-0.5 min-w-0 ${
                  isMe ? 'bg-orange-500/20 ring-1 ring-orange-500/40' : ''
                } ${!expanded && isFirst && canRevealMore ? 'cursor-pointer' : ''}`}
                onClick={!expanded && isFirst && canRevealMore ? () => setExpanded(true) : undefined}
              >
                <span
                  className={`w-4 shrink-0 text-center text-[11px] tabular-nums ${
                    row.rank <= 3 ? '' : 'text-slate-500'
                  }`}
                  aria-hidden
                >
                  {medal(row.rank)}
                </span>
                <span
                  className={`flex-1 min-w-0 truncate text-[11px] font-medium ${
                    isMe ? 'text-orange-100' : 'text-slate-200'
                  }`}
                  title={row.username}
                >
                  {row.username}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-white">
                  {row.elapsedMs}
                  <span className="text-slate-500 text-[9px] ml-0.5">ms</span>
                </span>
                <span className="shrink-0 w-12 text-right font-mono text-[9px] tabular-nums text-slate-500">
                  {row.wpm.toFixed(1)} WPM
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {status === 'ready' && me && me.rank > shownLimit && (
        <p className="mt-0.5 text-[10px] text-slate-500 font-mono text-center">
          You · #{me.rank} · {me.elapsedMs} ms
        </p>
      )}
    </section>
  );
};
