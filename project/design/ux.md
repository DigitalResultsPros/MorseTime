# UX: MorseTime on Reddit

**Path:** `project/design/ux.md`  
**Status:** Dual-timeline gameplay locked (2026-07-10).  
**See also:** [../agent/DECISIONS.md](../agent/DECISIONS.md) · [gui.md](./gui.md) · [../README.md](../README.md)

**Code reality check (2026-07-10):** **Splash** implements the loop in [new.md](./new.md). Expanded `game.tsx` may still use older shared-playhead behavior until updated.

---

## 1. Current flow vs. target flow

| | Old (broken) | Splash target (shipped intent — new.md) |
|--|------------------|---------------|
| Model | Tap **along with** target playhead | **Listen**, then **Start**, letter-by-letter on a **new timeline** |
| Input | Only while target audio plays | Off until Start; on in transmit only |
| Display | One waveform lane | Top: word reveal; bottom: subtle live ·/− |
| Score | Element count match | All letters correct → **elapsed ms** |
| Word | Shown early / messy | Builds on listen; **full word visible** during transmit |

---

## 2. Canonical game flow (daily / splash)

**Spec:** [new.md](./new.md)

### Phase: Idle
- Daily word loaded; no autoplay
- CTA: **Play transmission** (unlocks AudioContext)

### Phase: Listen
- Full-word Morse audio; letters reveal one-by-one (at char start)
- **Input disabled**
- Ends → **ready** (full word shown)

### Phase: Ready
- Full word visible; **Start transmission** required
- Replay allowed

### Phase: Transmit
- Timer starts on **Start** (`performance.now()` → ms)
- Letter-by-letter keying; live ·/− under word; sidetone
- Wrong letter clears **current** buffer only
- Replay optional (timer keeps running)

### Phase: Result
- Stop timer; show **ms** (+ optional seconds); celebration
- Try again → ready (clear progress, timer zero)

```text
idle → listen → ready → transmit → result
         ↑                │
         └──── replay ────┘
```

---

## 3. Modes

| Mode | Default behavior |
|------|------------------|
| **Daily (splash)** | Listen → Start → letter-by-letter → ms ([new.md](./new.md)) |
| **Practice / full game** | Align to dual timeline when rewritten |
| **Lesson** | May reuse letter matcher |
| **Rhythm-sync hard mode** | Out of scope for default |
| **Blind mode** | Optional later: hide word during transmit |

---

## 4. Input rules

1. **Key down** → sidetone on; start measuring duration; live “hold bar” on user lane  
2. **Key up** → sidetone off; classify **dit/dah** with **WPM-relative** threshold (not fixed 150ms)  
3. Space / Enter / pointer hold all map to the same keyer  
4. Inter-character silence (≈2–3+ units) may group elements for decode (P1)  
5. No input accepted outside `transmit`

---

## 5. Scoring (P0 → P1) and leaderboard

| Priority | Metric |
|----------|--------|
| P0 | Correct dit/dah sequence (or per-character decode equals target) |
| P1 | **Transmit duration** on the user timeline → **effective WPM** (see `src/shared/wpm.ts`) |
| P1 | Daily **leaderboard**: same word for all; correct first; rank by WPM/time (types exist; route not built) |
| P1 | Grade S/A/B/C from speed + accuracy (optional UI) |
| Later | Sync score vs target absolute times (rhythm hard mode only) |
| Stretch | **Choir** sync score (separate from daily WPM board) |

**Languages:** UI locale toggle (stretch) does **not** change the daily Morse target or board. Per-locale words / non-Latin Morse alphabets are **out** — they make one global speed board unfair.

**Not implemented:** splash “WPM” today is a rough local estimate, not transmit-duration WPM.

---

## 6. Display (UX requirements)

Owned in detail by [gui.md](./gui.md). UX musts:

- Two lanes always labeled (Target / You)
- Dit/dah and gaps readable (prefer **block** proportions)
- Phase-specific playhead (listen → target; transmit → user)
- No answer word during listen/transmit by default
- Optional `·−` text under blocks for a11y / learners

---

## 7. Audio (UX requirements)

1. Target playback only in **listen**  
2. User **sidetone** only in **transmit** (and live with hold)  
3. Result chime / buzz after grade  
4. Optional countdown beeps before listen (nice-to-have, not blocking)

---

## 8. Backlog: letter-by-letter path (lessons)

Not the default daily loop. After dual timeline ships:

- After full listen (or per-char listen), user enters one character at a time  
- Progress indicator: letter N of M  
- Immediate per-letter feedback  
- Useful for Koch lessons and beginners  

---

## 9. Reddit-specific enhancements (still desired)

- Daily same word for everyone; streak; personal bests in Redis  
- Leaderboard + share-to-comment  
- Badges / challenges (post dual-timeline + identity fix)

Progress must be **per user**, not only `postId`.

---

## 10. Implementation notes

```ts
type GamePhase = 'idle' | 'listen' | 'transmit' | 'result';
```

- Refactor splash/game off shared playhead for user input  
- `WaveformViz`: separate target/user tracks and clocks  
- `TouchInput`: `onKeyDown` / `onKeyUp` + WPM-based threshold  
- Fix lesson path: always `encode` characters via `src/shared/morse.ts`

---

## 11. Open questions

1. Transmit start: **GO button** vs first-key starts clock?  
2. End transmit: Submit only, silence timeout, or both?  
3. Beginner toggle: show word during practice only?  
4. How many free replays of target before transmit?
