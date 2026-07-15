# Reddit moderator guide: MorseTime

**Path:** `project/ops/reddit_guide.md`  
**Verified against codebase:** 2026-07-15  
**Locks:** [../agent/DECISIONS.md](../agent/DECISIONS.md)

---

## What is MorseTime?

MorseTime is a Reddit game built with [Devvit](https://developers.reddit.com/docs) that teaches Morse through **sound and keying**. Players hear a daily transmission and send it back by tapping or holding Space/Enter (dit/dah by **duration**, not by which key).

**Loop:** listen → then transmit on a **separate timeline** (clock starts on **Start transmission**).

---

## How it works on Reddit

### Architecture

MorseTime is a **Devvit Web** app (custom post + iframe):

| Layer | Tech |
|-------|------|
| Backend | Node.js, **Hono** REST routes (`src/server`) |
| Frontend | React 19 + Tailwind CSS 4 in a Reddit iframe |
| Storage | Devvit **Redis** (daily word, leaderboard, progress, streaks) |
| Audio | Web Audio API (`AudioEngine`) |
| Listen UI | Tone bars (`MorseSoundBars`), not a shared waveform playhead |

### Post surfaces

Configured in `devvit.json`:

1. **Inline** — `splash.html` (`inline: true`) in the feed  
2. **Expanded** — `game.html` via expanded mode (Practice hub + lessons)

Posts are created with `reddit.submitCustomPost()` (`src/server/core/post.ts`), title **“MorseTime - Daily Frequency”**.

### Daily frequency

- Word list + **date-based hash** in `src/server/routes/daily.ts` (`selectDailyWord`)
- Served by **`GET /api/daily-frequency`**
- Cached in Redis (versioned key; same calendar day → same word for everyone)
- **Scheduler** (`devvit.json` → `scheduler.tasks.daily-frequency-post`, cron `0 0 * * *`) can auto-post the daily challenge
- Playtest default subreddit: **`morsetime_dev`**

### Leaderboard & social

- Board: fastest correct transmit times for the day (ms → WPM)
- Client panel + optional sticky board comment (mod menu: **Pin / refresh leaderboard**)
- Players can **share** a score as a comment under the post
- Streaks are per-user in Redis

### Practice hub (expanded)

- Intro lessons with sequential Pass unlock (10 groups @ ≥90% letter accuracy)
- Lesson progress is **per-user** Redis (not post-scoped)
- Lesson times do **not** rank on the daily Frequency board

---

## Mod menu

| Action | Where | Endpoint |
|--------|--------|----------|
| Post Today's Frequency | Subreddit | `/internal/menu/post-frequency` |
| Pin / refresh leaderboard | Post | `/internal/menu/pin-leaderboard` |
| View Subreddit Stats | Subreddit | `/internal/menu/view-stats` |

---

## Local / deploy commands

See root [README.md](../../README.md): `npm run dev`, `build`, `test`, `deploy`, `launch`.

---

## Permissions (`devvit.json`)

- **Redis** enabled  
- **Reddit** API with moderator scope; `asUser: SUBMIT_COMMENT` for share / board comments  
