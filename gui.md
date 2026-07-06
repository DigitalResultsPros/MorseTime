# GUI & Audio Improvement Plan: MorseTime

## 1. Visual Improvements

### 1.1 Glow & Bloom
- Add `ctx.shadowBlur` and `ctx.shadowColor` to [`WaveformViz.draw()`](src/client/systems/WaveformViz.ts:85)
- Target bars: subtle slate glow (`shadowColor = '#94a3b8'`, `shadowBlur = 8`)
- User bars: bright green/red glow (`shadowColor = '#22c55e'` or `'#ef4444'`, `shadowBlur = 12`)

### 1.2 Waveform Shape
- Replace rectangular bars with sine-wave arcs for each dit/dah
- Use `ctx.beginPath()`, `ctx.moveTo()`, `ctx.quadraticCurveTo()` to draw smooth signal shapes
- Maintain color coding (target = slate, correct = green, wrong = red)

### 1.3 Particle Bursts
- On correct input: spawn 8-12 small particles that fly outward from the user's bar
- On incorrect input: flash the canvas background red briefly (e.g., 100ms overlay)
- Implement a simple particle system in `WaveformViz` with `particles: Particle[]`

### 1.4 CRT / Radio Aesthetic
- Add subtle scanlines: draw horizontal lines every 2px with `ctx.globalAlpha = 0.03`
- Add vignette: radial gradient from transparent center to dark edges
- Optional: add a very subtle static noise overlay using a pre-generated noise canvas

### 1.5 Dynamic Viewport
- Auto-scroll so the playhead stays at ~30% from the left edge
- Use smooth interpolation (`currentViewportStart += (target - current) * 0.1`) instead of hard jumps
- Update in `tick()` before `draw()`

### 1.6 Amplitude Modulation
- Vary bar height based on a simulated "signal strength" (use `Math.sin(time * 0.001) * 0.2 + 0.8`)
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

| Priority | Task | Files to Modify |
|----------|------|-----------------|
| P0 | Glow & bloom on waveform | `src/client/systems/WaveformViz.ts` |
| P0 | Filtered radio tone + noise layer | `src/client/systems/AudioEngine.ts` |
| P1 | User audio feedback | `src/client/systems/AudioEngine.ts`, `src/client/splash.tsx`, `src/client/game.tsx` |
| P1 | Envelope refinement | `src/client/systems/AudioEngine.ts` |
| P1 | Audio cues for results | `src/client/systems/AudioEngine.ts`, `src/client/splash.tsx`, `src/client/game.tsx` |
| P2 | Waveform shape (sine arcs) | `src/client/systems/WaveformViz.ts` |
| P2 | Particle bursts | `src/client/systems/WaveformViz.ts` |
| P2 | Dynamic viewport | `src/client/systems/WaveformViz.ts` |
| P3 | CRT aesthetic | `src/client/systems/WaveformViz.ts` |
| P3 | Blind mode toggle | `src/client/splash.tsx`, `src/client/game.tsx` |
| P3 | Audio-first tutorial | `src/client/splash.tsx` |
| P3 | Haptic sync | `src/client/systems/TouchInput.ts` |

---

## 5. Design Principles

1. **Sound first, visuals second**: The audio should be the primary feedback channel. Visuals should reinforce, not replace, the audio experience.
2. **Radio authenticity**: Every visual and audio choice should evoke the feeling of tuning into a real radio transmission.
3. **Progressive disclosure**: Start simple (audio only), then layer in visuals as the user engages.
4. **Tactile feedback**: On mobile, vibration should sync with audio to create a unified sensory experience.
