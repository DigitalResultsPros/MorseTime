import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CURRICULUM, FREE_LESSON_STEPS } from '../../shared/curriculum';
import type { LessonGroupSubmitResponse, LessonState } from '../../shared/api';
import { generateLessonGroupForLesson } from '../../shared/lessonGroups';
import { DailyChallenge } from './DailyChallenge';

export type LessonRunnerProps = {
  lessonNumber: number;
  onBack: () => void;
  /** Called when server state changes (Pass / unlock). */
  onStateChange?: (state: LessonState) => void;
  footer?: ReactNode;
};

function emptyState(lessonNumber: number): LessonState {
  const lesson = CURRICULUM.find((l) => l.lessonNumber === lessonNumber) ?? CURRICULUM[0]!;
  return {
    currentLesson: lessonNumber,
    chars: lesson.cumulative,
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

function accuracyLabel(state: LessonState): string {
  if (state.passLetterAttempts <= 0) return 'Accuracy — · need 90%';
  const pct = Math.round((100 * state.passLetterCorrect) / state.passLetterAttempts);
  return `Accuracy ${pct}% · need 90%`;
}

export const LessonRunner = ({
  lessonNumber,
  onBack,
  onStateChange,
  footer,
}: LessonRunnerProps) => {
  const lesson = useMemo(
    () => CURRICULUM.find((l) => l.lessonNumber === lessonNumber) ?? CURRICULUM[0]!,
    [lessonNumber]
  );

  const [progress, setProgress] = useState<LessonState>(() => emptyState(lessonNumber));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groupKey, setGroupKey] = useState(0);
  const [groupWord, setGroupWord] = useState(() =>
    generateLessonGroupForLesson(lessonNumber)
  );
  const [justPassed, setJustPassed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);

  const applyState = useCallback(
    (state: LessonState) => {
      setProgress(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/lesson-state');
        if (!res.ok) throw new Error('Failed to load progress');
        const data = (await res.json()) as { type?: string; state?: LessonState };
        if (cancelled) return;
        if (data.type !== 'lesson-state' || !data.state) throw new Error('Invalid response');
        const state = data.state;
        applyState(state);
        const unlocked =
          lessonNumber <= state.currentLesson ||
          state.completedLessons.includes(lessonNumber);
        if (!unlocked) {
          setLockedOut(true);
          setLoadError(`Clear lesson ${lessonNumber - 1} first — 10 groups at 90%+`);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setLoadError(err instanceof Error ? err.message : 'Load failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonNumber, applyState]);

  const advanceGroup = useCallback(() => {
    setJustPassed(false);
    setSubmitError(null);
    setGroupWord(generateLessonGroupForLesson(lessonNumber));
    setGroupKey((k) => k + 1);
  }, [lessonNumber]);

  const onGroupResult = useCallback(
    async (result: {
      elapsedMs: number;
      letterCorrect: number;
      letterAttempts: number;
    }) => {
      setSubmitError(null);
      try {
        const res = await fetch('/api/lesson-group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonNumber,
            letterCorrect: result.letterCorrect,
            letterAttempts: Math.max(result.letterAttempts, result.letterCorrect),
            elapsedMs: result.elapsedMs,
          }),
        });
        if (res.status === 401) {
          setSubmitError('Sign in to Reddit to save Pass progress.');
          return;
        }
        if (res.status === 403) {
          setLockedOut(true);
          setSubmitError('This lesson is locked.');
          return;
        }
        if (!res.ok) throw new Error('Could not save group');
        const data = (await res.json()) as LessonGroupSubmitResponse;
        if (data.type !== 'lesson-group') throw new Error('Invalid response');
        applyState(data.state);
        if (data.lessonPassed) {
          setJustPassed(true);
        }
      } catch (err) {
        console.error(err);
        setSubmitError(err instanceof Error ? err.message : 'Save failed');
      }
    },
    [lessonNumber, applyState]
  );

  const groups = Math.min(10, progress.passGroupsCompleted);
  const showPassMeters =
    progress.currentLesson === lessonNumber ||
    progress.completedLessons.includes(lessonNumber);

  if (lockedOut) {
    return (
      <div className="flex h-full w-full flex-col bg-slate-900 text-white">
        <div className="shrink-0 px-3 pt-2">
          <button
            type="button"
            className="text-sm text-slate-400 hover:text-white"
            onClick={onBack}
          >
            ← Practice
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-red-400 text-sm">{loadError ?? 'Lesson locked'}</p>
          <button
            type="button"
            className="text-sm text-orange-400 hover:text-orange-300"
            onClick={onBack}
          >
            Back to hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 overflow-hidden">
      <div className="shrink-0 px-3 pt-2 pb-1 space-y-1.5 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm text-slate-400 hover:text-white transition-colors shrink-0"
            onClick={onBack}
          >
            ← Practice
          </button>
          <span className="text-[10px] text-slate-500 font-mono truncate">
            New {(lesson.newChars ?? []).join(' ')}
          </span>
        </div>
        {showPassMeters && (
          <div className="rounded-lg border border-slate-700/80 bg-slate-950/60 px-2.5 py-1.5">
            <div className="flex justify-between text-[11px] text-slate-400 gap-2">
              <span className="tabular-nums">Pass {groups}/10 groups</span>
              <span className="tabular-nums text-right">{accuracyLabel(progress)}</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500/80 transition-all"
                style={{ width: `${(groups / 10) * 100}%` }}
              />
            </div>
            {groups >= 10 &&
              progress.passLetterAttempts > 0 &&
              progress.passLetterCorrect / progress.passLetterAttempts < 0.9 &&
              !justPassed && (
                <p className="mt-1 text-[10px] text-amber-400/90">
                  10/10 groups · need 90% accuracy — keep practicing; meter uses last 10
                </p>
              )}
          </div>
        )}
        {submitError && (
          <p className="text-[11px] text-amber-400/90 text-center">{submitError}</p>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <DailyChallenge
          key={groupKey}
          variant="expanded"
          practiceWord={groupWord}
          title={`Lesson ${lessonNumber} · ${lesson.focus}`}
          headerRight={
            <span className="text-[10px] text-slate-500 tabular-nums">
              group {groups < 10 ? groups + 1 : '·'}
            </span>
          }
          submitScore={false}
          footer={footer}
          onResult={(r) => {
            void onGroupResult({
              elapsedMs: r.elapsedMs,
              letterCorrect: r.letterCorrect,
              letterAttempts: r.letterAttempts,
            });
          }}
          onPracticeNext={justPassed ? onBack : advanceGroup}
          practiceNextLabel={justPassed ? 'Back to Practice' : 'Next group'}
          // When lesson just passed, primary already returns home — avoid duplicate.
          {...(!justPassed ? { onHome: onBack, homeLabel: 'Practice home' } : {})}
          {...(justPassed
            ? {
                practiceResultNote:
                  lessonNumber < FREE_LESSON_STEPS
                    ? `Lesson ${lessonNumber} cleared — lesson ${lessonNumber + 1} unlocked!`
                    : 'Intro complete — K M R S U · full path on the web',
              }
            : {})}
        />
      </div>
    </div>
  );
};
