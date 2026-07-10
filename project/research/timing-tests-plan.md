# Timing concepts test plan

**Path:** `project/research/timing-tests-plan.md`  
**Verified against repo:** 2026-07-10  

> **Reference.** Unit tests for core timing **exist and pass**. Integration/choir sections below are backlog or obsolete.  
> Product name is **MorseTime** (not CW-TUTOR). Choir is a **stretch** goal ([../agent/DECISIONS.md](../agent/DECISIONS.md)); no choir code/tests yet.

**Purpose:** Validate Morse timing math, dit/dah classification, and audio engine behavior.

---

## 1. Concepts under test

| Concept | Actual source path | Critical? | Tests today |
|---------|-------------------|-----------|-------------|
| ITU-R-style unit timing | `src/shared/morse.ts` | Yes | `tests/unit/morse-codec.test.ts` |
| Farnsworth calculation | `src/shared/morse.ts` | Yes | same |
| Dit/dah classification | `src/client/systems/TouchInput.ts` | Yes | `tests/unit/touch-input.test.ts` |
| Audio scheduling / gain | `src/client/systems/AudioEngine.ts` | Yes | `tests/unit/audio-engine.test.ts` |
| WPM helpers | `src/shared/wpm.ts` | Yes | `tests/unit/wpm-calculator.test.ts` |
| Choir sync | *(not in repo)* | Stretch only | none |
| Dual-timeline gameplay | splash/game (planned) | Yes for product | not yet |

**Note:** Older drafts referred to `MorseCodec.ts` / `ChoirSync.ts` — those filenames **do not exist**. Use the paths above.

---

## 2. Current test tree (actual)

```text
tests/
├── unit/
│   ├── morse-codec.test.ts
│   ├── touch-input.test.ts
│   ├── audio-engine.test.ts
│   └── wpm-calculator.test.ts
└── fixtures/
    └── timing-fixtures.ts
```

- **Framework:** Vitest  
- **Last local run (2026-07-10):** **43 tests passed**, 4 files  
- **No** `tests/integration/` directory yet  

---

## 3. Unit coverage notes (aligned with code)

### Morse (`morse.ts` / `morse-codec.test.ts`)

- Dit unit ≈ `1200 / wpm` ms (e.g. 20 WPM → 60 ms)  
- Dah = 3× dit; intra-char gap = 1×; inter-char = 3×; word = 7×  
- Encode/decode maps exist for letters/digits used by curriculum  
- Farnsworth helper stretches gaps when effective WPM &lt; char WPM  

### Touch (`TouchInput.ts`)

- **Current threshold:** fixed `DIT_THRESHOLD_MS = 150`, `MAX_DAH_MS = 2000`  
- Space **or** Enter both key the same way; duration decides dit/dah  
- **Target (design):** WPM-relative threshold — update tests when implemented  

### Audio (`AudioEngine.ts`)

- Continuous oscillator + gain ramps; frequency **700 Hz**  
- Attack/release currently **2 ms**  
- No `playSequence()` method on the engine class — sequencing is done in UI by scheduling `keyDown`/`keyUp`  

### WPM (`wpm.ts`)

- See `tests/unit/wpm-calculator.test.ts` for exact API surface  

---

## 4. Backlog tests (not present)

| Area | Status |
|------|--------|
| Lesson flow integration | Not implemented |
| Choir sync | Stretch only — after dual-timeline + daily board |
| Dual-timeline phase machine | Add when UX ships |
| Splash/game E2E in Devvit iframe | Manual / playtest checklist in [devvit-verification-plan.md](./devvit-verification-plan.md) |

---

## 5. Acceptance (updated)

- [x] Unit tests pass (`npm run test`) — 43 as of 2026-07-10  
- [ ] Integration suite (optional)  
- [ ] Dual-timeline / sequence scoring tests when gameplay is rewritten  
- [x] No dependency on Phaser or ChoirSync modules  

---

## 6. Commands

```bash
npm run test
npm run test -- tests/unit/morse-codec.test.ts
```
