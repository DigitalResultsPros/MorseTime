# MorseTime

Learn Morse code by touch and sound. One daily transmission. Community choir mode. Your legacy etched in the subreddit.

**Built for:** Reddit's "Games with a Hook" Hackathon (June 17 – July 15, 2026)
**Platform:** Devvit Web (Reddit Developer Platform)
**Stack:** React 19, Tailwind CSS 4, Vite, Hono, Web Audio API, Canvas 2D

## What It Does

- **Daily Frequency** — A new Morse code word every day. Tap to hear it, then transmit it back.
- **Koch Method Lessons** — Learn characters one at a time with proven pedagogical timing (Farnsworth method).
- **Touch + Keyboard Play** — Tap the canvas or press Space/Enter to send dits and dahs.
- **Real-time Waveform** — Canvas 2D visualization shows target vs. your input with color-coded feedback.
- **Progress Tracking** — Per-character mastery tracked in Redis. Streaks and WPM displayed live.

## Architecture

```
src/
├── client/                 # React frontend (bundled to dist/client)
│   ├── game.html           # Full game entrypoint (expanded mode)
│   ├── splash.html         # Interactive post entrypoint (inline feed)
│   ├── game.tsx            # Game shell: menu → lesson → practice → daily
│   ├── splash.tsx          # Daily frequency: play target, tap to transmit
│   ├── systems/
│   │   ├── AudioEngine.ts  # Web Audio oscillator, precise keying
│   │   ├── TouchInput.ts   # Dit/dah detection + keyboard fallback
│   │   ├── WaveformViz.ts  # Canvas 2D real-time waveform
│   │   └── Progression.ts  # Koch method state machine
│   └── hooks/
│       └── useCounter.ts   # Legacy counter hook (template)
├── server/                 # Hono backend (bundled to dist/server)
│   ├── index.ts            # App factory
│   ├── routes/
│   │   ├── api.ts          # Legacy counter endpoints
│   │   ├── daily.ts        # GET /api/daily-frequency
│   │   ├── progress.ts     # GET /api/lesson-state, POST /api/progress
│   │   ├── menu.ts         # Mod menu endpoints
│   │   └── triggers.ts     # onAppInstall, dailyFrequency
│   └── core/
│       └── post.ts         # Post creation helper
├── shared/                 # Client ↔ server types and logic
│   ├── api.ts              # TypeScript types
│   ├── morse.ts            # ITU-R M.1677-1 encoding/decoding, timing
│   ├── wpm.ts              # WPM calculation utilities
│   └── curriculum.ts       # Koch lesson definitions (10 lessons)
└── tests/                  # Vitest unit tests (43 passing)
```

## Key Technical Decisions

- **No Phaser** — React + Canvas 2D keeps bundle size under 500KB and avoids beta engine risk.
- **AudioContext.currentTime** — Used for sub-millisecond audio scheduling, independent of frame rate.
- **Farnsworth Timing** — Characters sent at target speed (e.g., 20 WPM), gaps stretched for effective speed (e.g., 5 WPM).
- **Scheduled Trigger** — Nightly trigger updates Redis with the daily word; splash reads from Redis on load.
- **Keyboard Accessibility** — Space = dit, Enter = dah. Full lesson completable without touch.

## Commands

- `npm run dev` — Start Devvit playtest
- `npm run build` — Build client and server
- `npm run type-check` — TypeScript type checking
- `npm run lint` — ESLint
- `npm run test` — Run Vitest (43 tests)
- `npm run deploy` — Type-check, lint, and upload to Devvit
- `npm run launch` — Deploy and publish for review

## Hackathon Goals

| Criterion | Target |
|-----------|--------|
| Daily Return Hook | One daily frequency + streak + lesson progression |
| Collective Joy | Ghost transmissions, leaderboards, challenge friends |
| Polish | Audio-first, eyes-free, haptic, colorblind-safe waveform |
| Not Generic | Zero audio-first games on Reddit; unique Morse code learning |
| Phaser Award | N/A — using React + Canvas 2D for reliability |

## License

BSD-3-Clause
