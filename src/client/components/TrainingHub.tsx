import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { navigateTo } from '@devvit/web/client';
import {
  CURRICULUM,
  FREE_LESSON_STEPS,
  hasCompletedIntro,
} from '../../shared/curriculum';
import type { LessonState } from '../../shared/api';
import { MORSETIME_WEB_TRAINING_LABEL, MORSETIME_WEB_URL } from '../site';

export type TrainingHubProps = {
  onOpenDaily: () => void;
  onOpenLesson: (lessonNumber: number) => void;
  footer?: ReactNode;
};

function defaultState(): LessonState {
  return {
    currentLesson: 1,
    chars: CURRICULUM[0]?.cumulative ?? [],
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

function passAccuracyPct(state: LessonState): number | null {
  if (state.passLetterAttempts <= 0) return null;
  return Math.round((100 * state.passLetterCorrect) / state.passLetterAttempts);
}

export const TrainingHub = ({ onOpenDaily, onOpenLesson, footer }: TrainingHubProps) => {
  const [state, setState] = useState<LessonState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/lesson-state');
      if (!res.ok) throw new Error('Failed to load progress');
      const data = (await res.json()) as { type?: string; state?: LessonState };
      if (data.type !== 'lesson-state' || !data.state) throw new Error('Invalid response');
      setState({ ...defaultState(), ...data.state });
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setState(defaultState());
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = state ?? defaultState();
  const introDone = hasCompletedIntro(progress.completedLessons);
  const current = CURRICULUM.find((l) => l.lessonNumber === progress.currentLesson);
  const acc = passAccuracyPct(progress);
  const groupsDone = Math.min(10, progress.passGroupsCompleted);
  const resumeLesson = Math.min(progress.currentLesson, FREE_LESSON_STEPS);

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 text-white overflow-hidden box-border">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
        <div className="my-auto flex w-full flex-col items-center gap-3 max-w-md mx-auto">
          <header className="w-full flex items-center justify-between shrink-0">
            <h1 className="text-lg font-bold">Practice</h1>
            <span className="text-xs text-slate-500 tabular-nums">
              {progress.practiceStreakDays > 0
                ? `streak ${progress.practiceStreakDays}`
                : 'intro'}
            </span>
          </header>

          {status === 'loading' && (
            <p className="text-sm text-slate-500 w-full">Loading progress…</p>
          )}
          {status === 'error' && (
            <p className="text-xs text-amber-400/90 w-full">
              Could not load progress — showing defaults.{' '}
              <button type="button" className="underline" onClick={() => void load()}>
                Retry
              </button>
            </p>
          )}

          {/* Intro complete banner */}
          {introDone && (
            <section className="w-full rounded-xl border border-green-500/30 bg-gradient-to-b from-green-500/10 to-slate-900/40 px-3 py-3 shrink-0 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-400/90">
                Intro complete
              </p>
              <p className="mt-1 text-sm text-slate-200">
                You know <span className="font-mono text-orange-200">K M R S U</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Drill these letters here, or continue the full path on the web.
              </p>
              <button
                type="button"
                className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-full font-bold text-sm min-h-10"
                onClick={() => navigateTo(MORSETIME_WEB_URL)}
              >
                {MORSETIME_WEB_TRAINING_LABEL}
              </button>
              <button
                type="button"
                className="mt-2 w-full text-sm text-slate-400 hover:text-white transition-colors py-1"
                onClick={() => onOpenLesson(FREE_LESSON_STEPS)}
              >
                Drill free letters
              </button>
            </section>
          )}

          {/* Continue card — while intro in progress */}
          {!introDone && (
            <section className="w-full rounded-xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-slate-900/40 px-3 py-3 shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/90">
                Continue
              </p>
              <p className="mt-1 font-semibold text-sm">
                Lesson {resumeLesson}
                {current ? (
                  <span className="text-slate-400 font-normal"> · {current.focus}</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 font-mono">
                New: {(current?.newChars ?? []).join(' ')}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Pass {groupsDone}/10 groups</span>
                  <span>
                    {acc === null ? 'Accuracy —' : `Accuracy ${acc}%`}
                    <span className="text-slate-600"> · need 90%</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500/80 transition-all"
                    style={{ width: `${(groupsDone / 10) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-full font-bold text-sm min-h-10"
                onClick={() => onOpenLesson(resumeLesson)}
              >
                Resume lesson
              </button>
            </section>
          )}

          {/* Lesson map — 4 free steps only */}
          <section className="w-full shrink-0" aria-label="Intro lessons">
            <h2 className="text-xs font-semibold text-slate-300 mb-1.5">
              Intro lessons
              <span className="text-slate-600 font-normal"> · free · 5 letters</span>
            </h2>
            <ol className="grid grid-cols-4 gap-1.5">
              {CURRICULUM.map((lesson) => {
                const n = lesson.lessonNumber;
                const cleared = progress.completedLessons.includes(n);
                const unlocked = n <= progress.currentLesson || cleared;
                const isCurrent = n === progress.currentLesson && !cleared;
                return (
                  <li key={n}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      title={
                        unlocked
                          ? `Lesson ${n}: ${lesson.focus} · ${lesson.newChars.join(' ')}`
                          : `Clear lesson ${n - 1} first — 10 groups at 90%+`
                      }
                      onClick={() => unlocked && onOpenLesson(n)}
                      className={`w-full aspect-square rounded-lg text-sm font-bold tabular-nums transition-colors ${
                        !unlocked
                          ? 'bg-slate-950/80 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : isCurrent
                            ? 'bg-orange-500/25 text-orange-100 ring-1 ring-orange-500/50'
                            : cleared
                              ? 'bg-green-500/15 text-green-300 ring-1 ring-green-500/30'
                              : 'bg-slate-800 text-slate-200 ring-1 ring-slate-600/50 hover:bg-slate-700'
                      }`}
                    >
                      {unlocked ? n : '🔒'}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-1.5 text-[10px] text-slate-600 text-center">
              K M → +R → +S → +U · pass 10 groups at 90%+
            </p>
          </section>

          {/* Challenges */}
          <section className="w-full flex flex-col gap-1.5 shrink-0">
            <h2 className="text-xs font-semibold text-slate-300">Challenges</h2>
            <button
              type="button"
              className="w-full text-left rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2.5 hover:border-slate-500 transition-colors"
              onClick={onOpenDaily}
            >
              <span className="text-sm font-medium text-slate-100">Today&apos;s Frequency</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Daily race · same word &amp; leaderboard as the feed
              </span>
            </button>
            <button
              type="button"
              className="w-full text-left rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2.5 hover:border-orange-500/40 transition-colors"
              onClick={() => navigateTo(MORSETIME_WEB_URL)}
            >
              <span className="text-sm font-medium text-orange-300">
                {MORSETIME_WEB_TRAINING_LABEL}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Full path &amp; more on morsetime.com
              </span>
            </button>
          </section>
        </div>
      </div>

      <div className="shrink-0 flex justify-center items-center gap-3 px-3 pb-2 pt-0 text-[0.75em] text-slate-600">
        {footer ?? <span className="text-slate-700">MorseTime</span>}
      </div>
    </div>
  );
};
