import { useState } from 'react';
import { MORSE_MAP, elementsToGlyphs, type MorseElement } from '../../shared/morse';

export type MorseCheatSheetProps = {
  defaultOpen?: boolean;
  title?: string;
};

const CHART_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

/**
 * Collapsible Morse reference chart. Reused in the inline feed post (next to the
 * Practice link) and the training hub.
 */
export const MorseCheatSheet = ({
  defaultOpen = false,
  title = 'Morse cheat sheet',
}: MorseCheatSheetProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors py-1 px-1"
      >
        <span>{title}</span>
        <span aria-hidden className="text-slate-500">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="mt-1 grid grid-cols-6 gap-1 rounded-lg border border-slate-800 bg-slate-950/50 p-2">
          {CHART_ORDER.map((ch) => {
            const els = MORSE_MAP[ch] as MorseElement[] | undefined;
            return (
              <div
                key={ch}
                className="flex flex-col items-center rounded-md bg-slate-900/70 px-1 py-1.5"
                title={`${ch} = ${els ? elementsToGlyphs(els) : ''}`}
              >
                <span className="text-sm font-bold text-slate-100 leading-none">{ch}</span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5 leading-none">
                  {els
                    ? els.map((el, i) =>
                        el === 'dit' ? (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-orange-300"
                            aria-label="dit"
                          />
                        ) : (
                          <span
                            key={i}
                            className="h-1 w-3 rounded-full bg-orange-300"
                            aria-label="dah"
                          />
                        ),
                      )
                    : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
