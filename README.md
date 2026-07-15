# MorseTime

Learn Morse code by touch and sound. One daily transmission on Reddit.

**Built for:** Reddit's "Games with a Hook" Hackathon (2026)  
**Platform:** Devvit Web  
**Stack:** React 19, Tailwind CSS 4, Vite, Hono, Web Audio API  
**Playtest subreddit:** `morsetime_dev` (see `devvit.json`)

**Docs:** [project/README.md](./project/README.md) · **Locks:** [project/agent/DECISIONS.md](./project/agent/DECISIONS.md) · **About copy:** [WEB_READ.md](./WEB_READ.md)

## What it does

| Feature | State |
|---------|--------|
| Daily frequency word (date-hashed, Redis-cached) | Shipped |
| Inline splash + expanded game entrypoints | Shipped |
| Daily loop: listen → Start → letter-by-letter key → ms | Shipped |
| Web Audio keying + touch / Space·Enter (dit/dah by hold) | Shipped |
| Listen UX (`MorseSoundBars`) + Morse cheat sheet | Shipped |
| Daily leaderboard (correct first, rank by transmit ms → WPM) | Shipped |
| Daily streak + anti-cheat token on board submit | Shipped |
| Share score as a Reddit comment | Shipped |
| Practice hub + intro lessons (Koch-style groups, Pass gate) | Shipped |
| Per-user lesson progress (Redis) | Shipped |
| Nightly daily-frequency post scheduler | Shipped (`devvit.json`) |
| Mod menu: post frequency, pin board, stats | Shipped |
| Choir / UI language toggle | Stretch (not shipped) |
| Phaser | Not used |

**Gameplay model:** listen to the target, then transmit on a **separate timeline** (your clock starts when you press Start).

## Architecture

```text
src/
├── client/                 # React (→ dist/client)
│   ├── splash.html/.tsx    # Inline feed
│   ├── game.html/.tsx      # Expanded practice hub
│   ├── components/         # DailyChallenge, TrainingHub, leaderboard, …
│   └── systems/            # AudioEngine, TouchInput
├── server/                 # Hono (→ dist/server)
│   ├── index.ts
│   ├── routes/             # daily, progress, leaderboard, share, menu, …
│   └── core/               # post, dailyBoard, boardComment
├── shared/                 # morse, wpm, curriculum, api types
└── tests/                  # Vitest unit tests
```

## Key technical decisions

- **No Phaser** — React + Web Audio + purpose-built Morse UI
- **Audio scheduling** via `AudioContext.currentTime`
- **Farnsworth-friendly timing** helpers in `src/shared/morse.ts`
- **Daily word** — date-hashed, Redis-cached; optional nightly post via scheduler
- **Keyboard** — Space or Enter hold = keyer; duration classifies dit vs dah (WPM-relative threshold)

## Commands

- `npm run dev` — Devvit playtest  
- `npm run build` — Build client and server  
- `npm run type-check` — TypeScript  
- `npm run lint` — ESLint  
- `npm run test` — Vitest  
- `npm run deploy` — type-check, lint, `devvit upload`  
- `npm run launch` — deploy + `devvit publish`  
- `npm run login` — `devvit login`

## Hackathon focus

| Criterion | Direction |
|-----------|-----------|
| Daily return | Shared daily Frequency + streak |
| Collective joy | Leaderboard, sticky board comment, share |
| Polish | Dual-timeline play + readable Morse display |
| Not generic | Audio-first Morse skill game |
| Phaser award | N/A |

## License

BSD-3-Clause
