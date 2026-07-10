# UX: MorseTime on Reddit

**Path:** `project/design/ux.md`  
**Status:** Dual-timeline gameplay locked (2026-07-10).  
**See also:** [../agent/DECISIONS.md](../agent/DECISIONS.md) · [gui.md](./gui.md) · [../README.md](../README.md)

**Code reality check (2026-07-10):** Splash/game still use a **shared playhead** and often accept input only during target playback. This doc is the **target** behavior, not a claim that code already matches.

---

## 1. Current flow vs. target flow

| | Current (broken) | Target (ship) |
|--|------------------|---------------|
| Model | Tap **along with** target playhead (shared clock) | **Listen**, then **transmit** on a **new timeline** |
| Input | Only while target audio plays | Disabled during listen; enabled in transmit |
| Display | One lane; user marks on target time axis | **Two lanes**: Target / You |
| Score | End when element counts match | Sequence match after transmit ends |
| Word | Plaintext shown on splash | **Hidden until result** (default) |

---

## 2. Canonical game flow (daily / splash)

### Phase: Idle
- Show “Today’s Frequency” framing (no plaintext answer)
- CTA: **Play target** (first tap also unlocks AudioContext)
- Optional: open full game

### Phase: Listen
- Play full target word once at configured WPM (Farnsworth gaps OK)
- **Target lane** animates with playhead; **user lane empty**
- **Input disabled**
- After audio ends → auto-enter **Your turn** (or require a **GO** button — prefer explicit GO on mobile)
- Allow **Replay** target (re-enter listen; wipe incomplete transmit if any)

### Phase: Transmit
- **User timeline starts at t = 0** (on GO or first key — pick one and keep it)
- Target lane **frozen** (dim is fine); optional mini “pattern” without revealing letters
- User keys dit/dah freely (hold duration); **sidetone** on key down/up
- **User lane** grows on its own clock — **never** share target `currentTime`
- End when: **Submit**, and/or silence timeout after enough activity, and/or explicit “I’m done”
- Do **not** require lockstep with the ghost

### Phase: Result
- Compare **element sequence** (P0); optional timing quality (P1)
- Reveal word + what user sent + correct/incorrect + rough WPM
- Actions: Try again (back to idle/listen), Open full game, share later

```text
idle → listen → transmit → result
         ↑         │
         └─ replay ┘
```

---

## 3. Modes

| Mode | Default behavior |
|------|------------------|
| **Daily (splash)** | Whole-word listen → transmit (dual timeline) |
| **Practice / full game** | Same loop; may add WPM control later |
| **Lesson** | Same keying model; encode chars correctly; letter-by-letter **optional later** |
| **Rhythm-sync hard mode** | Out of scope for default; only if explicitly added later |
| **Letter-by-letter** | Backlog for learning path (see §8) — not blocking dual-timeline ship |

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
