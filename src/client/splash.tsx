import { useEffect, useRef, useState, useCallback } from 'react';
import './index.css';
import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AudioEngine } from './systems/AudioEngine';
import { TouchInput } from './systems/TouchInput';
import type { MorseElement } from './systems/TouchInput';
import { WaveformViz, WaveformElement } from './systems/WaveformViz';
import { Progression } from './systems/Progression';
import { encodeString, getStandardTiming, decode } from '../shared/morse';
import type { DailyFrequency } from '../shared/api';

const audioEngine = new AudioEngine();
const touchInput = new TouchInput(() => {
  if (navigator.vibrate) navigator.vibrate(10);
});
const progression = new Progression();

type ViewState = 'loading' | 'ready' | 'playing' | 'result';

export const Splash = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [dailyWord, setDailyWord] = useState<DailyFrequency | null>(null);
  const [userSequence, setUserSequence] = useState<MorseElement[]>([]);
  const [targetSequence, setTargetSequence] = useState<MorseElement[]>([]);
  const [result, setResult] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const [wpm, setWpm] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<WaveformViz | null>(null);
  const targetElementsRef = useRef<WaveformElement[]>([]);
  const startTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const resultCheckedRef = useRef(false);

  // Load daily frequency
  useEffect(() => {
    const loadDaily = async () => {
      try {
        const res = await fetch('/api/daily-frequency');
        if (!res.ok) throw new Error('Failed to load daily frequency');
        const data = (await res.json()) as { type: string; data: DailyFrequency };
        if (data.type === 'daily-frequency') {
          setDailyWord(data.data);
          const seq = encodeString(data.data.word).flat();
          setTargetSequence(seq);
        }
      } catch (err) {
        console.error('Failed to load daily frequency:', err);
      } finally {
        setView('ready');
      }
    };
    void loadDaily();
  }, []);

  // Initialize audio + waveform on first interaction
  const initialize = useCallback(async () => {
    if (audioEngine.getState().initialized) return;
    await audioEngine.init();
    if (canvasRef.current) {
      waveformRef.current = new WaveformViz(canvasRef.current);
      waveformRef.current.start(() => {
        if (waveformRef.current && isPlayingRef.current) {
          waveformRef.current.setCurrentTime(performance.now() - startTimeRef.current);
        }
      });
    }
  }, []);

  // Play target sequence
  const playTarget = useCallback(async () => {
    if (!dailyWord || isPlayingRef.current) return;
    await initialize();
    setView('playing');
    setUserSequence([]);
    setResult('');
    resultCheckedRef.current = false;
    isPlayingRef.current = true;
    startTimeRef.current = performance.now();

    const timing = getStandardTiming(dailyWord.charWpm);
    const chars = encodeString(dailyWord.word);

    // Build target waveform elements
    const targetEls: WaveformElement[] = [];
    let t = 0;
    for (let i = 0; i < chars.length; i++) {
      const charEls = chars[i]!;
      for (const el of charEls) {
        const dur = el === 'dit' ? timing.ditMs : timing.dahMs;
        targetEls.push({ type: el, startTime: t, duration: dur, isTarget: true });
        t += dur;
        if (i < chars.length - 1 || charEls.indexOf(el) < charEls.length - 1) {
          t += timing.intraCharGapMs;
        }
      }
      if (i < chars.length - 1) {
        t += timing.interCharGapMs;
      }
    }
    targetElementsRef.current = targetEls;
    if (waveformRef.current) {
      waveformRef.current.clear();
      waveformRef.current.setViewportMs(t + 2000);
      for (const el of targetEls) {
        waveformRef.current.addElement(el);
      }
    }

    // Schedule audio playback
    const now = audioEngine.getCurrentTime();
    let audioTime = now + 0.1;
    for (const charEls of chars) {
      for (const el of charEls) {
        const dur = el === 'dit' ? timing.ditMs : timing.dahMs;
        audioEngine.keyDown(audioTime);
        audioEngine.keyUp(audioTime + dur / 1000);
        audioTime += dur / 1000 + timing.intraCharGapMs / 1000;
      }
      audioTime += timing.interCharGapMs / 1000;
    }

    // End playback after sequence
    const totalDuration = t + 500;
    setTimeout(() => {
      isPlayingRef.current = false;
      setView('ready');
    }, totalDuration);
  }, [dailyWord, initialize]);

  // Handle user input
  useEffect(() => {
    const bound = touchInput.bind({
      onElement: (element: MorseElement, durationMs: number) => {
        if (view !== 'playing') return;
        setUserSequence((prev) => {
          const next = [...prev, element];
          // Add to waveform
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
  }, [view]);

  // Check result when user finishes
  useEffect(() => {
    if (userSequence.length > 0 && userSequence.length >= targetSequence.length && !resultCheckedRef.current) {
      resultCheckedRef.current = true;
      const decoded = decode(userSequence);
      const isCorrect = decoded === dailyWord?.word;

      setResult(isCorrect ? 'Correct!' : `You sent: ${decoded} (target: ${dailyWord?.word})`);
      setView('result');

      // Spawn particles
      if (waveformRef.current && canvasRef.current) {
        const width = canvasRef.current.getBoundingClientRect().width;
        const x = waveformRef.current.getPlayheadX(width);
        const height = canvasRef.current.getBoundingClientRect().height;
        const color = isCorrect ? '#22c55e' : '#ef4444';
        waveformRef.current.spawnParticles(x, height * 0.5, color, isCorrect ? 20 : 10);
      }

      // Record progress
      progression.recordAttempt(dailyWord?.word ?? '', isCorrect, 0);
      const stats = progression.getStats();
      setStreak(stats.totalCorrect);
      setWpm(Math.round(60 / (targetSequence.length * 0.5))); // rough estimate
    }
  }, [userSequence, targetSequence, dailyWord]);

  // Cleanup
  useEffect(() => {
    return () => {
      waveformRef.current?.destroy();
      audioEngine.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-900 text-white p-4">
      <h1 className="text-xl font-bold text-center">📻 Today's Frequency</h1>

      {view === 'loading' && (
        <p className="text-gray-400">Loading today's transmission...</p>
      )}

      {dailyWord && (
        <div className="text-center">
          <p className="text-3xl font-mono font-bold tracking-widest">{dailyWord.word}</p>
          <p className="text-sm text-gray-400 mt-1">
            {dailyWord.charWpm} WPM char speed / {dailyWord.effectiveWpm} WPM effective
          </p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full max-w-md h-32 rounded-lg border border-slate-700"
        style={{ touchAction: 'none' }}
      />

      <div className="flex gap-4 text-sm text-gray-400">
        <span>Streak: {streak}</span>
        <span>WPM: {wpm}</span>
        <span>Lesson: {progression.getCurrentLesson()}</span>
      </div>

      {view === 'ready' && (
        <div className="flex flex-col gap-3 items-center">
          <button
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
            onClick={playTarget}
          >
            Play Target
          </button>
          <p className="text-xs text-gray-500">Tap canvas or press Space/Enter to send</p>
        </div>
      )}

      {view === 'playing' && (
        <p className="text-orange-400 animate-pulse">Listening... tap to transmit!</p>
      )}

      {view === 'result' && (
        <div className="flex flex-col gap-3 items-center">
          <p className={`text-lg font-bold ${result.startsWith('Correct') ? 'text-green-400' : 'text-red-400'}`}>
            {result}
          </p>
          <button
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
            onClick={playTarget}
          >
            Try Again
          </button>
        </div>
      )}

      <button
        className="mt-4 text-sm text-gray-500 hover:text-white transition-colors"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Open Full Game →
      </button>

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
    <Splash />
  </StrictMode>
);
