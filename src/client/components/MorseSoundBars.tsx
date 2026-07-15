import { useEffect, useRef } from 'react';
import type { MorseElement } from '../../shared/morse';
import type { ToneMark } from './MorseSoundBarsTypes';

export type MorseSoundBarsProps = {
  tones: ToneMark[];
  /**
   * AudioContext.currentTime at the start of the listen lead-in
   * (same epoch as scheduleTone times minus char offsets).
   */
  audioLeadStart: number | null;
  /** Live AudioContext.currentTime (seconds). */
  getAudioTimeSec: () => number;
  className?: string;
  caption?: string;
};

/** Invisible but keeps layout height so the UI doesn’t jump. */
const GLYPH_OFF =
  'font-mono text-6xl sm:text-7xl font-bold leading-none min-h-[3.5rem] text-transparent select-none opacity-0';
const GLYPH_DIT =
  'font-mono text-6xl sm:text-7xl font-bold leading-none min-h-[3.5rem] text-orange-300 select-none opacity-100 drop-shadow-[0_0_12px_rgba(253,186,116,0.55)]';
const GLYPH_DAH =
  'font-mono text-6xl sm:text-7xl font-bold leading-none min-h-[3.5rem] text-orange-400 select-none opacity-100 drop-shadow-[0_0_14px_rgba(251,146,60,0.6)]';

/**
 * CW indicator: large · or − only while tone is on (hard on/off, audio clock).
 * No separate lamp — glyph is the indicator.
 */
export function MorseSoundBars({
  tones,
  audioLeadStart,
  getAudioTimeSec,
  className = '',
  caption,
}: MorseSoundBarsProps) {
  const glyphRef = useRef<HTMLSpanElement>(null);
  const lastOnRef = useRef<boolean | null>(null);
  const lastTypeRef = useRef<MorseElement | null>(null);
  const tonesRef = useRef(tones);
  const getAudioRef = useRef(getAudioTimeSec);

  useEffect(() => {
    tonesRef.current = tones;
  }, [tones]);
  useEffect(() => {
    getAudioRef.current = getAudioTimeSec;
  }, [getAudioTimeSec]);

  useEffect(() => {
    const glyph = glyphRef.current;
    if (!glyph) return;

    const setOff = () => {
      if (lastOnRef.current === false) return;
      lastOnRef.current = false;
      lastTypeRef.current = null;
      glyph.textContent = '\u00a0'; // keep line box without a visible ·
      glyph.className = GLYPH_OFF;
    };

    if (audioLeadStart === null || tones.length === 0) {
      setOff();
      return;
    }

    const lead = audioLeadStart;
    let raf = 0;

    const tick = () => {
      const elapsedMs = (getAudioRef.current() - lead) * 1000;
      const list = tonesRef.current;
      let mark: ToneMark | null = null;
      for (let i = 0; i < list.length; i++) {
        const m = list[i]!;
        const end = m.startMs + m.durationMs;
        if (elapsedMs < m.startMs) break;
        if (elapsedMs < end) {
          mark = m;
          break;
        }
      }

      if (!mark) {
        setOff();
      } else if (lastOnRef.current !== true || lastTypeRef.current !== mark.type) {
        lastOnRef.current = true;
        lastTypeRef.current = mark.type;
        if (mark.type === 'dit') {
          glyph.textContent = '·';
          glyph.className = GLYPH_DIT;
        } else {
          glyph.textContent = '−';
          glyph.className = GLYPH_DAH;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      setOff();
    };
  }, [audioLeadStart, tones]);

  return (
    <div
      className={`w-full max-w-sm shrink-0 flex flex-col items-center gap-1 ${className}`}
      aria-hidden
    >
      <span ref={glyphRef} className={GLYPH_OFF}>
        {'\u00a0'}
      </span>
      {caption && (
        <p className="text-[10px] text-slate-500 text-center">{caption}</p>
      )}
    </div>
  );
}

