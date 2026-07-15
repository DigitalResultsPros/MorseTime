# MorseTime

**Learn Morse code by ear and hand — one shared daily race on Reddit.**

Every day, everyone gets the **same** word in Morse. You listen, then key it back letter by letter. Faster correct copy wins. No install: it runs as a [Devvit](https://developers.reddit.com/docs) app inside Reddit.

Built for Reddit’s **Games with a Hook** hackathon (2026).

---

## Who it’s for

| Audience | Why |
|----------|-----|
| **Reddit players** | A short daily skill game in the feed — not a trivia quiz |
| **Morse beginners** | Practice by sound and hold-to-key, with intro lessons in expanded mode |
| **Competitive learners** | Same word for everyone, leaderboard by time (ms → WPM), streaks |
| **Judges / reviewers** | Audio-first game with a clear daily hook and social board |

Deep training and full curriculum live on the web product ([morsetime.com](https://morsetime.com)); this repo is the **Reddit game**.

---

## How to play (game mechanics)

1. Open **Today’s Frequency** in the post (inline in the feed).
2. Tap **Play transmission** — hear today’s word as Morse tone. Letters appear with the audio.
3. Optionally replay slower, or with wider spacing between letters, until it feels clear.
4. Tap **Start transmission** — **your** clock starts (you do not tap along with the playback).
5. **Key each letter** with touch or keyboard:
   - **Hold short** → dit (·)
   - **Hold long** → dah (−)
   - **Space** or **Enter** also key (same short/long rule)
6. Finish the full word correctly → see your time in **milliseconds** (and WPM).
7. Climb **today’s leaderboard**, keep a **daily streak**, and optionally **Post my time** as a Reddit comment.

**Expanded mode (Practice →)** opens a practice hub: free intro lessons (listen → key groups with a pass gate) plus the same daily race. Lesson times do **not** rank on the daily board.

**Rules that matter**

- Correctness first; only a full correct copy counts for the board.
- Rank is by **transmit time** among correct runs (then shown as effective WPM).
- Everyone races the **same word** for that UTC calendar day.

---

## Setup

### Prerequisites

- **Node.js** ≥ 22.2 (see `package.json` → `engines`)
- A **Reddit** account and [Devvit](https://developers.reddit.com/docs) access
- npm (ships with Node)

### Install and playtest

```bash
git clone https://github.com/DigitalResultsPros/MorseTime.git
cd MorseTime
npm install
npm run login          # authenticate with Devvit
npm run dev            # Devvit playtest (builds + serves)
```

Playtest subreddit is set in `devvit.json` → `dev.subreddit` (default: **`morsetime_dev`**). Use the Devvit CLI / playtest flow to open the app in that sub.

### Useful commands

| Command | What it does |
|---------|----------------|
| `npm run dev` | Playtest against Reddit |
| `npm run build` | Build client + server → `dist/` |
| `npm run test` | Run unit tests (Vitest) |
| `npm run type-check` | TypeScript project build |
| `npm run lint` | ESLint on `src/` |
| `npm run deploy` | type-check + lint + `devvit upload` |
| `npm run launch` | Deploy and `devvit publish` |

### Deploy (production-ish)

```bash
npm run deploy    # upload to Devvit
# or
npm run launch    # upload + publish
```

You need mod (or appropriate) rights on the target subreddit and Devvit app permissions as in `devvit.json` (Redis, Reddit, comment-as-user for share).

---

## What’s included

| Feature | Notes |
|---------|--------|
| Daily shared Morse word | Date-hashed, Redis-cached |
| Dual-timeline play | Listen first, then key on your own clock |
| Leaderboard + streak | Per-user Redis; anti-cheat token + minimum time floor |
| Share score | Posts a comment under the board (“Post my time”) |
| Practice hub + intro lessons | Sequential pass unlock (10 groups @ 90%+) |
| Daily post scheduler | Nightly auto-post via `devvit.json` |
| Mod menu | Post frequency, pin board, stats |

---

## Project layout

```text
src/
├── client/     # React UI — splash (feed) + game (expanded)
├── server/     # Hono API — daily, leaderboard, progress, share, …
├── shared/     # Morse codec, WPM, curriculum, API types
└── tests/      # Unit tests
```

**Stack:** React 19, Tailwind CSS 4, Vite, Hono, Web Audio API · **Platform:** Devvit Web

More detail: [project/README.md](./project/README.md) · product locks: [project/agent/DECISIONS.md](./project/agent/DECISIONS.md) · pitch copy: [WEB_READ.md](./WEB_READ.md)

---

## License

BSD-3-Clause — see [LICENSE](./LICENSE).
