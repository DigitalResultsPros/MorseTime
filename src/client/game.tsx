import { useState, useCallback } from 'react';
import './index.css';
import { navigateTo } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DailyChallenge } from './components/DailyChallenge';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { TrainingHub } from './components/TrainingHub';
import { LessonRunner } from './components/LessonRunner';

type View =
  | { name: 'hub' }
  | { name: 'daily' }
  | { name: 'lesson'; lessonNumber: number };

const footer = (
  <>
    <button
      type="button"
      className="cursor-pointer hover:text-slate-400 transition-colors"
      onClick={() => navigateTo('https://developers.reddit.com/docs')}
    >
      Docs
    </button>
    <span className="text-slate-700">|</span>
    <button
      type="button"
      className="cursor-pointer hover:text-slate-400 transition-colors"
      onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
    >
      r/Devvit
    </button>
  </>
);

export const GameApp = () => {
  const [view, setView] = useState<View>({ name: 'hub' });
  const [boardKey, setBoardKey] = useState(0);
  /** Bump to remount hub and refetch progress after lessons. */
  const [hubKey, setHubKey] = useState(0);

  const onResult = useCallback(() => {
    setBoardKey((k) => k + 1);
  }, []);

  const goHub = useCallback(() => {
    setHubKey((k) => k + 1);
    setView({ name: 'hub' });
  }, []);

  if (view.name === 'hub') {
    return (
      <TrainingHub
        key={hubKey}
        footer={footer}
        onOpenDaily={() => setView({ name: 'daily' })}
        onOpenLesson={(lessonNumber) => setView({ name: 'lesson', lessonNumber })}
      />
    );
  }

  if (view.name === 'lesson') {
    return (
      <LessonRunner
        lessonNumber={view.lessonNumber}
        onBack={goHub}
        footer={footer}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 overflow-hidden">
      <div className="shrink-0 px-3 pt-2 pb-0">
        <button
          type="button"
          className="text-sm text-slate-400 hover:text-white transition-colors"
          onClick={goHub}
        >
          ← Practice
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <DailyChallenge
          variant="expanded"
          onResult={onResult}
          onHome={goHub}
          homeLabel="Practice home"
          footer={footer}
          below={<LeaderboardPanel refreshKey={boardKey} />}
        />
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameApp />
  </StrictMode>
);
