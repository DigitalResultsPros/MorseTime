# New main page (splash) — coding agent instructions

**Path:** `project/design/new.md`  
**Status:** Implementation brief (locked product intent 2026-07-10)  
**Surface:** **Inline main page** = `src/client/splash.tsx` (+ `splash.html` styles via `index.css`)  
**Stack:** React 19 + Tailwind + Web Audio + optional light Canvas/DOM — **no Phaser**  
**Related:** [ux.md](./ux.md) · [gui.md](./gui.md) · [../agent/DECISIONS.md](../agent/DECISIONS.md)

---

## 1. Goal

Replace the current splash “play along with shared playhead / waveform” UX with:

1. **Full-word listen** — Morse audio; letters appear one-by-one in the top display as each character’s tones play; after the last letter, **full word** stays visible.
2. **Replay** — user can replay the incoming transmission (listen phase behavior).
3. **Start transmission** — explicit button; **timer starts (ms)**; keying enabled only after this.
4. **Letter-by-letter keying** — hold duration = dit/dah; **sidetone**; live **· / −** in a **secondary area under the word** (subtle, not distracting).
5. **Progress** — completed letters accumulate toward the full word; wrong attempt clears the current letter buffer only.
6. **Result** — on full word complete: stop timer, show **time in ms**, celebration, try again / open full game.

**Out of scope for this change:** Phaser, choir, leaderboard API, UI i18n, rewriting `game.tsx` lessons (leave expanded game for a follow-up unless trivial to share helpers).

---

## 2. Product rules (locked)

| Rule | Detail |
|------|--------|
| Sequencing | **Full listen first**, then transmit whole word letter-by-letter |
| Top display | **Full word** after listen completes; **remains visible** during transmit as reference |
| During listen | Letters appear **individually** synced to each character’s audio; no dit/dah on top display |
| After last listen letter | Full word shown on top |
| Replay | Allowed in idle/listen; **after Start, allowed** but **timer keeps running** (default) |
| Start transmission | Required before any keying; starts ms timer |
| Keying | Pointer hold + Space/Enter hold; **duration** → dit/dah; **sidetone** on hold |
| Live ·/− | Yes, **second area under word**; must stay **subtle** (see §5) |
| Wrong letter | Clear **current letter only** buffer; stay on same index; timer continues |
| Letter complete | Exact Morse match for `word[index]` via shared encode |
| Word complete | All letters matched → stop timer → show **ms** + celebration |
| Daily word | From `GET /api/daily-frequency`; same for all users |
| Phaser | **Do not add** |

---

## 3. Phase machine

```ts
type Phase =
  | 'loading'      // fetch daily word
  | 'idle'         // word loaded; not yet listening (or after reset)
  | 'listen'       // playing target audio; letters reveal
  | 'ready'        // listen finished (or skipped replay done); show full word; await Start
  | 'transmit'     // timer running; keying on
  | 'result';      // word complete; show ms + celebration
```

### Transitions

| From | To | Trigger |
|------|-----|---------|
| `loading` | `idle` | Daily word loaded (or error fallback) |
| `idle` | `listen` | User taps **Play transmission** / first play |
| `listen` | `ready` | Audio for last character finished |
| `ready` | `listen` | **Replay** |
| `ready` | `transmit` | **Start transmission** |
| `transmit` | `listen` | **Replay** (optional; timer **does not** reset) |
| `transmit` | `result` | All letters completed correctly |
| `result` | `ready` or `idle` | **Try again** (reset letter progress + timer; keep word) |
| any | cleanup | Unmount: stop audio, unbind input |

### Input enablement

| Phase | Keying | Sidetone |
|-------|--------|----------|
| `loading` / `idle` / `listen` / `ready` / `result` | **Off** | Off |
| `transmit` | **On** | On key down/up |

---

## 4. UI layout (main page)

Mobile-first, Reddit **inline** height-friendly. Dark slate aesthetic consistent with current app.

```text
┌─────────────────────────────────────────┐
│  📻 Today's Frequency          [streak] │  chrome (minimal)
├─────────────────────────────────────────┤
│                                         │
│              [  P A R I S  ]            │  TOP: target word area
│           (builds during listen;        │  full word after listen;
│            full word during transmit)   │  no ·/− here
│                                         │
├─────────────────────────────────────────┤
│         · · −     − − ·                 │  BOTTOM: live ·/− (subtle)
│         (current letter only)           │  see §5
├─────────────────────────────────────────┤
│   Completed: P A R _ _                  │  optional progress row
│   Letter 3 of 5                         │  quiet meta
├─────────────────────────────────────────┤
│  [ Play / Replay ]  [ Start transmission ] │
│  Timer: 1240 ms     (only in transmit+) │
└─────────────────────────────────────────┘
```

### Top display (target word)

- During **listen:** reveal letters left-to-right as each character’s Morse finishes (or as it **starts** — pick **start of char audio** for tighter AV sync; document choice in code comment).
- **Recommended sync:** show letter at **start** of that character’s scheduled tones.
- After listen: all letters visible, stable, readable (large mono or bold tracking).
- During **transmit:** same full word stays visible (reference). Optional: subtle highlight on **current** index (underline / dim future letters) — keep mild.

### Bottom area (live ·/−) — required, non-distracting

Show only the **current letter’s** in-progress symbols, not the whole word’s history.

**Do:**

- Small type (`text-sm` / `text-xs`), muted color (`text-slate-400` / `slate-500`)
- Monospace · and − with comfortable letter-spacing
- Max one line; ellipsis if absurd length
- Low visual weight vs top word (`opacity-70`, no glow, no particles here)
- Optional: thin bar that **grows while finger is down** (provisional mark) in even quieter gray, then commits to · or − on release

**Don’t:**

- Large CRT waveform competing with the word
- Flashing rainbow on every dit
- Labels “DIT” “DAH” in all caps every time (optional tiny once on first use)
- Second full waveform canvas at feed height

### Ideas for subtle ·/− (pick one primary)

| Idea | Implementation | Why subtle |
|------|----------------|------------|
| **A. Quiet glyph strip** (recommended) | DOM: `··−` in `font-mono text-slate-400 tracking-widest` | Zero canvas cost; clear |
| **B. Mini block ticks** | 1-unit / 3-unit CSS widths, height 3–4px, slate-500 | Feels “keyer” without noise |
| **C. Single-line canvas** | ~24–32px tall, slate marks only, no grid/CRT | Only if DOM feels wrong |
| **D. After-release only** | Hide live hold bar; append ·/− only on key-up | Least motion; slightly less feedback |

**Default for agent: A + provisional hold bar (thin).**

On correct letter: brief soft flash (opacity) then **clear** the ·/− strip and advance index.  
On wrong (optional early detect): soft red tint 150ms, clear buffer — no modal.

### Controls

- **Play transmission** / **Replay** — starts listen from beginning; reveals letters again from empty (or keep full word dimmed until replay finishes — **default: clear reveal and rebuild** on replay).
- **Start transmission** — enabled in `ready` (and disabled in `listen`). In `transmit`, hide or disable Start; show running **ms** timer.
- **Open full game** — keep secondary link via `requestExpandedMode(..., 'game')` if present today.

### Result

- Large **time: N ms** (also show seconds with one decimal optional: `1.24 s` secondary).
- Celebration: short CSS scale/opacity on word + existing particle helper **only if cheap**; prefer CSS.
- **Try again** → back to `ready` with cleared progress and timer zeroed (require Start again).

---

## 5. Audio

### Listen (target)

- Use `AudioEngine` + schedule tones from `encode` / timing in `src/shared/morse.ts`.
- Use daily `charWpm` / `effectiveWpm` when present; Farnsworth gaps if helpers exist.
- **Unlock AudioContext** on first user gesture (Play / Start).
- Play **full word** character by character with correct inter-char / word gaps.
- Drive top letter reveal from the **same schedule** (shared timing array), not a separate `setInterval` guess.

### Transmit (user)

- On pointer/key **down:** `keyDown()` sidetone immediately.
- On **up:** `keyUp()`; classify dit/dah.
- **Threshold:** WPM-relative — e.g. midpoint between 1-unit and 3-unit at `charWpm` (fallback 150ms if wpm missing).
- No target audio while user holds (avoid mud); replay is separate explicit action.

### Result

- Optional short success chime (P1); not required for MVP of this page.

---

## 6. Input

- Reuse / extend `TouchInput`:
  - Emit **`onKeyDown`** and **`onKeyUp(element, durationMs)`** (or equivalent) so UI can show provisional hold + commit ·/−.
  - Bind pointer on a large **hit target** (button or pad), not only a tiny canvas.
  - Keyboard: Space/Enter both hold-to-key; `preventDefault`; ignore `repeat`.
- Only attach/enable while `phase === 'transmit'`.
- `touch-action: none` on the key surface.

### Letter matching

```ts
// Pseudocode
const target = encodeChar(word[letterIndex]) // MorseElement[]
// userBuffer: MorseElement[]
// on each committed element:
if (userBuffer length matches and deep-equal target) → complete letter
if (userBuffer is not a prefix of target) → wrong → clear buffer
// optional: if longer than target without match → wrong
```

Use `src/shared/morse.ts` encode maps; do **not** invent per-letter tables in the component.

### Word complete

- `letterIndex === word.length` after completing last letter.
- `elapsedMs = now - transmitStartedAt` (use `performance.now()`).
- Show integer **ms** (round). Later leaderboard can use same value.

---

## 7. Files to touch

| File | Work |
|------|------|
| `src/client/splash.tsx` | **Primary rewrite** — phase machine, layout, wire audio/input |
| `src/client/index.css` | Layout helpers if Tailwind alone is awkward; keep sparse |
| `src/client/systems/TouchInput.ts` | Key down/up events; WPM-relative threshold API |
| `src/client/systems/AudioEngine.ts` | Ensure sidetone + scheduled play work; envelope if easy |
| `src/shared/morse.ts` | Use encode/timing; add small helpers if needed (`encodeChar`, `isPrefix`) |
| `src/client/systems/WaveformViz.ts` | **Do not require** for this UX; leave unused or remove from splash only |
| `src/client/game.tsx` | Out of scope unless extracting shared hooks |
| Server | No change required for MVP |

---

## 8. State model (suggested)

```ts
type Phase = 'loading' | 'idle' | 'listen' | 'ready' | 'transmit' | 'result';

// dailyWord: DailyFrequency | null
// phase: Phase
// revealCount: number        // letters visible during listen (0..len)
// letterIndex: number        // current transmit index
// userBuffer: MorseElement[] // current letter only
// completedOk: boolean[]     // optional
// liveGlyphs: string         // '·−·' display for current buffer
// holding: boolean
// holdStartedAt: number | null
// transmitStartedAt: number | null
// elapsedMs: number          // frozen on result; ticking in transmit
// errorFlash: boolean
```

Keep audio schedule tokens/timeouts in refs; clear on replay/unmount.

---

## 9. Acceptance criteria

1. On load, daily word fetched; no crash if offline (show error/retry).
2. **Play** runs full Morse; top letters appear one-by-one with audio; end state shows **full word**.
3. **Replay** repeats listen reveal behavior.
4. Keying does **nothing** until **Start transmission**.
5. Start starts **ms timer**; ·/− area updates subtly on keying; sidetone works.
6. Correct letter clears ·/− strip and advances; full word remains on top.
7. Wrong sequence clears current buffer only; timer continues.
8. Completing last letter freezes timer and shows **time in ms** + clear success state.
9. Fits ~inline width; no horizontal scroll; primary buttons ≥ 44px tall.
10. No Phaser; no new heavy deps.
11. `npm run type-check` and `npm run test` still pass (update tests if TouchInput API changes).

---

## 10. Explicit non-goals (this PR)

- Shared playhead “tap along with ghost”
- Showing dit/dah on the **top** target word display
- Choir, leaderboard POST, Redis streak durability
- Phaser / three.js
- Full CRT waveform as primary UI
- Multilingual Morse content
- Rewriting expanded `game.tsx` curriculum

---

## 11. Implementation order for the agent

1. Phase state + layout shell (top word, bottom ·/−, buttons, timer readout).
2. Listen scheduler: audio + `revealCount` sync; transition to `ready`.
3. Replay.
4. TouchInput down/up + sidetone + WPM threshold; enable only in `transmit`.
5. Letter buffer match / wrong / advance; live ·/− strip.
6. Start transmission + `performance.now()` timer UI (raf or 50ms interval).
7. Result celebration + try again.
8. Polish subtlety of ·/−; remove old splash waveform path if dead.
9. type-check + tests.

---

## 12. Open questions (defaults applied)

| # | Question | **Default if unanswered** |
|---|----------|---------------------------|
| 1 | Reveal letter at start or end of its tones? | **Start** of char audio |
| 2 | Replay during transmit resets reveal animation? | **Yes** rebuild letters with audio; timer keeps running |
| 3 | Highlight current letter in full word during transmit? | **Yes**, mild (opacity on other letters) |
| 4 | Show running ms during transmit or only at end? | **Both** — live counter + final |
| 5 | Spaces in daily words? | If word has space, treat as word-gap in audio; skip or show `·` gap in UI — **prefer word list without spaces** for MVP |
| 6 | Submit leaderboard on complete? | **Not in this PR** |
| 7 | Haptics on key down? | Optional `vibrate(10)` keep if already present |

---

## 13. Suggestions (product / polish)

1. **First-run one-liner** under controls: “Listen, then Start and key each letter.” Dismiss after first success (`localStorage`).
2. **Key pad** large region labeled “Hold to key” — critical on mobile in Reddit iframe.
3. **Don’t auto-start listen** on load (autoplay policies); require Play.
4. **Score copy:** primary **ms**; secondary “≈ X WPM” later using `src/shared/wpm.ts` and transmit duration — not required for MVP.
5. **Accessibility:** `aria-live` polite for “letter complete” / final time; respect `prefers-reduced-motion` on celebration.
6. **Anti-cheat later:** server can re-check duration bounds; ignore for this PR.
7. **Keep splash light** — no heavy assets; feed performance matters.

---

## 14. Doc maintenance

After shipping, update:

- `project/agent/STATUS.md` — splash loop state  
- `project/agent/DECISIONS.md` — default daily loop = this letter-by-letter after full listen (supersede pure whole-word single-buffer transmit if different)  
- `project/design/ux.md` — point main daily UX here  

---

*End of brief. Implement in `splash.tsx` first; prefer DOM for word + ·/− over new engines.*
