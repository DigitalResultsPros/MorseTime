# Reddit "Games with a Hook" Hackathon — Project Report
## Morse Code Audio/Touch Learning Game

**Project Codename:** `CW-TUTOR` (Continuous Wave Tutor)
**Hackathon:** Reddit's Games with a Hook (June 17 – July 15, 2026)
**Prize Pool:** $40,000 + $5,000 Phaser Special Award
**Platform:** Devvit Web (Reddit Developer Platform)
**Engine:** Phaser 4 + TypeScript + Web Audio API
**Target:** Grand Prize ($15,000) + Phaser Special Award ($5,000)

---

## 1. Hackathon Context & Winning Criteria

### 1.1 Official Challenge
> "Create a new Reddit game for the users of Reddit using Devvit, our Developer Platform. Use Devvit Web to build with web technologies (React, Phaser, three.js) or your favorite game engine. The best app to use Phaser will be eligible for a special award."

### 1.2 What Reddit Explicitly Wants
| Criterion | Description |
|-----------|-------------|
| **Daily Return Hook** | "Apps that give redditors a reason to return day after day. Progression, daily challenges, fresh content, meaningful choices, social dynamics, anticipation of what happens next." |
| **Collective Joy** | "Inspires collective joy" — shared experiences, synchronous moments, community participation |
| **Polish / Not "AI Slop"** | "Fit the UI in the viewport, give your app a unique identity, think of your human players" |
| **Not Generic Clones** | No Wordle/Flappy Bird/2048 clones |
| **Phaser Excellence** | Special $5k award for best Phaser usage |

### 1.3 Reference Games (Reddit's Official Examples)
| Subreddit | Core Loop | Key Insight |
|-----------|-----------|-------------|
| r/honk | Audio-first rhythm/panic | Honk meter, cooldown, one-thumb, combo scoring |
| r/BunnyTrials | Daily "Would You Rather" trials | Community voting, confiscation, streaks, cross-promotion |
| r/dailyguess | Daily guessing puzzle | Single daily puzzle, streak, social sharing |
| r/colorpuzzlegame | Color puzzle | Visual, daily, progression |
| r/alignmentchartFills | Alignment chart filling | Creative expression, sharing |
| r/hotandcold | Hot/cold guessing | Simple mechanic, daily |
| r/bridgedit | Collaborative editing | Social, creative |
| r/battlebirds | Bird battles | Collection, progression |
| r/kraw | Drawing game | Creative, social |
| r/LETTERSET | Word game | Daily, linguistic |

**Gap Analysis:** **Zero audio-first games. Zero skill-learning games. Zero eyes-free playable games.**

---

## 2. Game Concept: CW-TUTOR

### 2.1 Elevator Pitch
> **"Learn Morse code by touch and sound. One daily transmission. Community choir mode. Your legacy etched in the subreddit."**

### 2.2 Core Value Proposition
| Dimension | Delivery |
|-----------|----------|
| **Real Skill** | Learn actual Morse code (Koch/Farnsworth method) — transferable, lifelong |
| **Daily Habit** | 2–3 minutes/day: "Today's Frequency" transmission |
| **Collective Joy** | "Choir Mode" — synchronous tapping with community |
| **Unique Identity** | Audio-first, eyes-free, haptic — nothing like it on Reddit |
| **Phaser Showcase** | Web Audio API, precise timing, touch handling, waveform viz, mobile scale |

### 2.3 Target Audience
- **Primary:** Curious redditors (18–40), tech/hobbyist communities, r/amateurradio, r/learnhacking
- **Secondary:** Accessibility users (eyes-free), gamers wanting micro-sessions, language learners
- **Viral Vector:** "Tap today's frequency" in-feed → instant play → share result → challenge friends

---

## 3. Core Gameplay Loop

### 3.1 Splash Entry (Interactive Post — `splash.html`)
```
┌────────────────────────────────────────────────────────────┐
│  📻  TODAY'S FREQUENCY:  "QUIET"                           │
│  ────────────────────────────────────────────────────────  │
│  [●]  Tap to hear target    →   [Hold for dah, tap dit]    │
│                                                              │
│  ████░░░░░░░░░░  Your input    ████████░░  Target           │
│  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  Waveform overlay                          │
│                                                              │
│  [Transmit]  Streak: 7  |  WPM: 18  |  Rank: #247          │
└────────────────────────────────────────────────────────────┘
```
- **Inline in Reddit feed** — no navigation away
- **One transmission per day** — creates scarcity + anticipation
- **Instant feedback** — visual + audio + haptic
- **Social proof** — streak, WPM, community rank visible

### 3.2 Full Game (`game.html`) — Four Modes

| Mode | Purpose | Session Length |
|------|---------|----------------|
| **Lesson** | Koch method: add 1 character/session | 2–3 min |
| **Practice** | Farnsworth timing drills | 3–5 min |
| **Daily Frequency** | Expanded splash with history | 1–2 min |
| **Choir Mode** | Synchronous community tapping | 3–5 min (scheduled) |

### 3.3 Progression System (Koch Method + Farnsworth Timing)

```
Lesson 1:  K  M          →  2 chars at 20 WPM char speed, 5 WPM effective
Lesson 2:  K  M  R       →  3 chars
Lesson 3:  K  M  R  S    →  4 chars
...
Lesson 40: Full alphabet + digits + prosigns + Q-codes + callsigns
```

**Farnsworth Timing:** Characters sent at target speed (e.g., 20 WPM), but inter-character/inter-word gaps stretched to keep *effective* speed lower (e.g., 5 WPM). Prevents "counting dits/dahs" — forces rhythm recognition.

### 3.4 Mastery Tracking (Per Character)
```typescript
interface CharMastery {
  char: string;
  correct: number;
  total: number;
  avgLatencyMs: number;      // Time from tone end to user input
  confusionMap: Map<string, number>;  // What it's confused with
  lastPracticed: Date;
  mastered: boolean;         // >95% over 50 trials
}
```

---

## 4. Technical Architecture

### 4.1 Devvit Web Project Structure
```
cw-tutor/
├── devvit.json                 # Devvit config: entrypoints, routes, triggers
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── client/                 # Phaser game (bundled to dist/client)
│   │   ├── game.ts             # Phaser config + boot
│   │   ├── game.html           # Full game entrypoint
│   │   ├── splash.html         # Interactive post entrypoint
│   │   ├── scenes/
│   │   │   ├── Boot.ts         # AudioContext unlock, asset loading
│   │   │   ├── Preloader.ts    # Audio buffers, fonts, sprites
│   │   │   ├── SplashScene.ts  # Daily frequency UI
│   │   │   ├── MenuScene.ts    # Mode selection
│   │   │   ├── LessonScene.ts  # Koch lesson flow
│   │   │   ├── PracticeScene.ts# Farnsworth drills
│   │   │   ├── ChoirScene.ts   # Sync multiplayer
│   │   │   └── GameOver.ts     # Results + share
│   │   ├── systems/
│   │   │   ├── AudioEngine.ts  # Web Audio oscillator, keying, scheduling
│   │   │   ├── TouchInput.ts   # Dit/dah detection, haptic feedback
│   │   │   ├── WaveformViz.ts  # Real-time canvas/WebGL waveform
│   │   │   ├── MorseCodec.ts   # Encode/decode, timing standards
│   │   │   ├── Progression.ts  # Koch/Farnsworth curriculum
│   │   │   └── ChoirSync.ts    # Server time sync, latency compensation
│   │   └── ui/
│   │       ├── HUD.ts          # Streak, WPM, rank display
│   │       └── ShareCard.ts    # Generate shareable result image
│   ├── server/                 # Hono backend (bundled to dist/server)
│   │   ├── index.ts            # App factory
│   │   ├── routes/
│   │   │   ├── api.ts          # REST: lesson state, daily freq, leaderboard
│   │   │   ├── forms.ts        # Form submissions
│   │   │   ├── menu.ts         # Mod menu endpoints
│   │   │   └── triggers.ts     # onAppInstall, scheduled jobs
│   │   ├── services/
│   │   │   ├── RedisStore.ts   # User state, daily freq, leaderboards
│   │   │   ├── Scheduler.ts    # Nightly: post daily freq, choir events
│   │   │   └── ChoirManager.ts # WebSocket/broadcast for sync
│   │   └── middleware/
│   │       ├── auth.ts         # Devvit context validation
│   │       └── rateLimit.ts    # Per-user/day limits
│   └── shared/
│       ├── api.ts              # TypeScript types for client↔server
│       ├── morse.ts            # Shared Morse constants, timing
│       └── curriculum.ts       # Lesson definitions
├── public/                     # Static assets
│   ├── fonts/
│   ├── audio/                  # Pre-recorded fallback tones
│   └── images/
└── tools/
    ├── deploy.ts               # Devvit deploy wrapper
    └── dev.ts                  # Local dev with hot reload
```

### 4.2 Devvit Configuration (`devvit.json`)
```json
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "cw-tutor",
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": { "inline": true, "entry": "splash.html" },
      "game": { "entry": "game.html" }
    }
  },
  "server": {
    "dir": "dist/server",
    "entry": "index.cjs"
  },
  "menu": {
    "items": [
      { "label": "Post Today's Frequency", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/post-frequency" },
      { "label": "Schedule Choir Event", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/schedule-choir" }
    ]
  },
  "forms": { "choirSignup": "/internal/form/choir-signup" },
  "triggers": {
    "onAppInstall": "/internal/triggers/on-app-install",
    "dailyFrequency": "/internal/triggers/daily-frequency",
    "choirReminder": "/internal/triggers/choir-reminder"
  },
  "scripts": { "build": "vite build", "dev": "vite build --watch" }
}
```

### 4.3 Key Technical Systems

#### 4.3.1 Audio Engine (`AudioEngine.ts`)
```typescript
class AudioEngine {
  private ctx: AudioContext;
  private osc: OscillatorNode;
  private gain: GainNode;
  private readonly FREQUENCY_HZ = 700;      // Standard CW tone
  private readonly ATTACK_MS = 2;           // Click-free keying
  private readonly RELEASE_MS = 2;

  async init(): Promise<void> {
    this.ctx = new AudioContext();
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    this.osc.type = 'sine';
    this.osc.frequency.value = this.FREQUENCY_HZ;
    this.osc.connect(this.gain).connect(this.ctx.destination);
    this.gain.gain.value = 0;
    this.osc.start();
  }

  // Precise scheduling using AudioContext.currentTime
  keyDown(at?: number): void { /* ramp gain to 1 */ }
  keyUp(at?: number): void { /* ramp gain to 0 */ }
  
  // Play pre-composed sequence with Farnsworth timing
  playSequence(elements: MorseElement[], charWpm: number, effectiveWpm: number): Promise<void>;
}
```

#### 4.3.2 Touch Input (`TouchInput.ts`)
```typescript
class TouchInput {
  private readonly DIT_THRESHOLD_MS = 150;
  private readonly DAH_MIN_MS = 150;
  private readonly MAX_DAH_MS = 2000;
  
  onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.keyDownTime = performance.now();
    this.audioEngine.keyDown();
    this.haptic?.vibrate(10);
  };

  onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    const duration = performance.now() - this.keyDownTime;
    this.audioEngine.keyUp();
    const element = duration < this.DIT_THRESHOLD_MS ? 'dit' : 'dah';
    this.emit('element', element, duration);
  };
}
```

#### 4.3.3 Waveform Visualization (`WaveformViz.ts`)
- **Canvas 2D** (lighter than WebGL) — 60fps overlay
- **Two layers**: Target (ghost) + User (live) with color coding
- **Green** = correct timing, **Red** = early/late, **Yellow** = wrong element
- **Scales** with Phaser `ScaleManager.RESIZE`

#### 4.3.4 Morse Codec (`MorseCodec.ts`)
```typescript
// ITU-R M.1677-1 standard timing
const DIT_MS = 1200 / wpm;           // 1 unit
const DAH_MS = 3 * DIT_MS;           // 3 units
const INTRA_CHAR_GAP = DIT_MS;       // 1 unit
const INTER_CHAR_GAP = 3 * DIT_MS;   // 3 units
const WORD_GAP = 7 * DIT_MS;         // 7 units

// Farnsworth: char speed = target WPM, gap speed = effective WPM
function calculateFarnsworthTiming(charWpm: number, effectiveWpm: number): Timing;
```

#### 4.3.5 Choir Synchronization (`ChoirSync.ts`)
- **Server-authoritative clock** via `/api/time` endpoint (NTP-style offset)
- **Client predicts** server time: `serverTime = localTime + offset`
- **Scheduled events**: "Choir starts in T-10s" → countdown → simultaneous `keyDown`
- **Latency compensation**: Server collects timestamps, computes sync score
- **Visual**: Converging waveform lines → perfect overlap = "Harmony" bonus

---

## 5. Daily Return Mechanics

| Mechanic | Implementation | Retention Driver |
|----------|----------------|------------------|
| **Daily Frequency** | Server posts new word/phrase daily at 00:00 UTC via trigger | Anticipation, scarcity (1/day) |
| **Streak** | Consecutive days with ≥1 transmission | Loss aversion |
| **Lesson Progression** | Auto-advance on mastery; "Next character unlocks tomorrow" | Goal gradient |
| **Choir Schedule** | Weekly events announced 24h ahead | Social commitment |
| **Legacy Wall** | Best transmission per user etched in subreddit wiki | Identity, permanence |
| **Leaderboards** | Daily WPM, weekly choir sync, all-time mastery | Competition |

### 5.1 Nightly Scheduler (Server)
```typescript
// triggers/daily-frequency.ts
export async function dailyFrequencyTrigger(context: Devvit.TriggerContext) {
  const today = new Date().toISOString().split('T')[0];
  const word = await selectDailyWord(today); // Curated list + procedural
  await redis.set(`daily:${today}`, { word, morse: encode(word) });
  await context.reddit.submitPost({
    subreddit: 'cwtutor',
    title: `📻 Today's Frequency: "${word}"`,
    body: renderSplashEmbed(word), // Devvit interactive post
  });
  await scheduleChoirReminders(today);
}
```

---

## 6. Social / Collective Features

### 6.1 Choir Mode (The "Collective Joy" Anchor)
- **Scheduled**: 3×/week (mod-configurable)
- **Mechanic**: Everyone receives same sequence. Tap in unison.
- **Scoring**: `syncScore = 1 - (stdDev(latencies) / meanLatency)`
- **Visual**: Waveforms converge → "HARMONY ACHIEVED" particle burst
- **Reward**: Choir badge, bonus XP, subreddit announcement

### 6.2 Subreddit Integration
| Feature | Implementation |
|---------|----------------|
| **Daily Post** | Auto-posted by bot, contains interactive splash |
| **Legacy Wiki** | `/wiki/legacy` — top transmissions, auto-updated |
| **Mod Tools** | Menu: "Post Frequency", "Schedule Choir", "View Stats" |
| **Flair** | "CW Operator", "Choir Member", "Lesson 40 Graduate" |
| **Cross-post** | Share result to r/amateurradio, r/learnhacking, etc. |

### 6.3 Asynchronous Social
- **Ghost transmissions**: See anonymized waveforms of others on same lesson
- **Challenge**: "Beat my WPM on Lesson 12" → deep link to practice mode
- **Mentor system**: Graduated users can "adopt" new learners (notification on struggle)

---

## 7. Phaser Special Award Strategy

| Phaser 4 Feature | Usage in CW-TUTOR | Award Relevance |
|------------------|-------------------|-----------------|
| **Web Audio Integration** | `AudioEngine` wraps `AudioContext`; scheduled keying | Core mechanic |
| **Scale Manager (RESIZE)** | Fits any viewport: inline post, mobile, desktop | "Fit in viewport" requirement |
| **Input Manager (Pointer)** | Touch + mouse unified; `touch-action: none` | Mobile-first |
| **TimeStep** | Sub-millisecond timing for Farnsworth | Precision showcase |
| **Scene System** | Boot→Preloader→Splash/Menu/Lesson/Practice/Choir→GameOver | Architecture |
| **Particle System** | Harmony burst, keying feedback, streak fireworks | Juice/polish |
| **Tween System** | Waveform morphing, UI transitions | Smooth UX |
| **BitmapText** | Retro terminal aesthetic for Morse display | Unique identity |
| **WebGL Shaders** | (Optional) Waveform as GPU compute | Bonus innovation |

**Differentiation:** Most Phaser games use it for *visuals*. We use it for **audio timing + touch + visual feedback** — a complete interactive system.

---

## 8. Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AudioContext autoplay blocked** | High | High | Require first tap to unlock; splash = "Tap to Begin"; fallback to pre-recorded audio |
| **Mobile touch latency** | Medium | High | `touch-action: none`; `pointer` events; test on iOS Safari / Chrome Android |
| **Farnsworth timing drift** | Medium | Medium | Server-authoritative clock; `AudioContext.currentTime` scheduling |
| **Scope creep (lessons, Q-codes, etc.)** | High | Medium | MVP = 10 lessons + daily freq + choir. Post-launch backlog. |
| **Accessibility (hearing impaired)** | Low | High | Visual waveform + haptic vibration API + high-contrast mode |
| **Devvit platform limits** | Low | High | Test deploy early; use official template; monitor API changes |
| **Cheating (auto-tappers)** | Medium | Low | Server-side validation; human-like timing variance checks |
| **Low retention post-lesson** | Medium | Medium | Endless practice modes, choir, legacy, mentor system |

---

## 9. Development Roadmap (28 Days Remaining)

### Week 1 (Days 1–7): Foundation & MVP Core
| Day | Deliverable |
|-----|-------------|
| 1 | Scaffold from `devvit-template-phaser`; configure `devvit.json`; verify deploy |
| 2 | `AudioEngine` + `TouchInput` + `MorseCodec`; dit/dah detection working |
| 3 | `SplashScene`: daily frequency UI, waveform viz, transmit flow |
| 4 | `LessonScene` (Lessons 1–5): Koch progression, Farnsworth timing |
| 5 | Server: Redis store, `/api/daily-frequency`, `/api/lesson-state` |
| 6 | `Preloader` + `Boot`: audio unlock, asset loading, error handling |
| 7 | **Integration test**: full splash→lesson loop on Devvit preview |

### Week 2 (Days 8–14): Polish & Social
| Day | Deliverable |
|-----|-------------|
| 8 | `PracticeScene`: custom drills, WPM calculator, mastery tracking |
| 9 | `ChoirScene`: server sync, countdown, multiplayer waveform |
| 10 | Nightly scheduler: daily frequency post, choir reminders |
| 11 | Legacy wall: subreddit wiki auto-update, best transmission etch |
| 12 | Share card: generate PNG result → Reddit native share |
| 13 | Mod menu: post frequency, schedule choir, view stats |
| 14 | **Playtest**: 5 external users; iterate on timing feel |

### Week 3 (Days 15–21): Content & Accessibility
| Day | Deliverable |
|-----|-------------|
| 15 | Full curriculum: 40 lessons (alphabet, digits, prosigns, Q-codes) |
| 16 | Accessibility: haptic fallback, screen-reader announcements, high-contrast |
| 17 | Visual polish: particle bursts, streak animations, UI transitions |
| 18 | Audio polish: tone shaping, spatial audio for choir, volume ducking |
| 19 | Onboarding: interactive tutorial (first 3 lessons guided) |
| 20 | Error handling: offline queue, retry, graceful degradation |
| 21 | **Stress test**: 50 concurrent choir participants |

### Week 4 (Days 22–28): Launch Prep
| Day | Deliverable |
|-----|-------------|
| 22 | Security audit: rate limits, input validation, XSS prevention |
| 23 | Performance: bundle size < 500KB gzipped; cold start < 2s |
| 24 | Documentation: README, API docs, mod guide, contributor guide |
| 25 | Marketing assets: trailer GIF, splash screens, Devpost submission |
| 26 | Final playtest + bug bash |
| 27 | Production deploy; monitor logs; hotfix window |
| 28 | **Devpost submission** (deadline: July 15, 9:00 PM EDT) |

---

## 10. File Structure (Generated Scaffold)

```
cw-tutor/
├── .github/workflows/deploy.yml
├── .env.template
├── devvit.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── AGENTS.md
├── src/
│   ├── client/
│   │   ├── game.ts
│   │   ├── game.html
│   │   ├── splash.html
│   │   ├── scenes/
│   │   │   ├── Boot.ts
│   │   │   ├── Preloader.ts
│   │   │   ├── SplashScene.ts
│   │   │   ├── MenuScene.ts
│   │   │   ├── LessonScene.ts
│   │   │   ├── PracticeScene.ts
│   │   │   ├── ChoirScene.ts
│   │   │   └── GameOver.ts
│   │   ├── systems/
│   │   │   ├── AudioEngine.ts
│   │   │   ├── TouchInput.ts
│   │   │   ├── WaveformViz.ts
│   │   │   ├── MorseCodec.ts
│   │   │   ├── Progression.ts
│   │   │   └── ChoirSync.ts
│   │   └── ui/
│   │       ├── HUD.ts
│   │       └── ShareCard.ts
│   ├── server/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── api.ts
│   │   │   ├── forms.ts
│   │   │   ├── menu.ts
│   │   │   └── triggers.ts
│   │   ├── services/
│   │   │   ├── RedisStore.ts
│   │   │   ├── Scheduler.ts
│   │   │   └── ChoirManager.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       └── rateLimit.ts
│   └── shared/
│       ├── api.ts
│       ├── morse.ts
│       └── curriculum.ts
├── public/
│   ├── fonts/
│   ├── audio/
│   └── images/
└── tools/
    ├── deploy.ts
    └── dev.ts
```

---

## 11. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `phaser` | ^4.0.0 | Game engine |
| `hono` | ^4.x | Server framework |
| `@devvit/public-api` | ^0.x | Devvit SDK |
| `ioredis` | ^5.x | Redis client |
| `zod` | ^3.x | Schema validation |
| `date-fns` | ^3.x | Date utilities |
| `canvas` | ^2.x | Share card generation |
| `vitest` | ^2.x | Testing |
| `eslint` + `prettier` | Latest | Code quality |

---

## 12. Success Metrics (Hackathon Submission)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Daily Active Users** | >500 by Day 14 | Devvit analytics |
| **7-Day Retention** | >35% | Cohort analysis |
| **Avg Session Time** | >3 min | Client telemetry |
| **Choir Participation** | >20% of DAU | Server logs |
| **Lessons Completed** | >5000 total | Redis counters |
| **Subreddit Members** | >1000 | Reddit API |
| **Devpost Votes** | Top 10 | Devpost leaderboard |

---

## 13. Devpost Submission Checklist

- [ ] **Project page**: Compelling description, screenshots, trailer GIF
- [ ] **Video demo**: 2-min walkthrough (splash → lesson → choir)
- [ ] **Live demo link**: Devvit preview URL
- [ ] **Source code**: Public GitHub repo (or private with Devpost access)
- [ ] **Phaser highlight**: Dedicated section on Phaser 4 features used
- [ ] **Accessibility statement**: Haptic, visual, screen-reader support
- [ ] **Team info**: Solo or team, roles, contact

---

## 14. Post-Hackathon Roadmap (If Winning / Traction)

| Phase | Features |
|-------|----------|
| **v1.1** | Callsign practice, DXCC entity list, contest simulator |
| **v1.2** | P2P practice rooms, Morse chat, QSO logging |
| **v1.3** | Hardware keyer integration (Web Serial API), paddle support |
| **v2.0** | Multi-language (Cyrillic, Greek, Arabic Morse), RTL support |
| **Platform** | Native mobile app (Capacitor), offline sync, PWA |

---

## 15. Appendix: Morse Curriculum (First 10 Lessons)

| Lesson | New Chars | Cumulative | Focus |
|--------|-----------|------------|-------|
| 1 | K, M | 2 | Rhythm foundation |
| 2 | R, S | 4 | Common letters |
| 3 | U, A, P, T | 8 | Vowel + frequent |
| 4 | L, O, W, I | 12 | High-frequency |
| 5 | ., N, J, E | 16 | Prosig + E/T |
| 6 | F, 0, Y, , | 20 | Punctuation + digits |
| 7 | V, G, 5, / | 24 | Fraction + slant |
| 8 | Q, 9, Z, ? | 28 | Rare + query |
| 9 | H, 3, 8, @ | 32 | Email + time |
| 10 | B, 4, 2, 7 | 36 | Digits complete |

*Lessons 11–40: Q-codes, prosigns, abbreviations, callsigns, contest exchanges*

---

## 16. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-02 | Audio-first Morse concept | Unique on platform; hits all hackathon criteria |
| 2026-07-02 | Koch + Farnsworth method | Proven pedagogical standard; prevents plateau |
| 2026-07-02 | Devvit Web + Phaser 4 | Official template; Phaser special award path |
| 2026-07-02 | Choir mode = synchronous | "Collective joy" requirement; viral mechanic |
| 2026-07-02 | Daily frequency = 1/day | Scarcity → anticipation; fits interactive post |

---

**Report Generated:** 2026-07-02  
**Author:** DS (DigitalResultsPros)  
**Status:** Ready for scaffold generation

---

*End of Report*