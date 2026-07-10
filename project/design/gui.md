# GUI & Audio: MorseTime

**Path:** `project/design/gui.md`  
**Status:** Dual-timeline + two-lane display is the design target (2026-07-10).  
**See also:** [ux.md](./ux.md) · [../agent/DECISIONS.md](../agent/DECISIONS.md)

**Code reality check (2026-07-10):** `WaveformViz` is a **single** element list + one `currentTime` with CRT/sine-arc polish. Two-lane block display is **planned**, not shipped. Cosmetic items marked ✅ below refer to current single-lane viz only.

---

## 0. Display P0 — Dual lane Morse (do this first)

### Problem
Current `WaveformViz` mixes target and user on one timeline with one playhead. Gameplay requires **independent clocks** and **readable** Morse (dit/dah/gaps), not only sine-arc juice.

### Target layout

```text
┌─ TARGET ─────────────────────────────────────────┐
│  ██ ██████   ██ ██████ ██   ██ ██ ██             │  block bars
│  ·    −      ·    −    ·    ·  ·  ·               │  optional text
└──────────────────────────────────────────────────┘
┌─ YOU ────────────────────────────────────────────┐
│  ██ ██████   ██ ██████ ██                         │  grows in transmit
└──────────────────────────────────────────────────┘
```

### Requirements

| Req | Detail |
|-----|--------|
| Lanes | **Target** top, **You** bottom (or two canvases stacked) |
| Clocks | `targetTimeMs` and `userTimeMs` independent; never force user marks onto target time |
| Phases | Listen: animate target playhead only. Transmit: animate user playhead only; target frozen/dim |
| Blocks | Prefer **rectangular keying bars**: dit = 1 unit wide, dah = 3 units, gaps explicit (ITU proportions) |
| Labels | Optional `DIT`/`DAH` or `·`/`−`; character grouping via larger gaps |
| Live hold | On key down in transmit, draw growing provisional bar + sidetone |
| Result colors | After score: user bars green/red; do not require mid-transmit absolute sync coloring |
| Hide answer | No plaintext word overlaid during listen/transmit |

### API direction (`WaveformViz`)

```ts
// Conceptual
setPhase('listen' | 'transmit' | 'result')
setTargetElements(elements)  // startTime/duration on target clock
clearUserElements() / addUserElement(...)
setTargetTime(ms)
setUserTime(ms)
// Prefer two internal arrays; draw two baselines
```

### Files

- `src/client/systems/WaveformViz.ts` — lanes, clocks, block renderer  
- `src/client/splash.tsx`, `src/client/game.tsx` — phase wiring  
- `src/client/systems/TouchInput.ts` — key down/up for live bar  

---

## 1. Visual improvements (existing / secondary)

### 1.1 Glow & Bloom ✅ Done (keep after lanes work)
- Target: subtle slate glow; user: green/red glow  
- Must not reduce dit/dah readability  

### 1.2 Waveform shape ✅ Done (reprioritize)
- Sine arcs are optional **skin**  
- **Default readable mode = block bars**; arcs can be a theme toggle later  

### 1.3 Particle bursts ✅ Done
- Fire on **result**, not as a substitute for correct timeline model  

### 1.4 CRT / Radio aesthetic ✅ Done
- Scanlines + vignette OK if contrast remains WCAG-friendly for bars  

### 1.5 Dynamic viewport ✅ Done — **split by phase**
- Listen: scroll with **target** playhead  
- Transmit: scroll with **user** playhead only  
- Do not scroll user input against target clock  

### 1.6 Amplitude modulation ✅ Done
- Keep subtle; must not obscure bar length (dit vs dah)  

---

## 2. Audio improvements

### 2.0 Sidetone on user key (P0 with dual timeline)
- `keyDown` on press, `keyUp` on release during **transmit**  
- Same 700 Hz (or user tone) as target; envelope without click  

### 2.1 Filtered radio tone (P1)
- Triangle + bandpass ~700 Hz, Q ~1.5 in `AudioEngine.init()`  

### 2.2 Background noise layer (P2)
- Quiet noise, duck under tone  

### 2.3 User audio feedback (superseded by 2.0)
- Prefer **live sidetone while held**, not only post-release chirp  

### 2.4 Spatial / stereo (P3)
- Optional pan/reverb — low priority  

### 2.5 Result cues (P1)
- Correct: short higher chime; incorrect: low buzz  
- Trigger from result phase only  

### 2.6 Envelope (P1)
- Raise attack/release from 2ms toward ~8–12ms to reduce click  

---

## 3. Making sound essential

### 3.1 Blind mode (P2)
- Hide both lanes; audio + keyer only  

### 3.2 Listen-first (P0 — by phase design)
- Transmit only after listen (or explicit skip later)  
- Do not accept keying during target playback  

### 3.3 Rhythm-before-visual (optional)
- Can hide target lane on first daily attempt; not required for dual timeline  

### 3.4 Haptic (P2)
- Vibrate on key down; optional duration-linked pulse on key up  

---

## 4. Implementation order (updated)

| Priority | Task | Status | Files |
|----------|------|--------|--------|
| **P0** | Phase machine listen → transmit → result | ⏳ Pending | `splash.tsx`, `game.tsx` |
| **P0** | Dual clocks + two-lane display | ⏳ Pending | `WaveformViz.ts`, splash/game |
| **P0** | Block-bar Morse rendering (readable) | ⏳ Pending | `WaveformViz.ts` |
| **P0** | Input only in transmit; sidetone | ⏳ Pending | `TouchInput.ts`, `AudioEngine.ts` |
| **P0** | WPM-relative dit/dah threshold | ⏳ Pending | `TouchInput.ts`, `morse.ts` |
| **P0** | Sequence scoring; hide daily word | ⏳ Pending | splash/game |
| P1 | Result audio cues + envelope | ⏳ Pending | `AudioEngine.ts` |
| P1 | Filtered tone | ⏳ Pending | `AudioEngine.ts` |
| P1 | Fix lesson encode path | ⏳ Pending | `game.tsx`, `morse.ts` |
| P2 | CRT/particles polish pass after lanes | ✅ Exists | `WaveformViz.ts` |
| P2 | Blind mode, haptics, noise bed | ⏳ Pending | various |
| P3 | Theme / paddle / frequency picker | ⏳ Pending | UI |

---

## 5. Design principles

1. **Two timelines, two lanes** — never fake “one clock” for user and target  
2. **Readable Morse first** — block proportions before decorative arcs  
3. **Sound first** — sidetone and target audio carry the skill; visuals reinforce  
4. **Phase honesty** — UI copy matches listen vs your turn  
5. **Radio aesthetic without sacrificing contrast**  

---

## 6. Input & customization (later)

### 6.1 WPM control
- User-adjustable char WPM for practice; daily may stay fixed for fairness  

### 6.2 Tone frequency
- 500 / 700 / 1000 Hz options  

### 6.3 Input method
- Canvas hold + keyboard; optional separate dit/dah paddles later  

### 6.4 Visual theme
- Colorblind-safe palette (not green/red only)  
- Optional arc skin vs block skin  

### 6.5 Volume
- Master gain for tone  

### 6.6 Lesson override
- Manual lesson select after progression identity is fixed per-user  

---

## 7. Anti-patterns

- Placing user elements with `performance.now() - targetStart`  
- Enabling input while `view === 'playing'` only  
- Single `elements[]` without `isTarget` **and** separate time bases  
- Showing the answer word as the main hero during the challenge  
- Fixed 150ms dit threshold at all WPMs  
