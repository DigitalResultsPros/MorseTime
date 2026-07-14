import { useState, useCallback } from 'react';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { DailyChallenge } from './components/DailyChallenge';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { MorseCheatSheet } from './components/MorseCheatSheet';

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

export const SplashApp = () => {
  const [boardKey, setBoardKey] = useState(0);

  const onResult = useCallback(() => {
    setBoardKey((k) => k + 1);
  }, []);

  return (
    <DailyChallenge
      variant="inline"
      expandLabel="Practice →"
      onExpand={(e) => requestExpandedMode(e, 'game')}
      onResult={onResult}
      footer={footer}
      cheatSheet={<MorseCheatSheet defaultOpen={false} />}
      below={<LeaderboardPanel refreshKey={boardKey} limit={3} columns={3} />}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashApp />
  </StrictMode>
);
