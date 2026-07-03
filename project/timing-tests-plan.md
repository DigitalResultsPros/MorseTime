# Timing Concepts Test Plan
## CW-TUTOR — Morse Code Audio/Touch Learning Game

**Purpose:** Validate the core timing mechanics that make CW-TUTOR functional and pedagogically correct.

---

## 1. Timing Concepts Under Test

| Concept | Source | Critical? |
|---------|--------|-----------|
| **ITU-R M.1677-1 Morse Timing** | `MorseCodec.ts` | Yes |
| **Farnsworth Timing Calculation** | `MorseCodec.ts` | Yes |
| **Touch Input Classification (dit/dah)** | `TouchInput.ts` | Yes |
| **Audio Scheduling Precision** | `AudioEngine.ts` | Yes |
| **WPM Calculation & Conversion** | `MorseCodec.ts` | Yes |
| **Choir Sync Score** | `ChoirSync.ts` | Yes |
| **Latency Compensation** | `ChoirSync.ts` | Medium |

---

## 2. Test Structure

```
tests/
├── unit/
│   ├── morse-codec.test.ts       # Timing math, encoding, Farnsworth
│   ├── touch-input.test.ts       # Dit/dah threshold logic
│   ├── audio-engine.test.ts      # Scheduling, gain ramps
│   └── wpm-calculator.test.ts    # WPM ↔ ms conversions
├── integration/
│   ├── lesson-flow.test.ts       # End-to-end lesson timing
│   └── choir-sync.test.ts        # Sync score, latency math
└── fixtures/
    └── timing-fixtures.ts        # Shared constants, helpers
```

**Framework:** Vitest (already in `devDependencies`)

---

## 3. Unit Test Cases

### 3.1 `morse-codec.test.ts`

| ID | Test | Expected |
|----|------|----------|
| MC-01 | `getDitMs(20 wpm)` | `60ms` (1200/20) |
| MC-02 | `getDahMs(20 wpm)` | `180ms` (3 × dit) |
| MC-03 | `getIntraCharGap(20 wpm)` | `60ms` |
| MC-04 | `getInterCharGap(20 wpm)` | `180ms` |
| MC-05 | `getWordGap(20 wpm)` | `420ms` (7 × dit) |
| MC-06 | `encode('K')` | `-.-` (dah-dit-dah) |
| MC-07 | `encode('SOS')` | `...---...` |
| MC-08 | `calculateFarnsworthTiming(20, 5)` | char speed = 20 WPM, gaps stretched to 5 WPM effective |
| MC-09 | `calculateFarnsworthTiming(20, 20)` | identical to standard timing (no stretch) |
| MC-10 | `decode('...')` | `'S'` |
| MC-11 | Timing at 5 WPM | `240ms` per dit unit |
| MC-12 | Timing at 40 WPM | `30ms` per dit unit |

### 3.2 `touch-input.test.ts`

| ID | Test | Expected |
|----|------|----------|
| TI-01 | Pointer down 80ms → up | classified as `dit` (< 150ms threshold) |
| TI-02 | Pointer down 200ms → up | classified as `dah` (≥ 150ms) |
| TI-03 | Pointer down 2500ms → up | clamped to `MAX_DAH_MS` (2000ms) |
| TI-04 | Rapid alternating dits/dahs | each element emitted with correct duration |
| TI-05 | Haptic on pointer down | `vibrate(10)` called |

### 3.3 `audio-engine.test.ts`

| ID | Test | Expected |
|----|------|----------|
| AE-01 | `keyDown()` ramps gain to 1 | gain.value ≈ 1.0 within 2ms |
| AE-02 | `keyUp()` ramps gain to 0 | gain.value ≈ 0.0 within 2ms |
| AE-03 | `playSequence()` respects Farnsworth gaps | inter-element gaps match calculated timing |
| AE-04 | `playSequence()` at 20/5 WPM | total duration matches expected Farnsworth duration |
| AE-05 | AudioContext starts suspended | `init()` resumes context on first user gesture |
| AE-06 | Oscillator frequency | 700 Hz ± tolerance |

### 3.4 `wpm-calculator.test.ts`

| ID | Test | Expected |
|----|------|----------|
| WP-01 | `ditMsFromWpm(20)` | `60ms` |
| WP-02 | `wpmFromDitMs(60)` | `20` |
| WP-03 | `effectiveWpm(charWpm, totalDuration, charCount)` | correct effective speed |
| WP-04 | Edge case: 1 WPM | `1200ms` per dit |
| WP-05 | Edge case: 100 WPM | `12ms` per dit |

---

## 4. Integration Test Cases

### 4.1 `lesson-flow.test.ts`

| ID | Test | Expected |
|----|------|----------|
| LF-01 | Lesson 1 (K, M) plays sequence | 2 chars, correct Farnsworth timing |
| LF-02 | User inputs correct sequence | score = 100%, latency recorded |
| LF-03 | User inputs wrong char | score < 100%, confusionMap updated |
| LF-04 | Mastery threshold (95% over 50 trials) | `mastered = true` |
| LF-05 | Lesson auto-advance | next lesson unlocked after mastery |

### 4.2 `choir-sync.test.ts`

| ID | Test | Expected |
|----|------|----------|
| CS-01 | Perfect sync (all latencies = 0) | `syncScore = 1.0` |
| CS-02 | Small variance (stdDev = 10ms, mean = 100ms) | `syncScore = 0.9` |
| CS-03 | Large variance (stdDev = 50ms, mean = 100ms) | `syncScore = 0.5` |
| CS-04 | Server time offset calculation | `serverTime = localTime + offset` within ±5ms |
| CS-05 | Countdown to choir start | triggers at correct server time |

---

## 5. Fixtures & Helpers (`timing-fixtures.ts`)

```typescript
// Shared constants for all timing tests
export const STANDARD_WPM = 20;
export const FARNSWORTH_CHAR_WPM = 20;
export const FARNSWORTH_EFFECTIVE_WPM = 5;
export const DIT_THRESHOLD_MS = 150;
export const DAH_MIN_MS = 150;
export const MAX_DAH_MS = 2000;
export const TONE_FREQUENCY_HZ = 700;
export const ATTACK_MS = 2;
export const RELEASE_MS = 2;

// Helper: tolerance for floating-point timing assertions
export const TIMING_TOLERANCE_MS = 2;

// Helper: mock AudioContext for audio-engine tests
export function createMockAudioContext() { ... }
```

---

## 6. Mock Strategy

| Dependency | Mock Approach |
|------------|---------------|
| `AudioContext` | Stub with `createOscillator`, `createGain`, `currentTime` control |
| `performance.now()` | `vi.useFakeTimers()` or mock return value |
| `navigator.vibrate` | `vi.fn()` |
| `redis` | In-memory mock or `vi.mock()` |
| `reddit` | `vi.mock()` with canned responses |

---

## 7. Execution Order

1. **Phase 1 (Blocking):** `morse-codec.test.ts` — all timing math must pass before any other tests
2. **Phase 2:** `touch-input.test.ts` + `audio-engine.test.ts` — input/output layer
3. **Phase 3:** `wpm-calculator.test.ts` — cross-cutting utility
4. **Phase 4:** `lesson-flow.test.ts` — integration
5. **Phase 5:** `choir-sync.test.ts` — integration (depends on server time mock)

---

## 8. Acceptance Criteria

- [ ] All unit tests pass (`vitest run tests/unit`)
- [ ] All integration tests pass (`vitest run tests/integration`)
- [ ] No timing assertion uses a tolerance > 2ms for audio scheduling
- [ ] Farnsworth timing validated against known reference values
- [ ] Touch classification accuracy ≥ 99% in simulated input tests
- [ ] Choir sync score formula produces correct results for edge cases (0 variance, 0 mean)

---

## 9. Next Steps

1. Scaffold `tests/` directory with Vitest config
2. Implement `MorseCodec.ts` (or extract from existing codebase)
3. Write `morse-codec.test.ts` first (foundational)
4. Implement `TouchInput.ts` classification logic
5. Write `touch-input.test.ts`
6. Implement `AudioEngine.ts` scheduling
7. Write `audio-engine.test.ts`
8. Build remaining tests in Phase order
