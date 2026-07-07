# GUI & Audio Improvement Plan: MorseTime

## 1. Visual Improvements

### 1.1 Glow & Bloom ✅ Completed
- Added `ctx.shadowBlur` and `ctx.shadowColor` to [`WaveformViz.draw()`](src/client/systems/WaveformViz.ts:116)
- Target bars: subtle slate glow (`shadowColor = '#94a3b8'`, `shadowBlur = 6`)
- User bars: bright green/red glow (`shadowColor = '#22c55e'` or `'#ef4444'`, `shadowBlur = 14`)

### 1.2 Waveform Shape ✅ Completed
- Replaced rectangular bars with sine-wave arcs for each dit/dah
- Uses `ctx.beginPath()`, `ctx.moveTo()`, `ctx.quadraticCurveTo()` to draw smooth signal shapes
- Maintains color coding (target = slate, correct = green, wrong = red)

### 1.3 Particle Bursts ✅ Completed
- On correct input: spawns 20 particles that fly outward from the playhead
- On incorrect input: spawns 10 red particles
- Implemented a particle system in `WaveformViz` with `particles: Particle[]`
- Wired into [`splash.tsx`](src/client/splash.tsx:173) and [`game.tsx`](src/client/game.tsx:157)

### 1.4 CRT / Radio Aesthetic ✅ Completed
- Added subtle scanlines: draws horizontal lines every 3px with `ctx.globalAlpha = 0.08`
- Added vignette: radial gradient from transparent center to dark edges
- Applied to [`WaveformViz.draw()`](src/client/systems/WaveformViz.ts:133)

### 1.5 Dynamic Viewport ✅ Completed
- Auto-scrolls so the playhead stays at ~30% from the left edge
- Uses smooth interpolation (`currentStartTime += (target - current) * 0.05`) instead of hard jumps
- Viewport transition uses `this.viewportMs += (this.targetViewportMs - this.viewportMs) * 0.08`
- Updated in `tick()` before `draw()`

### 1.6 Amplitude Modulation ✅ Completed
- Varies bar height based on a simulated "signal strength" (`Math.sin(this.currentTime * 0.001) * 0.15 + 0.85`)
- Makes the signal feel alive, like tuning a real radio

---

## 2. Audio Improvements

### 2.1 Filtered Radio Tone
- In [`AudioEngine.init()`](src/client/systems/AudioEngine.ts:24), change `osc.type = 'sine'` to `'triangle'`
- Add a BiquadFilterNode: `this.ctx.createBiquadFilter()` with type `'bandpass'`, frequency `700Hz`, Q `= 1.5`
- Connect: `osc -> filter -> gain -> destination`

### 2.2 Background Noise Layer
- Create a noise buffer (white noise) at -30dB
- Use a GainNode as a "ducker" that reduces noise volume when tone is active
- Schedule ducking via `gainNode.gain.linearRampToValueAtTime(0.01, toneStart)` and `linearRampToValueAtTime(0.3, toneEnd)`

### 2.3 User Audio Feedback
- After user releases key (`keyUp`), immediately play back the same tone they just sent
- Schedule a short oscillator burst at the same frequency with the same duration
- This creates a tight audio-visual loop

### 2.4 Spatial / Stereo Width
- Use a StereoPannerNode: `this.ctx.createStereoPanner()`
- Slightly pan based on `Math.sin(time * 0.0005)` for a subtle moving effect
- Add a ConvolverNode with a short impulse response for reverb tail (optional)

### 2.5 Audio Cues for Results
- Correct: short 440Hz sine chime (200ms) with quick decay
- Incorrect: low 150Hz buzz (300ms) with slower decay
- Trigger from the result-checking logic in `splash.tsx` and `game.tsx`

### 2.6 Envelope Refinement
- Increase `ATTACK_MS` and `RELEASE_MS` from `2` to `12`
- Eliminates clicking and makes the tone feel more natural

---

## 3. Making Sound Essential

### 3.1 Blind Mode Toggle
- Add a button in the UI: "Blind Mode" (ear icon)
- When active, hide the waveform canvas and show only a black screen with instructions
- User must rely entirely on audio to decode and tap back

### 3.2 Audio-First Tutorial
- On first load, show a modal: "Close your eyes. Listen to the rhythm. Tap it back."
- Auto-play the target sequence once before showing the waveform
- Reveal the waveform only after the user makes their first correct input

### 3.3 Rhythm Before Visual
- During `playTarget()`, start with waveform hidden (`waveformRef.current!.clear()` and canvas opacity 0)
- Reveal waveform after the first correct user element is detected
- Forces audio engagement before visual dependency

### 3.4 Haptic + Audio Sync
- Extend existing `navigator.vibrate(10)` to match tone duration
- On key down: `navigator.vibrate(0)` (immediate)
- On key up: `navigator.vibrate(durationMs)` (vibrate for the length of the tone)
- This ties the physical sensation directly to the audio

---

## 4. Implementation Order

| Priority | Task | Status | Files to Modify |
|----------|------|--------|-----------------|
| P0 | Glow & bloom on waveform | ✅ Done | `src/client/systems/WaveformViz.ts` |
| P0 | Filtered radio tone + noise layer | ⏳ Pending | `src/client/systems/AudioEngine.ts` |
| P1 | User audio feedback | ⏳ Pending | `src/client/systems/AudioEngine.ts`, `src/client/splash.tsx`, `src/client/game.tsx` |
| P1 | Envelope refinement | ⏳ Pending | `src/client/systems/AudioEngine.ts` |
| P1 | Audio cues for results | ⏳ Pending | `src/client/systems/AudioEngine.ts`, `src/client/splash.tsx`, `src/client/game.tsx` |
| P2 | Waveform shape (sine arcs) | ✅ Done | `src/client/systems/WaveformViz.ts` |
| P2 | Particle bursts | ✅ Done | `src/client/systems/WaveformViz.ts` |
| P2 | Dynamic viewport | ✅ Done | `src/client/systems/WaveformViz.ts` |
| P3 | CRT aesthetic | ✅ Done | `src/client/systems/WaveformViz.ts` |
| P3 | Blind mode toggle | ⏳ Pending | `src/client/splash.tsx`, `src/client/game.tsx` |
| P3 | Audio-first tutorial | ⏳ Pending | `src/client/splash.tsx` |
| P3 | Haptic sync | ⏳ Pending | `src/client/systems/TouchInput.ts` |

---

## 5. Design Principles

1. **Sound first, visuals second**: The audio should be the primary feedback channel. Visuals should reinforce, not replace, the audio experience.
2. **Radio authenticity**: Every visual and audio choice should evoke the feeling of tuning into a real radio transmission.
3. **Progressive disclosure**: Start simple (audio only), then layer in visuals as the user engages.
4. **Tactile feedback**: On mobile, vibration should sync with audio to create a unified sensory experience.

---

## 6. Input & Customization Possibilities

### 6.1 WPM Speed Control
- **Current state**: WPM is not user-adjustable. Lessons run at hardcoded 20 WPM ([`game.tsx:190`](src/client/game.tsx:190)). Practice/Daily modes use the server-provided `charWpm` ([`splash.tsx:85`](src/client/splash.tsx:85)).
- **Proposed**: Add a `charWpm` state with a slider (5–40 WPM) or +/- buttons in the UI.
- **Implementation**: Pass the user-selected WPM to `playSequence()` instead of hardcoded values. For daily/practice modes, either override the server WPM or apply a user multiplier.
- **Persistence**: Store preference in `localStorage` or Reddit user prefs via Redis (`progress:${postId}:${username}`).

### 6.2 Tone Frequency
- **Current state**: Fixed at 700 Hz ([`AudioEngine.ts:15`](src/client/systems/AudioEngine.ts:15)).
- **Proposed**: Allow users to select tone frequency (e.g., 500 Hz, 700 Hz, 1000 Hz) to match their hearing or equipment.

### 6.3 Input Method
- **Current state**: Touch canvas + keyboard (Space/Enter) in [`TouchInput.ts`](src/client/systems/TouchInput.ts).
- **Proposed**:
  - Add a "paddle" mode (separate dit/dah buttons) for users without keyboards
  - Support mouse click-and-hold for desktop users who prefer holding for dah

### 6.4 Visual Theme
- **Current state**: Fixed dark slate theme.
- **Proposed**: Add light/dark theme toggle, or color-blind friendly palettes (e.g., blue/orange instead of green/red).

### 6.5 Audio Feedback Volume
- **Current state**: Fixed gain of `1.0`.
- **Proposed**: Add a volume slider, especially useful for users with hearing impairments or in noisy environments.

### 6.6 Lesson Progression Override
- **Current state**: Lessons advance automatically based on character mastery ([`progress.ts:76`](src/server/routes/progress.ts:76)).
- **Proposed**: Allow users to manually select a lesson or repeat a specific character set.
