import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { navigateTo } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AudioEngine } from './systems/AudioEngine';
import { TouchInput } from './systems/TouchInput';
import { WaveformViz, WaveformElement } from './systems/WaveformViz';
import { Progression } from './systems/Progression';
import { getStandardTiming, decode } from '../shared/morse';
import type { DailyFrequency } from '../shared/api';
import type { MorseElement } from './systems/TouchInput';

const audioEngine = new AudioEngine();
const touchInput = new TouchInput(() => {
  if (navigator.vibrate) navigator.vibrate(10);
});
const progression = new Progression();

type GameMode = 'menu' | 'lesson' | 'practice' | 'daily';

export const App = () => {
  const [mode, setMode] = useState<GameMode>('menu');
  const [dailyWord, setDailyWord] = useState<DailyFrequency | null>(null);
  const [userSequence, setUserSequence] = useState<MorseElement[]>([]);
  const [targetSequence, setTargetSequence] = useState<MorseElement[]>([]);
  const [result, setResult] = useState<string>('');
  const [streak] = useState(0);
  const [wpm] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<WaveformViz | null>(null);
  const startTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const resultCheckedRef = useRef(false);

  // Load daily frequency
  useEffect(() => {
    const loadDaily = async () => {
      try {
        const res = await fetch('/api/daily-frequency');
        if (!res.ok) return;
        const data = (await res.json()) as { type: string; data: DailyFrequency };
        if (data.type === 'daily-frequency') {
          setDailyWord(data.data);
        }
      } catch (err) {
        console.error('Failed to load daily frequency:', err);
      }
    };
    void loadDaily();
  }, []);

  // Initialize audio + waveform
  const initialize = useCallback(async () => {
    if (audioEngine.getState().initialized) return;
    await audioEngine.init();
    if (canvasRef.current && !waveformRef.current) {
      waveformRef.current = new WaveformViz(canvasRef.current);
      waveformRef.current.start(() => {
        if (waveformRef.current && isPlayingRef.current) {
          waveformRef.current.setCurrentTime(performance.now() - startTimeRef.current);
        }
      });
    }
  }, []);

  // Play a sequence of characters
  const playSequence = useCallback(async (chars: MorseElement[], charWpm: number, _effectiveWpm?: number) => {
    await initialize();
    setUserSequence([]);
    setResult('');
    resultCheckedRef.current = false;
    isPlayingRef.current = true;
    startTimeRef.current = performance.now();

    const timing = getStandardTiming(charWpm);

    // Build waveform elements
    if (waveformRef.current) {
      waveformRef.current.clear();
    }

    let t = 0;
    const targetEls: WaveformElement[] = [];
    for (let i = 0; i < chars.length; i++) {
      const el = chars[i]!;
      const dur = el === 'dit' ? timing.ditMs : timing.dahMs;
      targetEls.push({ type: el, startTime: t, duration: dur, isTarget: true });
      t += dur;
      if (i < chars.length - 1) {
        t += timing.intraCharGapMs;
      }
    }

    if (waveformRef.current) {
      waveformRef.current.setViewportMs(t + 2000);
      for (const el of targetEls) {
        waveformRef.current.addElement(el);
      }
    }

    // Schedule audio
    const now = audioEngine.getCurrentTime();
    let audioTime = now + 0.1;
    for (const el of chars) {
      const dur = el === 'dit' ? timing.ditMs : timing.dahMs;
      audioEngine.keyDown(audioTime);
      audioEngine.keyUp(audioTime + dur / 1000);
      audioTime += dur / 1000 + timing.intraCharGapMs / 1000;
    }

    const totalDuration = t + 500;
    setTimeout(() => {
      isPlayingRef.current = false;
    }, totalDuration);
  }, [initialize]);

  // Handle user input
  useEffect(() => {
    const bound = touchInput.bind({
      onElement: (element: MorseElement, durationMs: number) => {
        if (!isPlayingRef.current) return;
        setUserSequence((prev) => {
          const next = [...prev, element];
          if (waveformRef.current) {
            const elapsed = performance.now() - startTimeRef.current;
            waveformRef.current.addElement({
              type: element,
              startTime: elapsed,
              duration: durationMs,
              isTarget: false,
            });
          }
          return next;
        });
      },
    });

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('pointerdown', bound.onPointerDown);
      canvas.addEventListener('pointerup', bound.onPointerUp);
      bound.bindKeyboard(canvas);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('pointerdown', bound.onPointerDown);
        canvas.removeEventListener('pointerup', bound.onPointerUp);
        bound.unbindKeyboard(canvas);
      }
    };
  }, [mode]);

  // Check result
  useEffect(() => {
    if (userSequence.length > 0 && userSequence.length >= targetSequence.length && !resultCheckedRef.current) {
      resultCheckedRef.current = true;
      const decoded = decode(userSequence);
      const targetStr = targetSequence.join('');
      const isCorrect = decoded === targetStr;
      setResult(isCorrect ? 'Correct!' : `You sent: ${decoded} (target: ${targetStr})`);
      isPlayingRef.current = false;

      // Spawn particles
      if (waveformRef.current && canvasRef.current) {
        const width = canvasRef.current.getBoundingClientRect().width;
        const x = waveformRef.current.getPlayheadX(width);
        const height = canvasRef.current.getBoundingClientRect().height;
        const color = isCorrect ? '#22c55e' : '#ef4444';
        waveformRef.current.spawnParticles(x, height * 0.5, color, isCorrect ? 20 : 10);
      }
    }
  }, [userSequence, targetSequence]);

  // Cleanup
  useEffect(() => {
    return () => {
      waveformRef.current?.destroy();
      audioEngine.destroy();
    };
  }, []);

  const startLesson = () => {
    const chars = progression.getCurrentChars();
    setTargetSequence(chars as MorseElement[]);
    setMode('lesson');
    void playSequence(chars as MorseElement[], 20);
  };

  const startPractice = () => {
    if (!dailyWord) return;
    const chars = dailyWord.word.split('') as MorseElement[];
    setTargetSequence(chars);
    setMode('practice');
    void playSequence(chars, dailyWord.charWpm);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-900 text-white p-4">
      {mode === 'menu' && (
        <>
          <h1 className="text-2xl font-bold">📻 MorseTime</h1>
          <p className="text-gray-400">Learn Morse code by touch and sound</p>

          <div className="flex flex-col gap-3 w-full max-w-xs mt-6">
            <button
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
              onClick={startLesson}
            >
              Lesson {progression.getCurrentLesson()}
            </button>
            <button
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold transition-colors"
              onClick={startPractice}
            >
              Practice: {dailyWord?.word ?? 'Loading...'}
            </button>
            <button
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold transition-colors"
              onClick={() => setMode('daily')}
            >
              Daily Frequency
            </button>
          </div>

          <div className="flex gap-4 text-sm text-gray-400 mt-4">
            <span>Streak: {streak}</span>
            <span>WPM: {wpm}</span>
            <span>Lesson: {progression.getCurrentLesson()}</span>
          </div>
        </>
      )}

      {(mode === 'lesson' || mode === 'practice' || mode === 'daily') && (
        <>
          <div className="flex items-center gap-4 w-full max-w-md">
            <button
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setMode('menu')}
            >
              ← Back
            </button>
            <h2 className="text-lg font-bold flex-1 text-center">
              {mode === 'lesson' ? `Lesson ${progression.getCurrentLesson()}` : mode === 'practice' ? 'Practice' : 'Daily Frequency'}
            </h2>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full max-w-md h-32 rounded-lg border border-slate-700"
            style={{ touchAction: 'none' }}
          />

          <div className="flex gap-4 text-sm text-gray-400">
            <span>Streak: {streak}</span>
            <span>WPM: {wpm}</span>
          </div>

          {result && (
            <p className={`text-lg font-bold ${result.startsWith('Correct') ? 'text-green-400' : 'text-red-400'}`}>
              {result}
            </p>
          )}

          <p className="text-xs text-gray-500">Tap canvas or press Space/Enter to send</p>
        </>
      )}

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 text-[0.8em] text-gray-600">
        <button
          className="cursor-pointer hover:text-gray-900 transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-gray-300">|</span>
        <button
          className="cursor-pointer hover:text-gray-900 transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
