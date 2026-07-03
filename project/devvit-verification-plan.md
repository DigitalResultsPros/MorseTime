# Devvit Verification Plan
## MorseTime — Ensuring Accurate Runtime on Reddit

**Goal:** Verify the Morse code timing systems will run with sufficient precision and reliability inside Devvit's serverless iframe environment.

**Architecture:** React 19 + Canvas 2D + Web Audio API (no Phaser)
**Team Size:** 2+ developers
**Hackathon Deadline:** July 15, 2026 (13 days from report date)

---

## 1. Critical Constraints to Validate

| Constraint | Risk Level | Why It Matters |
|------------|-----------|----------------|
| **AudioContext autoplay policy** | High | Browsers block audio until user gesture; Devvit iframe may have additional restrictions |
| **Touch/pointer latency in iframe** | High | Reddit's iframe wrapper adds event dispatch overhead; mobile Safari/Chrome have known touch delays |
| **Web Audio scheduling precision** | Medium | `AudioContext.currentTime` is high-resolution, but iframe throttling may affect it |
| **Cold start / bundle size** | Medium | Devvit serverless functions have cold starts; large bundles delay first interaction |
| **Viewport fitting** | Medium | Inline posts have limited height; expanded mode is better but still constrained |
| **Server round-trip latency** | Low | Daily frequency and progress tracking depend on server responses; Redis is fast but network adds jitter |
| **Screen reader in iframe** | Medium | Devvit iframe may restrict `aria-live` updates; blind users need character announcements |
| **Keyboard-only play** | Medium | Users who cannot touch need keyboard fallback (space = dit, enter = dah) |
| **Colorblind accessibility** | Medium | Waveform uses green/red/yellow — must add pattern/shape differentiation |
| **Reduced motion preference** | Low | `prefers-reduced-motion` should disable particle bursts and waveform animations |

---

## 2. Verification Steps

### Phase 1: Environment Compatibility (Day 1–2)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 1.1 | Deploy minimal React + audio + touch demo to Devvit | App loads without console errors |
| 1.2 | Test `AudioContext` creation in Devvit iframe | `new AudioContext()` succeeds, `state` is not `closed` |
| 1.3 | Test first-tap audio unlock | Tone plays on first user tap (no autoplay error) |
| 1.4 | Test pointer events in iframe | `pointerdown`/`pointerup` fire with correct coordinates |
| 1.5 | Test `performance.now()` resolution | Returns sub-millisecond values (not throttled to 100Hz) |
| 1.6 | Test `navigator.vibrate` availability | Returns `true` or `undefined` (not an error) |
| 1.7 | Test keyboard events | `Space` → dit, `Enter` → dah; full lesson completable without touch |
| 1.8 | Test iframe expand/collapse | No AudioContext restart, no state loss, no zombie listeners |

**How to run:**
```bash
npm run dev  # Starts devvit playtest
# Open Devvit preview in browser
# Open DevTools console (right-click → Inspect)
# Run compatibility checks manually or via injected script
```

---

### Phase 2: Timing Precision Validation (Day 3–4)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 2.1 | Measure actual dit duration at 20 WPM | `AudioContext.currentTime` delta = 60ms ± 5ms |
| 2.2 | Measure dah duration at 20 WPM | 180ms ± 5ms |
| 2.3 | Measure inter-char gap | 180ms ± 5ms |
| 2.4 | Measure word gap | 420ms ± 5ms |
| 2.5 | Test Farnsworth timing (20/5 WPM) | Gaps stretched; total duration matches calculation |
| 2.6 | Test rapid tapping (10 dits/sec) | No missed elements, no audio glitches |
| 2.7 | Test background tab throttling | Audio continues if tab is backgrounded (or degrades gracefully) |

**How to run:**
```typescript
// Inject into splash.tsx or game.tsx for testing
const start = audioEngine.getCurrentTime();
audioEngine.keyDown(start);
audioEngine.keyUp(start + 0.06); // 60ms dit
const actualDuration = audioEngine.getCurrentTime() - start;
console.log(`Actual dit: ${actualDuration * 1000}ms`);
```

---

### Phase 3: Touch Input Accuracy (Day 5–6)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 3.1 | Test on iOS Safari (via remote debug) | `pointerdown`/`pointerup` fire within 16ms of physical touch |
| 3.2 | Test on Chrome Android | Same as above |
| 3.3 | Test `touch-action: none` CSS | No 300ms delay, no scroll/zoom interference |
| 3.4 | Test haptic feedback | `navigator.vibrate(10)` fires on supported devices |
| 3.5 | Test multi-touch (two fingers) | Only primary pointer counted; no double-registration |
| 3.6 | Test edge cases: very short tap (< 50ms) | Classified as `dit` (not dropped) |
| 3.7 | Test edge cases: very long hold (> 3s) | Clamped to `MAX_DAH_MS`; no freeze |
| 3.8 | Test keyboard input | Space = dit, Enter = dah; no accidental repeats |

**How to run:**
- Use Devvit playtest on physical devices
- Enable remote debugging (Safari → Develop → Simulator/Device)
- Log `performance.now()` deltas in `TouchInput.handlePointerUp`

---

### Phase 4: Canvas Waveform & UI (Day 7–8)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 4.1 | Measure bundle size (gzipped) | `< 500KB` for game.html, `< 100KB` for splash.html |
| 4.2 | Measure cold start time | Interactive (first tap responsive) within 2s of post load |
| 4.3 | Measure memory usage | `< 100MB` heap; no steady growth over 5 min play |
| 4.4 | Test low-end Android | Playable at 30fps on 3-year-old device |
| 4.5 | Test offline behavior | Graceful degradation (show error, retry button) |
| 4.6 | Test Canvas 2D waveform at 60fps | No dropped frames during tone playback |
| 4.7 | Test colorblind-safe patterns | Green/red/yellow supplemented with solid/dashed/dotted line styles |
| 4.8 | Test `prefers-reduced-motion` | Animations disabled when OS setting is on |

**How to run:**
```bash
npm run build
ls -lh dist/client/  # Check bundle sizes
# Use Chrome DevTools Performance tab during playtest
# Look for: long tasks (> 50ms), layout shifts, forced reflows
```

---

### Phase 5: Server & Daily Frequency (Day 9–10)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 5.1 | Deploy to staging subreddit | Post appears with inline splash |
| 5.2 | Test scheduled trigger (daily frequency) | Trigger fires at 00:00 UTC; Redis stores correct word |
| 5.3 | Test splash reads daily word | Server returns correct word; client plays it with Farnsworth timing |
| 5.4 | Test user progress persistence | Lesson completion updates Redis; survives page reload |
| 5.5 | Test error states | Network failure shows toast, not crash |
| 5.6 | Test rapid expand/collapse | No memory leak, no zombie AudioContext |

---

### Phase 6: Accessibility Deep-Dive (Day 11)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 6.1 | Screen reader: VoiceOver (iOS) | Character being played is announced via `aria-live` region |
| 6.2 | Screen reader: TalkBack (Android) | Same as above |
| 6.3 | Keyboard-only playthrough | Complete Lesson 1 without touching screen |
| 6.4 | High contrast mode | All text and waveform patterns visible in Windows High Contrast |
| 6.5 | Zoom 200% | Tap targets remain usable; waveform not clipped |
| 6.6 | Reduced motion | Particle bursts and waveform animations disabled |

---

## 3. Known Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **AudioContext suspended on load** | Require explicit "Tap to Begin" gesture before init |
| **iframe event throttling** | Use `requestAnimationFrame` for visual updates; audio uses `AudioContext.currentTime` (not rAF) |
| **Mobile touch delay** | `touch-action: none` on game canvas; `pointerdown` not `touchstart` |
| **Cold start jank** | Lazy-load heavy components; show loading spinner; preload audio in Boot scene |
| **Server latency in daily frequency** | Client caches last-known word; shows stale data with "syncing" indicator |
| **Screen reader gaps in iframe** | Provide visual fallback + keyboard fallback if `aria-live` is blocked |
| **Colorblind users miss waveform feedback** | Always show text label ("Correct", "Early", "Wrong element") alongside color |

---

## 4. Acceptance Criteria for Production

- [ ] All unit tests pass on CI
- [ ] Manual playtest on iOS Safari + Chrome Android passes all Phase 2–3 checks
- [ ] Bundle size < 500KB gzipped
- [ ] Cold start < 2s to interactive
- [ ] No console errors during 5-minute play session
- [ ] Audio timing within ±5ms of target at 20 WPM
- [ ] Touch classification accuracy ≥ 95% in manual testing
- [ ] App survives iframe expand/collapse cycle without reload
- [ ] Lesson 1 completable using keyboard only (no touch)
- [ ] Screen reader announces current character on supported devices
- [ ] Waveform patterns visible and distinguishable in colorblind simulation

---

## 5. Quick Diagnostic Script

Add this temporarily to `game.tsx` to run a self-test in Devvit:

```typescript
// TEMPORARY: Remove before production
const runSelfTest = async () => {
  const results: string[] = [];

  // AudioContext
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    results.push(`AudioContext: OK (state=${ctx.state})`);
    await ctx.close();
  } catch (e) {
    results.push(`AudioContext: FAIL - ${e}`);
  }

  // Timing precision
  const start = performance.now();
  await new Promise(r => setTimeout(r, 100));
  const elapsed = performance.now() - start;
  results.push(`setTimeout(100ms): actual=${elapsed.toFixed(1)}ms`);

  // Pointer events
  results.push(`Pointer Events: ${'PointerEvent' in window ? 'OK' : 'FAIL'}`);

  // Vibration
  results.push(`Vibrate: ${'navigator' in window && 'vibrate' in navigator ? 'OK' : 'N/A'}`);

  // Keyboard
  results.push(`Keyboard: ${'KeyboardEvent' in window ? 'OK' : 'FAIL'}`);

  // Reduced motion
  results.push(`Reduced Motion: ${window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'ON' : 'OFF'}`);

  console.table(results.map((r, i) => ({ test: i + 1, result: r })));
};

runSelfTest();
```

---

## 6. Next Steps

1. **Today:** Run Phase 1 compatibility checks in Devvit playtest
2. **Day 2:** Integrate `AudioEngine` and `TouchInput` into React splash component
3. **Day 3:** Build Canvas 2D `WaveformViz` component; run Phase 2 timing tests
4. **Day 4–5:** Run Phase 3 touch tests on iOS + Android; add keyboard handler
5. **Day 6–7:** Run Phase 4; implement `Progression` system (Koch Lessons 1–5)
6. **Day 8:** Build server `daily-frequency` endpoint + scheduled trigger
7. **Day 9–10:** Run Phase 5 integration tests on staging subreddit
8. **Day 11:** Run Phase 6 accessibility deep-dive
9. **Day 12:** Playtest with 5 external users; iterate on timing feel
10. **Day 13:** Production deploy; monitor logs; hotfix window

---

## 7. Out of Scope for Hackathon (Post-Launch Backlog)

- Choir mode (synchronous multiplayer) — requires WebSocket infrastructure
- Legacy wall (subreddit wiki auto-update)
- Mentor system
- Share card PNG generation
- Full 40-lesson curriculum → ship Lessons 1–10 for MVP
- Callsign practice, DXCC entity list, contest simulator
- Hardware keyer integration (Web Serial API)
