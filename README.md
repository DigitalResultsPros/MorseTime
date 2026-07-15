# MorseTime

Learn Morse code by touch and sound. One daily transmission on Reddit.

**Built for:** Reddit's "Games with a Hook" Hackathon (2026)  
**Platform:** Devvit Web  
**Stack:** React 19, Tailwind CSS 4, Vite, Hono, Web Audio API, Canvas 2D  
**Playtest subreddit:** `morsetime_dev` (see `devvit.json`)

**Docs:** [project/README.md](./project/README.md) · **Locks:** [project/agent/DECISIONS.md](./project/agent/DECISIONS.md) · **About copy:** [WEB_READ.md](./WEB_READ.md)

## What it does (shipped / in progress)

| Feature | State |
|---------|--------|
| Daily frequency word (date-hashed, Redis-cached) | Implemented |
| Inline splash + expanded game entrypoints | Implemented |
| Splash daily loop (listen → Start → letter key → ms) | Implemented — see `project/design/new.md` |
| Web Audio keying + touch/keyboard dit/dah | Implemented (WPM-relative threshold on splash) |
| Canvas waveform viz | Removed (unused); MorseSoundBars is the listen UX |
| Koch curriculum data (10 lessons) | Data + partial client |
| Progress API (Redis) | Implemented but keyed by `postId` (not per-user yet) |
| Mod menu: post frequency, stats placeholder | Implemented |
| Leaderboard / share | Not implemented — **intent:** same daily Morse, correct first, rank by transmit time → WPM |
| Choir | Not implemented — **stretch** after P0 social |
| UI language toggle | Not implemented — **stretch** (UI strings only; not multilingual Morse) |
| Phaser | **Not used** (locked out) |

**Target gameplay (locked):** listen to target → transmit on a **separate timeline** (see [project/design/ux.md](./project/design/ux.md)).

## Architecture

```text
src/
├── client/                 # React (→ dist/client)
│   ├── splash.html/.tsx    # Inline feed
│   ├── game.html/.tsx      # Expanded
│   └── systems/            # AudioEngine, TouchInput
├── server/                 # Hono (→ dist/server)
│   ├── index.ts
│   ├── routes/             # api, daily, progress, menu, triggers, forms
│   └── core/post.ts
├── shared/                 # morse, wpm, curriculum, api types
└── tests/                  # Vitest unit tests (codec, touch, audio, wpm)
```

## Key technical decisions

- **No Phaser** — React + Canvas 2D + Web Audio
- **Audio scheduling** via `AudioContext.currentTime`
- **Farnsworth timing** helpers in `src/shared/morse.ts` (wire fully into playback as needed)
- **Daily word** — generated/cached on `GET /api/daily-frequency` (no nightly scheduler in `devvit.json` currently)
- **Keyboard** — Space or Enter hold = keyer; duration classifies dit/dah (not “Space=dit, Enter=dah”)

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
| Daily return | Daily frequency + streak (streak durability still P0) |
| Collective joy | Leaderboard / share first; **choir = stretch** |
| Polish | Dual-timeline play + readable Morse display |
| Not generic | Audio-first Morse skill game |
| Phaser award | N/A |

## License

BSD-3-Clause
