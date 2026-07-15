import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { AudioEngine } from '../systems/AudioEngine';
import { TouchInput } from '../systems/TouchInput';
import type { MorseElement } from '../systems/TouchInput';
import {
  encodeString,
  encodeChar,
  getTimingWithInterCharUnits,
  STANDARD_INTER_CHAR_UNITS,
  WIDE_INTER_CHAR_UNITS,
  ditDahThresholdMs,
  matchLetterBuffer,
  elementsToGlyphs,
  lettersOnly,
  getSequenceDurationMs,
} from '../../shared/morse';
import type { Timing } from '../../shared/morse';
import type { DailyFrequency, LeaderboardEntry, LeaderboardSubmitResponse } from '../../shared/api';
import { transmitWpm } from '../../shared/wpm';
import { navigateTo, showToast } from '@devvit/web/client';
import { readNumber, writeNumber, writeFlag } from '../lib/storage';
import { MorseSoundBars } from './MorseSoundBars';
import { buildToneMarks, type ToneMark } from './MorseSoundBarsTypes';

const audioEngine = new AudioEngine();
const touchInput = new TouchInput(() => {
  if (navigator.vibrate) navigator.vibrate(10);
});

/** Bump suffix when tip copy changes so prior dismissals don't hide the new text. */
const TIP_STORAGE_KEY = 'morsetime-splash-tip-dismissed-v2';

type Phase = 'loading' | 'idle' | 'listen' | 'ready' | 'transmit' | 'result' | 'error';

type CharSchedule = {
  /** Wall-clock offset (ms) from listen start when this char's tones begin. */
  startMs: number;
  /** Wall-clock offset when this char's tones end (for boundary flash). */
  endMs: number;
  elements: MorseElement[];
};

/**
 * Build per-character start times for listen reveal + audio.
 * Reveal is driven at **start** of each character's scheduled tones (new.md §4).
 * `interCharUnits` > 3 stretches letter gaps so E / I / S stay distinct.
 */
function buildCharSchedule(
  word: string,
  charWpm: number,
  interCharUnits: number
): { chars: CharSchedule[]; totalMs: number; timing: Timing } {
  const timing = getTimingWithInterCharUnits(charWpm, interCharUnits);
  const encoded = encodeString(word);
  const chars: CharSchedule[] = [];
  let t = 0;

  for (let i = 0; i < encoded.length; i++) {
    const els = encoded[i]!;
    if (els.length === 0) {
      t += timing.wordGapMs;
      continue;
    }
    const startMs = t;
    const charDur = getSequenceDurationMs(els, timing);
    chars.push({ startMs, endMs: startMs + charDur, elements: els });
    t += charDur;
    if (i < encoded.length - 1) {
      const next = encoded[i + 1]!;
      if (next.length > 0) {
        t += timing.interCharGapMs;
      }
    }
  }

  return { chars, totalMs: t, timing };
}

/** Lead-in before first tone (seconds) — keep in sync with wall-clock reveal delays. */
const LISTEN_LEAD_SEC = 0.05;

/** First listen always at this speed; slider appears after for replays. */
const INITIAL_WPM = 20;
const WPM_MIN = 5;
const WPM_MAX = 40;

/** Schedule listen tones; returns lead ms + AudioContext time at lead start (for lamp sync). */
function scheduleListenAudio(
  schedule: CharSchedule[],
  timing: Timing
): { leadMs: number; audioLeadStart: number } {
  audioEngine.stopAll();
  const now = audioEngine.getCurrentTime();
  const t0 = now + LISTEN_LEAD_SEC;

  for (const ch of schedule) {
    let audioTime = t0 + ch.startMs / 1000;
    for (let j = 0; j < ch.elements.length; j++) {
      const el = ch.elements[j]!;
      const durSec = (el === 'dit' ? timing.ditMs : timing.dahMs) / 1000;
      audioEngine.scheduleTone(audioTime, durSec);
      audioTime += durSec;
      if (j < ch.elements.length - 1) {
        audioTime += timing.intraCharGapMs / 1000;
      }
    }
  }

  return { leadMs: LISTEN_LEAD_SEC * 1000, audioLeadStart: now };
}

export type DailyChallengeResult = {
  elapsedMs: number;
  letterCount: number;
  submit?: LeaderboardSubmitResponse | null;
  /** Letter hits/misses for this transmit (practice / Pass tracking). */
  letterCorrect: number;
  letterAttempts: number;
};

export type DailyChallengeProps = {
  /**
   * `inline` — compact feed post (expand link).
   * `expanded` — practice extras surface (room for leaderboard below).
   */
  variant?: 'inline' | 'expanded';
  /** Called when user completes a correct full-word transmit. */
  onResult?: (result: DailyChallengeResult) => void;
  /** Expand into game entrypoint (inline only). */
  onExpand?: (event: MouseEvent) => void;
  /** Expand link label (Reddit in-app practice, not the full website). */
  expandLabel?: string;
  /**
   * External full-product site (e.g. https://morsetime.com).
   * Opens via Devvit `navigateTo` (user gets a confirm dialog).
   */
  webTrainingUrl?: string;
  webTrainingLabel?: string;
  /** Extra chrome under the challenge (e.g. leaderboard). */
  below?: ReactNode;
  footer?: ReactNode;
  /** Optional collapsible helper (e.g. Morse cheat sheet) shown near the links. */
  cheatSheet?: ReactNode;
  /** Auto-submit score to `/api/leaderboard` on complete (default true). */
  submitScore?: boolean;
  /**
   * Practice / lesson mode: use this word instead of daily frequency.
   * Remount with a new `key` + word for the next group.
   */
  practiceWord?: string;
  /** Header title override (default Today's Frequency). */
  title?: string;
  /** Right side of header (default streak). */
  headerRight?: ReactNode;
  /** After practice result: primary action (e.g. Next group). */
  onPracticeNext?: () => void;
  practiceNextLabel?: string;
  /** Optional banner above result actions (e.g. Lesson cleared!). */
  practiceResultNote?: string;
  /** Secondary result action — return to Practice hub / home. */
  onHome?: () => void;
  homeLabel?: string;
};

export const DailyChallenge = ({
  variant = 'inline',
  onResult,
  onExpand,
  expandLabel = 'Practice →',
  webTrainingUrl,
  webTrainingLabel = 'Full training on the web →',
  below,
  footer,
  cheatSheet,
  submitScore = true,
  practiceWord,
  title,
  headerRight,
  onPracticeNext,
  practiceNextLabel = 'Next group',
  practiceResultNote,
  onHome,
  homeLabel = 'Home',
}: DailyChallengeProps) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [dailyWord, setDailyWord] = useState<DailyFrequency | null>(null);
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [userBuffer, setUserBuffer] = useState<MorseElement[]>([]);
  const [holding, setHolding] = useState(false);
  const [holdStartedAt, setHoldStartedAt] = useState<number | null>(null);
  const [holdProgressMs, setHoldProgressMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [letterFlash, setLetterFlash] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [showTip, setShowTip] = useState(() => {
    try {
      return localStorage.getItem(TIP_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [streak, setStreak] = useState(0);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [listenWpm, setListenWpm] = useState(() =>
    readNumber('morsetime-listen-wpm', INITIAL_WPM)
  );
  const [activeListenWpm, setActiveListenWpm] = useState(INITIAL_WPM);
  const [wideLetterSpacing, setWideLetterSpacing] = useState(true);
  const [boundaryFlashIndex, setBoundaryFlashIndex] = useState<number | null>(null);
  const [lastSubmit, setLastSubmit] = useState<LeaderboardSubmitResponse | null>(null);
  /** Anti-cheat token issued by GET /api/daily-frequency (echoed on submit). */
  const [dailyToken, setDailyToken] = useState<string | undefined>(undefined);
  /** Share-to-board status for the result card "Post my time" action. */
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'done' | 'error'>('idle');
  const [sharePermalink, setSharePermalink] = useState<string | null>(null);
  /** Top other operators today, for the "others on this frequency" ghost row. */
  const [others, setOthers] = useState<LeaderboardEntry[]>([]);
  /** First-run tutorial overlay (dismissed via localStorage). */
  const [showTutorial, setShowTutorial] = useState(false);
  /** Blind mode: hide the word while transmitting (accessibility drill). */
  const [blindMode, setBlindMode] = useState(false);
  /** Honor prefers-reduced-motion for the completion celebration. */
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  /** Practice: tone events drive single on/off lamp (not a full pattern string). */
  const [listenTones, setListenTones] = useState<ToneMark[]>([]);
  /** AudioContext time at listen lead start — lamp uses same clock as tones. */
  const [audioLeadStart, setAudioLeadStart] = useState<number | null>(null);

  const phaseRef = useRef<Phase>('loading');
  const letterIndexRef = useRef(0);
  const userBufferRef = useRef<MorseElement[]>([]);
  const transmitStartedAtRef = useRef<number | null>(null);
  const listenTimeoutsRef = useRef<number[]>([]);
  const flashTimeoutRef = useRef<number | null>(null);
  const keyPadRef = useRef<HTMLButtonElement>(null);
  const wordLettersRef = useRef<string>('');
  const onResultRef = useRef(onResult);
  const letterCorrectRef = useRef(0);
  const letterAttemptsRef = useRef(0);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isExpanded = variant === 'expanded';
  const isPractice = Boolean(practiceWord);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const clearListenTimers = useCallback(() => {
    for (const id of listenTimeoutsRef.current) {
      window.clearTimeout(id);
    }
    listenTimeoutsRef.current = [];
  }, []);

  const stopSidetone = useCallback(() => {
    try {
      audioEngine.stopSidetone();
    } catch {
      /* ignore */
    }
  }, []);

  const loadDaily = useCallback(async () => {
    setPhaseBoth('loading');
    setLoadError(null);
    try {
      const res = await fetch('/api/daily-frequency');
      if (!res.ok) throw new Error('Failed to load daily frequency');
      const data = (await res.json()) as {
        type: string;
        date: string;
        token?: string;
        data: DailyFrequency;
      };
      if (data.type === 'daily-frequency' && data.data?.word) {
        setDailyWord(data.data);
        setDailyDate(data.date ?? null);
        setDailyToken(data.token);
        wordLettersRef.current = lettersOnly(data.data.word);
        touchInput.setDitThresholdMs(ditDahThresholdMs(INITIAL_WPM));
        setPhaseBoth('idle');
      } else {
        throw new Error('Invalid daily frequency response');
      }
    } catch (err) {
      console.error('Failed to load daily frequency:', err);
      setLoadError(err instanceof Error ? err.message : 'Load failed');
      setPhaseBoth('error');
    }
  }, [setPhaseBoth]);

  useEffect(() => {
    if (practiceWord) {
      queueMicrotask(() => {
        const word = practiceWord.trim();
        const letters = lettersOnly(word);
        if (!letters) {
          setLoadError('Empty practice group');
          setPhaseBoth('error');
          return;
        }
        setDailyWord({
          word,
          morse: '',
          charWpm: INITIAL_WPM,
          effectiveWpm: INITIAL_WPM,
        });
        wordLettersRef.current = letters;
        touchInput.setDitThresholdMs(ditDahThresholdMs(INITIAL_WPM));
        setLoadError(null);
        setPhaseBoth('idle');
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/daily-frequency');
        if (!res.ok) throw new Error('Failed to load daily frequency');
        const data = (await res.json()) as {
          type: string;
          date: string;
          token?: string;
          data: DailyFrequency;
        };
        if (cancelled) return;
        if (data.type === 'daily-frequency' && data.data?.word) {
          setDailyWord(data.data);
          setDailyDate(data.date ?? null);
          setDailyToken(data.token);
          wordLettersRef.current = lettersOnly(data.data.word);
          touchInput.setDitThresholdMs(ditDahThresholdMs(INITIAL_WPM));
          setPhaseBoth('idle');
        } else {
          throw new Error('Invalid daily frequency response');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load daily frequency:', err);
        setLoadError(err instanceof Error ? err.message : 'Load failed');
        setPhaseBoth('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPhaseBoth, practiceWord]);

  // First-run tutorial (daily play only) + persisted daily streak.
  useEffect(() => {
    if (practiceWord) return;
    void (async () => {
      try {
        if (localStorage.getItem('morsetime-tutorial-dismissed') !== '1') {
          setShowTutorial(true);
        }
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) return;
        const data = (await res.json()) as { type?: string; streak?: number };
        if (data.type === 'leaderboard' && typeof data.streak === 'number') {
          setStreak(data.streak);
        }
      } catch (err) {
        console.error('Failed to load streak:', err);
      }
    })();
  }, [practiceWord]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const ensureAudio = useCallback(async () => {
    await audioEngine.init();
  }, []);

  const reportResult = useCallback(
    async (ms: number, letterCount: number) => {
      let submit: LeaderboardSubmitResponse | null = null;
      setLastSubmit(null);
      setOthers([]);
      const letterCorrect = letterCorrectRef.current;
      const letterAttempts = letterAttemptsRef.current;
      if (submitScore && !isPractice) {
        try {
          const res = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elapsedMs: ms, letterCount, token: dailyToken }),
          });
          if (res.ok) {
            submit = (await res.json()) as LeaderboardSubmitResponse;
            if (submit.type === 'leaderboard-submit') {
              setLastSubmit(submit);
              if (typeof submit.streak === 'number') setStreak(submit.streak);
            }
          }
        } catch (err) {
          console.error('Leaderboard submit failed:', err);
        }
        // Load "others on this frequency" (other top operators today).
        void (async () => {
          try {
            const res = await fetch('/api/leaderboard');
            if (!res.ok) return;
            const data = (await res.json()) as { type?: string; entries?: LeaderboardEntry[] };
            if (data.type === 'leaderboard' && Array.isArray(data.entries)) {
              const mine = submit?.username;
              const othersToday = data.entries
                .filter((e) => e.username !== mine)
                .slice(0, 2);
              setOthers(othersToday);
            }
          } catch (err) {
            console.error('Failed to load others:', err);
          }
        })();
      }
      onResultRef.current?.({
        elapsedMs: ms,
        letterCount,
        submit,
        letterCorrect,
        letterAttempts,
      });
    },
    [submitScore, isPractice, dailyToken]
  );

  const shareScore = useCallback(async () => {
    if (!lastSubmit) return;
    setShareState('sharing');
    setSharePermalink(null);
    try {
      const res = await fetch('/api/share-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elapsedMs: lastSubmit.elapsedMs,
          wpm: lastSubmit.wpm,
          rank: lastSubmit.rank,
          improved: lastSubmit.improved,
        }),
      });
      if (!res.ok) throw new Error('share failed');
      const data = (await res.json()) as {
        type?: string;
        permalink?: string;
      };
      if (data.type === 'share-score' && data.permalink) {
        setSharePermalink(data.permalink);
        setShareState('done');
        showToast('Posted to the board! 📻');
      } else {
        throw new Error('bad share response');
      }
    } catch (err) {
      console.error('share-score failed:', err);
      setShareState('error');
      showToast('Could not post — try again');
    }
  }, [lastSubmit]);

  const playListen = useCallback(async () => {
    if (!dailyWord) return;
    clearListenTimers();

    try {
      await ensureAudio();
    } catch (err) {
      console.error('Audio init failed', err);
      return;
    }

    const wasTransmit = phaseRef.current === 'transmit';
    const wpm = hasPlayedOnce ? listenWpm : INITIAL_WPM;
    const interUnits =
      !hasPlayedOnce || wideLetterSpacing
        ? WIDE_INTER_CHAR_UNITS
        : STANDARD_INTER_CHAR_UNITS;
    setActiveListenWpm(wpm);
    touchInput.setDitThresholdMs(ditDahThresholdMs(wpm));

    setRevealCount(0);
    setBoundaryFlashIndex(null);
    setUserBuffer([]);
    userBufferRef.current = [];
    setHolding(false);
    setHoldStartedAt(null);
    setErrorFlash(false);
    setCelebrate(false);
    setAudioLeadStart(null);
    if (!wasTransmit) {
      setPhaseBoth('listen');
    }

    const { chars, totalMs, timing } = buildCharSchedule(
      dailyWord.word,
      wpm,
      interUnits
    );
    const { leadMs, audioLeadStart: leadAudio } = scheduleListenAudio(chars, timing);
    const tones = buildToneMarks(chars, timing, leadMs);
    setListenTones(tones);
    setAudioLeadStart(leadAudio);

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const startId = window.setTimeout(() => {
        setRevealCount(i + 1);
      }, leadMs + ch.startMs);
      listenTimeoutsRef.current.push(startId);

      const endId = window.setTimeout(() => {
        setBoundaryFlashIndex(i);
        const clearId = window.setTimeout(() => {
          setBoundaryFlashIndex((cur) => (cur === i ? null : cur));
        }, 140);
        listenTimeoutsRef.current.push(clearId);
      }, leadMs + ch.endMs);
      listenTimeoutsRef.current.push(endId);
    }

    const doneId = window.setTimeout(() => {
      setRevealCount(chars.length);
      setBoundaryFlashIndex(null);
      setAudioLeadStart(null);
      setHasPlayedOnce(true);
      if (phaseRef.current === 'transmit' || wasTransmit) {
        return;
      }
      setPhaseBoth('ready');
    }, leadMs + totalMs + 50);
    listenTimeoutsRef.current.push(doneId);
  }, [
    dailyWord,
    clearListenTimers,
    ensureAudio,
    setPhaseBoth,
    hasPlayedOnce,
    listenWpm,
    wideLetterSpacing,
  ]);

  const startTransmission = useCallback(async () => {
    if (!dailyWord) return;
    if (phaseRef.current !== 'ready') return;

    clearListenTimers();
    audioEngine.stopAll();
    await ensureAudio();

    const letters = lettersOnly(dailyWord.word);
    wordLettersRef.current = letters;
    letterIndexRef.current = 0;
    userBufferRef.current = [];
    letterCorrectRef.current = 0;
    letterAttemptsRef.current = 0;
    setLetterIndex(0);
    setUserBuffer([]);
    setRevealCount(letters.length);
    setElapsedMs(0);
    setHolding(false);
    setHoldStartedAt(null);
    setErrorFlash(false);
    setCelebrate(false);
    setLastSubmit(null);
    setOthers([]);
    setShareState('idle');
    setSharePermalink(null);
    transmitStartedAtRef.current = performance.now();
    touchInput.setDitThresholdMs(ditDahThresholdMs(listenWpm));
    setPhaseBoth('transmit');
  }, [dailyWord, clearListenTimers, ensureAudio, setPhaseBoth, listenWpm]);

  const tryAgain = useCallback(() => {
    clearListenTimers();
    audioEngine.stopAll();
    letterIndexRef.current = 0;
    userBufferRef.current = [];
    transmitStartedAtRef.current = null;
    setLetterIndex(0);
    setUserBuffer([]);
    setElapsedMs(0);
    setHolding(false);
    setHoldStartedAt(null);
    setErrorFlash(false);
    setCelebrate(false);
    setLastSubmit(null);
    setOthers([]);
    setShareState('idle');
    setSharePermalink(null);
    if (dailyWord) {
      setRevealCount(lettersOnly(dailyWord.word).length);
    }
    setPhaseBoth('ready');
  }, [dailyWord, clearListenTimers, setPhaseBoth]);

  useEffect(() => {
    if (phase !== 'transmit') return;
    let raf = 0;
    const tick = () => {
      const start = transmitStartedAtRef.current;
      if (start !== null) {
        setElapsedMs(Math.round(performance.now() - start));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (!holding || holdStartedAt === null) return;
    let raf = 0;
    const tick = () => {
      setHoldProgressMs(performance.now() - holdStartedAt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holding, holdStartedAt]);

  useEffect(() => {
    if (phase !== 'transmit') {
      touchInput.reset();
      stopSidetone();
      return;
    }

    const onKeyDown = () => {
      if (phaseRef.current !== 'transmit') return;
      setHolding(true);
      setHoldStartedAt(performance.now());
      setHoldProgressMs(0);
      audioEngine.keyDown();
    };

    const onElement = (element: MorseElement) => {
      if (phaseRef.current !== 'transmit') return;
      setHolding(false);
      setHoldStartedAt(null);
      setHoldProgressMs(0);
      audioEngine.keyUp();

      const letters = wordLettersRef.current;
      const idx = letterIndexRef.current;
      if (idx >= letters.length) return;

      const targetChar = letters[idx]!;
      let target: MorseElement[];
      try {
        target = encodeChar(targetChar);
      } catch {
        return;
      }

      const next = [...userBufferRef.current, element];
      const result = matchLetterBuffer(next, target);

      if (result === 'wrong') {
        letterAttemptsRef.current += 1;
        userBufferRef.current = [];
        setUserBuffer([]);
        setErrorFlash(true);
        if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = window.setTimeout(() => setErrorFlash(false), 150);
        return;
      }

      if (result === 'complete') {
        letterAttemptsRef.current += 1;
        letterCorrectRef.current += 1;
        userBufferRef.current = [];
        setUserBuffer([]);
        setLetterFlash(true);
        if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = window.setTimeout(() => setLetterFlash(false), 180);

        const nextIdx = idx + 1;
        letterIndexRef.current = nextIdx;
        setLetterIndex(nextIdx);

        if (nextIdx >= letters.length) {
          const start = transmitStartedAtRef.current ?? performance.now();
          const ms = Math.round(performance.now() - start);
          setElapsedMs(ms);
          transmitStartedAtRef.current = null;
          setCelebrate(true);
          setPhaseBoth('result');
          try {
            audioEngine.playSuccessChime();
          } catch {
            /* ignore */
          }
          try {
            writeFlag(TIP_STORAGE_KEY, true);
            setShowTip(false);
          } catch {
            /* ignore */
          }
          void reportResult(ms, letters.length);
        }
        return;
      }

      userBufferRef.current = next;
      setUserBuffer(next);
    };

    const bound = touchInput.bind({
      onElement,
      onKeyDown,
    });

    const pad = keyPadRef.current;
    if (pad) {
      pad.addEventListener('pointerdown', bound.onPointerDown);
      pad.addEventListener('pointerup', bound.onPointerUp);
      pad.addEventListener('pointercancel', bound.onPointerUp);
      pad.addEventListener('pointerleave', bound.onPointerUp);
      pad.focus();
    }

    bound.bindKeyboard(document);

    return () => {
      if (pad) {
        pad.removeEventListener('pointerdown', bound.onPointerDown);
        pad.removeEventListener('pointerup', bound.onPointerUp);
        pad.removeEventListener('pointercancel', bound.onPointerUp);
        pad.removeEventListener('pointerleave', bound.onPointerUp);
      }
      bound.unbindKeyboard(document);
      stopSidetone();
    };
  }, [phase, setPhaseBoth, stopSidetone, reportResult]);

  useEffect(() => {
    return () => {
      clearListenTimers();
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      audioEngine.stopAll();
    };
  }, [clearListenTimers]);

  const displayLetters = dailyWord ? lettersOnly(dailyWord.word) : '';
  const fullReveal = phase === 'ready' || phase === 'transmit' || phase === 'result';
  const visibleCount = fullReveal ? displayLetters.length : revealCount;
  const liveGlyphs = elementsToGlyphs(userBuffer);
  const thresholdMs = ditDahThresholdMs(listenWpm);
  const holdBarPct = Math.min(100, (holdProgressMs / (thresholdMs * 2)) * 100);

  const canStart = phase === 'ready';
  const playLabel =
    phase === 'idle' ? 'Play transmission' : phase === 'listen' ? 'Playing…' : 'Replay';

  const handleExpand = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onExpand?.(e.nativeEvent);
  };

  const isResult = phase === 'result';
  const showPlayControls = phase !== 'result' && phase !== 'loading' && phase !== 'error';

  const resultMs = lastSubmit?.elapsedMs ?? elapsedMs;
  const resultWpm =
    lastSubmit?.wpm ??
    Math.round(transmitWpm(elapsedMs, displayLetters.length || 1) * 10) / 10;
  const resultRank = lastSubmit?.rank ?? null;
  const resultImproved = lastSubmit?.improved ?? false;

  // Layout: main challenge centered in space above board; leaderboard + footer pinned to bottom.
  // Outer flex-1 + my-auto centers when short; overflow-y-auto still reaches the top when tall.
  return (
    <div className="relative flex h-full w-full flex-col bg-slate-900 text-white overflow-hidden box-border">
      {showTutorial && !isPractice && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="How to play"
        >
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/30 bg-slate-900 px-5 py-5 flex flex-col gap-3 shadow-2xl">
            <h2 className="text-base font-bold text-white">How to play 📻</h2>
            <ol className="flex flex-col gap-2 text-sm text-slate-300 list-decimal list-inside">
              <li>
                Tap <span className="text-orange-300">Play transmission</span> to hear today's word in Morse.
              </li>
              <li>
                Hit <span className="text-orange-300">Start transmission</span>, then hold to key it back.
              </li>
              <li>
                A short hold = <span className="font-mono">·</span> (dit), a long hold ={' '}
                <span className="font-mono">−</span> (dah).
              </li>
              <li>Fastest correct copy lands on the pinned leaderboard.</li>
            </ol>
            <button
              type="button"
              className="mt-1 w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-full font-bold min-h-11 text-sm"
              onClick={() => {
                try {
                  localStorage.setItem('morsetime-tutorial-dismissed', '1');
                } catch {
                  /* ignore */
                }
                setShowTutorial(false);
              }}
            >
              Got it — let's key
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-2">
        <div className="my-auto flex w-full flex-col items-center gap-1">
        <header className="w-full max-w-md flex items-center justify-between shrink-0">
          <h1 className={`font-bold ${isExpanded ? 'text-lg' : 'text-base'}`}>
            {title ?? (isPractice ? 'Lesson' : "📻 Today's Frequency")}
          </h1>
          {headerRight !== undefined ? (
            headerRight
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs tabular-nums ${
                  streak > 0 ? 'text-orange-300/90' : 'text-slate-500'
                }`}
                title="Daily play streak"
              >
                {streak > 0 ? `🔥 ${streak}` : 'streak 0'}
              </span>
              {isExpanded && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={blindMode}
                  title="Blind mode — hide the word while you transmit"
                  onClick={() => setBlindMode((v) => !v)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    blindMode
                      ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40'
                      : 'bg-slate-800 text-slate-400 ring-1 ring-slate-600/50'
                  }`}
                >
                  Blind {blindMode ? 'on' : 'off'}
                </button>
              )}
            </div>
          )}
        </header>

        {dailyDate && !isPractice && (
          <p className="text-xs text-slate-500 mt-0.5">{dailyDate}</p>
        )}

        {phase === 'loading' && (
          <p className="text-slate-400 text-sm">
            {isPractice ? 'Loading group…' : "Loading today's transmission…"}
          </p>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-red-400 text-sm">{loadError ?? 'Could not load daily word'}</p>
            <button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-bold min-h-11"
              onClick={() => void loadDaily()}
            >
              Retry
            </button>
          </div>
        )}

        {!isPractice && (
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 text-center shrink-0">
            Everyone gets the same word every day. Listen first, then key as fast
            as you can.
          </div>
        )}

        {/* ── RESULT: title · time · WPM · rank / next group ── */}
        {dailyWord && isResult && (
          <div
            className={`w-full max-w-sm shrink-0 rounded-2xl border border-green-500/25 bg-linear-to-b from-green-500/15 to-slate-900/40 px-5 py-4 flex flex-col items-center gap-3 ${
              celebrate && !reduceMotion ? 'mt-celebrate-banner' : ''
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400/90">
              {isPractice ? 'Group clear' : 'Transmission received'}
            </p>

            {practiceResultNote && (
              <p className="text-sm text-orange-200 text-center font-medium">{practiceResultNote}</p>
            )}

            <div className="flex flex-col items-center gap-0.5">
              <p className="font-mono text-4xl sm:text-[2.75rem] text-white tabular-nums font-bold leading-none tracking-tight">
                {resultMs.toLocaleString()}
                <span className="text-lg text-slate-400 font-semibold ml-1.5">ms</span>
              </p>
              <p className="font-mono text-base text-slate-300 tabular-nums mt-1">
                {resultWpm.toFixed(1)}
                <span className="text-slate-500 text-sm ml-1">WPM</span>
              </p>
            </div>

            {!isPractice && (
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  resultRank === 1
                    ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30'
                    : resultRank !== null && resultRank <= 3
                      ? 'bg-slate-700/80 text-slate-100 ring-1 ring-slate-500/40'
                      : 'bg-slate-800/80 text-slate-300 ring-1 ring-slate-600/50'
                }`}
              >
                {resultRank === null ? (
                  <span className="text-slate-500 text-xs">Ranking…</span>
                ) : (
                  <>
                    <span aria-hidden>
                      {resultRank === 1
                        ? '🥇'
                        : resultRank === 2
                          ? '🥈'
                          : resultRank === 3
                            ? '🥉'
                            : '#'}
                    </span>
                    <span>
                      Rank #{resultRank}
                      {resultImproved ? (
                        <span className="text-orange-300/90 font-normal"> · new best</span>
                      ) : null}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="mt-0.5 w-full max-w-48 flex flex-col gap-2">
              {isPractice && onPracticeNext ? (
                <button
                  type="button"
                  className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white px-6 py-2.5 rounded-full font-bold min-h-11 text-sm shadow-lg shadow-orange-900/30 transition-colors"
                  onClick={onPracticeNext}
                >
                  {practiceNextLabel}
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white px-6 py-2.5 rounded-full font-bold min-h-11 text-sm shadow-lg shadow-orange-900/30 transition-colors"
                  onClick={tryAgain}
                >
                  Retry
                </button>
              )}
              {!isPractice && lastSubmit && (
                <button
                  type="button"
                  disabled={shareState === 'sharing' || shareState === 'done'}
                  className="w-full bg-slate-100 hover:bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold min-h-11 text-sm transition-colors disabled:opacity-60"
                  onClick={() => void shareScore()}
                >
                  {shareState === 'sharing'
                    ? 'Posting…'
                    : shareState === 'done'
                      ? 'Posted ✓'
                      : 'Post my time'}
                </button>
              )}
              {!isPractice && shareState === 'done' && sharePermalink && (
                <button
                  type="button"
                  className="w-full text-xs text-orange-300/90 hover:text-orange-200 transition-colors"
                  onClick={() => navigateTo(sharePermalink)}
                >
                  View on Reddit ↗
                </button>
              )}
              {onHome && (
                <button
                  type="button"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 ring-1 ring-slate-600/60 px-6 py-2.5 rounded-full font-semibold min-h-11 text-sm transition-colors"
                  onClick={onHome}
                >
                  {homeLabel}
                </button>
              )}
            </div>

            {!isPractice && others.length > 0 && (
              <div className="w-full max-w-sm mt-1 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Others on this frequency
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {others.map((o) => (
                    <li
                      key={`${o.rank}-${o.username}`}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-400 truncate">
                        <span className="text-slate-600 mr-1">#{o.rank}</span>
                        u/{o.username}
                      </span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {o.elapsedMs.toLocaleString()}
                        <span className="text-slate-600 text-[9px] ml-0.5">ms</span>
                        <span className="text-slate-600 ml-1">· {o.wpm.toFixed(1)} WPM</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── PLAY / LISTEN / TRANSMIT ── */}
        {dailyWord && showPlayControls && (
          <>
            <div
              className={`w-full max-w-md text-center relative shrink-0 mt-8 pt-1 pb-1 ${
                celebrate && !reduceMotion ? 'mt-celebrate-word' : ''
              }`}
              aria-live="polite"
            >
              <p
                className={`font-mono font-bold tracking-[0.35em] min-h-9 relative z-10 ${
                  isExpanded ? 'text-4xl' : 'text-3xl sm:text-4xl'
                }`}
              >
                {displayLetters.split('').map((ch, i) => {
                  const shown = i < visibleCount;
                  const isCurrent = phase === 'transmit' && i === letterIndex;
                  const isDone = phase === 'transmit' && i < letterIndex;
                  const isFuture = phase === 'transmit' && i > letterIndex;
                  const isBoundary = phase === 'listen' && boundaryFlashIndex === i;
                  let cls = 'inline-block transition-colors duration-100';
                  if (!shown) cls += ' opacity-0';
                  else if (isBoundary) cls += ' text-orange-200 mt-letter-boundary';
                  else if (isCurrent) cls += ' text-orange-300 underline underline-offset-4';
                  else if (isDone && letterFlash && i === letterIndex - 1) cls += ' text-green-400 transition-colors duration-75';
                  else if (isDone) cls += ' text-slate-200';
                  else if (isFuture) cls += ' text-slate-500 opacity-60';
                  else cls += ' text-white';
                  return (
                    <span key={`${ch}-${i}`} className={cls}>
                      {blindMode && phase === 'transmit' ? '·' : shown ? ch : '·'}
                    </span>
                  );
                })}
              </p>
              {phase === 'listen' && (
                <p className="text-xs text-orange-400/80 mt-1.5 animate-pulse">
                  Listening… {activeListenWpm} WPM
                  {wideLetterSpacing || !hasPlayedOnce ? ' · wide gaps' : ''}
                </p>
              )}
              {phase !== 'listen' && phase !== 'transmit' && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {activeListenWpm} WPM
                  {hasPlayedOnce && wideLetterSpacing ? ' · wide letter spacing' : ''}
                </p>
              )}
            </div>

            {/* Practice: single lamp hard ON/OFF with each tone (audio clock) */}
            {isPractice && phase === 'listen' && listenTones.length > 0 && (
              <MorseSoundBars
                tones={listenTones}
                audioLeadStart={audioLeadStart}
                getAudioTimeSec={() => audioEngine.getCurrentTime()}
                caption="· dit  − dah"
              />
            )}

            {/* Transmit: large · / − by hold length (same style as listen) */}
            {isPractice && phase === 'transmit' && (
              <div
                className="w-full max-w-sm shrink-0 flex flex-col items-center gap-1"
                aria-hidden
              >
                <span
                  className={`font-mono text-6xl sm:text-7xl font-bold leading-none min-h-14 select-none ${
                    holding
                      ? holdBarPct >= 50
                        ? 'text-orange-400 opacity-100 drop-shadow-[0_0_14px_rgba(251,146,60,0.6)]'
                        : 'text-orange-300 opacity-100 drop-shadow-[0_0_12px_rgba(253,186,116,0.55)]'
                      : 'text-transparent opacity-0'
                  }`}
                >
                  {holding ? (holdBarPct >= 50 ? '−' : '·') : '\u00a0'}
                </span>
                <p className="text-[10px] text-slate-500">hold · short / − long</p>
              </div>
            )}

            {/* Live ·/− input display — always reserved in transmit */}
            {phase === 'transmit' && (
              <div
                className={`w-full max-w-sm text-center shrink-0 min-h-8 rounded-lg px-2 py-1 transition-colors duration-150 ${
                  errorFlash
                    ? 'bg-red-500/20'
                    : liveGlyphs || holding
                      ? 'bg-slate-800/70'
                      : 'bg-transparent'
                }`}
              >
                <p
                  className={`font-mono font-semibold tracking-[0.4em] min-h-6 ${
                    errorFlash
                      ? 'text-red-300 text-xl'
                      : liveGlyphs
                        ? 'text-orange-100 text-xl'
                        : 'text-transparent text-sm'
                  }`}
                >
                  {liveGlyphs || ''}
                </p>
              </div>
            )}

            <div className="w-full max-w-md flex flex-col gap-1 items-center mt-0.5 shrink-0">
              {/* Compact controls: slider + pill toggle (not a full-width bordered card) */}
              {hasPlayedOnce && phase !== 'listen' && (
                <div className="w-full max-w-sm flex items-center gap-2 px-1 shrink-0">
                  <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Speed</span>
                      <span className="font-mono text-slate-300">{listenWpm}</span>
                    </div>
                    <input
                      type="range"
                      min={WPM_MIN}
                      max={WPM_MAX}
                      step={1}
                      value={listenWpm}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setListenWpm(v);
                        writeNumber('morsetime-listen-wpm', v);
                        touchInput.setDitThresholdMs(ditDahThresholdMs(v));
                      }}
                      className="w-full h-1.5 accent-orange-500 cursor-pointer"
                      aria-label="Replay speed in words per minute"
                    />
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={wideLetterSpacing}
                    title="Wide letter spacing — longer gaps between letters"
                    onClick={() => setWideLetterSpacing((v) => !v)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      wideLetterSpacing
                        ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40'
                        : 'bg-slate-800 text-slate-400 ring-1 ring-slate-600/50'
                    }`}
                  >
                    Wide {wideLetterSpacing ? 'on' : 'off'}
                  </button>
                </div>
              )}

              {phase !== 'transmit' && (
                <div className="flex flex-wrap gap-2 justify-center w-full max-w-sm shrink-0">
                  <button
                    type="button"
                    disabled={phase === 'listen'}
                    className={`disabled:opacity-40 text-white px-5 py-2.5 rounded-full min-h-10 text-sm transition-colors ${
                      phase === 'idle'
                        ? 'bg-orange-600 hover:bg-orange-500 font-bold shadow-lg shadow-orange-900/20'
                        : 'bg-slate-700 hover:bg-slate-600 font-semibold'
                    }`}
                    onClick={() => {
                      void playListen();
                    }}
                  >
                    {playLabel}
                  </button>
                  <button
                    type="button"
                    disabled={!canStart}
                    className={`disabled:opacity-40 text-white px-5 py-2.5 rounded-full min-h-10 text-sm transition-colors ${
                      canStart
                        ? 'bg-orange-600 hover:bg-orange-500 font-bold shadow-lg shadow-orange-900/20'
                        : 'bg-slate-700 hover:bg-slate-600 font-semibold'
                    }`}
                    onClick={() => void startTransmission()}
                  >
                    Start transmission
                  </button>
                </div>
              )}

              {phase === 'transmit' && (
                <>
                  <div className="flex items-center justify-center gap-3 w-full max-w-sm shrink-0">
                    <p
                      className="font-mono text-sm text-slate-400 tabular-nums"
                      aria-live="polite"
                    >
                      {elapsedMs} ms
                      <span className="text-slate-600 mx-1.5">·</span>
                      {Math.min(letterIndex + 1, displayLetters.length)}/
                      {displayLetters.length}
                    </p>
                    <button
                      type="button"
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0"
                      onClick={() => {
                        void playListen();
                      }}
                    >
                      Replay
                    </button>
                  </div>
                  <button
                    ref={keyPadRef}
                    type="button"
                    className="w-full max-w-sm shrink rounded-2xl border-2 border-orange-500/50 bg-slate-800 active:bg-slate-700 active:border-orange-400 text-slate-100 font-semibold select-none min-h-16"
                    style={{ touchAction: 'none' }}
                    aria-label="Hold to key Morse"
                  >
                    Hold to key
                    <span className="block text-xs font-normal text-slate-400 mt-1">
                      Space / Enter · short · long −
                    </span>
                  </button>
                </>
              )}

              {showTip && phase !== 'transmit' && (
                <div className="flex items-center justify-center gap-2 max-w-xs shrink-0">
                  <p className="text-xs text-slate-500 text-center">
                    Play transmission, then start transmitting each letter.
                  </p>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                    onClick={() => {
                      writeFlag(TIP_STORAGE_KEY, true);
                      setShowTip(false);
                    }}
                  >
                    Don't show again
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {(variant === 'inline' && onExpand && !isResult) || webTrainingUrl ? (
          <div className="flex flex-row flex-wrap items-center justify-center gap-3 shrink-0 mt-1">
            {variant === 'inline' && onExpand && !isResult && (
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-white transition-colors shrink-0"
                onClick={handleExpand}
              >
                {expandLabel}
              </button>
            )}
            {webTrainingUrl && (
              <button
                type="button"
                className="text-sm text-orange-400/90 hover:text-orange-300 transition-colors shrink-0"
                onClick={() => navigateTo(webTrainingUrl)}
              >
                {webTrainingLabel}
              </button>
            )}
            {cheatSheet && <div className="flex-1 min-w-0">{cheatSheet}</div>}
          </div>
        ) : null}
        </div>
      </div>

      {below && (
        <div className="w-full shrink-0 flex justify-center px-3 mb-3">
          <div className="w-full max-w-md">{below}</div>
        </div>
      )}

      <div className="shrink-0 flex justify-center items-center gap-3 px-3 pb-2 pt-0 text-[0.75em] text-slate-600">
        {footer ?? <span className="text-slate-700">MorseTime</span>}
      </div>
    </div>
  );
};
