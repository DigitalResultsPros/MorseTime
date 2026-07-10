# Reddit moderator guide: MorseTime

**Path:** `project/ops/reddit_guide.md`  
**Verified against codebase:** 2026-07-10  
**Locks:** [../agent/DECISIONS.md](../agent/DECISIONS.md)

---

## What is MorseTime?

MorseTime is a Reddit game built with [Devvit](https://developers.reddit.com/docs) that teaches Morse through **sound and keying**. Players hear a daily transmission and send it back by tapping or holding Space/Enter (dit/dah by **duration**, not by which key).

**Target loop (product):** listen → then transmit on a **separate timeline**. Code may still use a shared playhead until the dual-timeline work lands — see [../design/ux.md](../design/ux.md).

---

## How it works on Reddit

### Architecture

MorseTime is a **Devvit Web** app (custom post + iframe):

| Layer | Tech (actual) |
|-------|----------------|
| Backend | Node.js serverless, **Hono** REST-style routes (`src/server`) — **not tRPC** |
| Frontend | React 19 + Tailwind CSS 4 inside a Reddit iframe |
| Storage | Devvit **Redis** (daily word, progress keys) |
| Audio | Web Audio API (oscillator keying) |
| Viz | Canvas 2D (`WaveformViz`) |

### Post surfaces

Configured in `devvit.json`:

1. **Inline** — `splash.html` (`inline: true`) in the feed  
2. **Expanded** — `game.html` via expanded mode  

Posts are created with `reddit.submitCustomPost()` (`src/server/core/post.ts`), title **“MorseTime - Daily Frequency”**.

### Daily frequency

- Word list + **date-based hash** in `src/server/routes/daily.ts` (`selectDailyWord`)
- Served by **`GET /api/daily-frequency`**
- Cached in Redis as `daily:YYYY-MM-DD`
- Same calendar day → same word for everyone
- **No scheduled nightly job** is registered in `devvit.json` right now; word is created on first fetch for the day if missing

Playtest default subreddit: **`morsetime_dev`** (`devvit.json` → `dev.subreddit`).

---

## Moderator workflow

### Create a game post

**Only moderators** see these menu items (`forUserType: "moderator"` in `devvit.json`):

| Menu label | Endpoint | Behavior |
|------------|----------|----------|
| **Post Today's Frequency** | `/internal/menu/post-frequency` | Creates a new custom post and navigates to it |
| **View Subreddit Stats** | `/internal/menu/view-stats` | **Placeholder** — toast “Stats coming soon!” |

Steps:

1. Open the subreddit where the app is installed  
2. Open the mod / app menu  
3. Choose **Post Today's Frequency**  
4. You’re taken to the new post  

### Install behavior

`onAppInstall` (`src/server/routes/triggers.ts`) creates the **first** custom post automatically. It does **not** schedule daily posts.

### How many posts?

**Each menu action creates a new post.** Old posts remain. There is no auto-delete or archive.

Implications:

- Multiple “MorseTime - Daily Frequency” posts can accumulate  
- Each post is its own custom-post instance  
- Daily **word** is still date-based globally via Redis key `daily:date`, not “per post word”  

Mods may manually remove old posts if the subreddit should stay clean.

---

## User experience (current vs intended)

| | Current code (approx.) | Intended (locked) |
|--|------------------------|-------------------|
| Feed | Splash: “Today’s Frequency”, may show **plaintext word** | Hide word until result |
| Play | Play target; keying often tied to playback clock | **Listen** then **transmit** on separate timeline |
| Input | Canvas + Space/Enter hold → dit/dah by duration (~150ms threshold) | Same, WPM-relative threshold |
| Expanded | Menu: lesson / practice / daily | Same modes; fix lesson encode path |
| Streak / WPM | Shown in UI; not solid per-user daily streak yet | Durable per-user stats in Redis |
| Progress | Redis under keys using **`postId`** | Should be per **user** |

---

## Progress & identity (important)

`GET /api/lesson-state` and `POST /api/progress` use Redis keys scoped with **`context.postId`**, not username. That means progress is **not correctly multi-user** yet. Do not promise personal progression to the community until this is fixed.

---

## Technical reference for mods

| Component | Detail |
|-----------|--------|
| Package name | `morsetime` |
| Devvit config | `devvit.json` |
| API surface | `/api/*` (daily, progress, legacy counter), `/internal/menu/*`, `/internal/triggers/*` |
| Hosting | Reddit Devvit serverless |
| Docs index | [../README.md](../README.md) |

---

## Scope notes (hackathon)

| Item | Status |
|------|--------|
| **Phaser** | Out |
| **Multilingual Morse** (different alphabets / per-locale words) | Out — would break one fair daily board |
| **UI language toggle** | Stretch — chrome only; same daily word for all |
| **Leaderboard** | Planned: correct sequence + **transmit speed (WPM/time)**; not shipped |
| **Choir** | Stretch after core play + async social |
| **Full stats menu** | Placeholder toast only |

---

## Help

- [Devvit documentation](https://developers.reddit.com/docs)  
- [r/Devvit](https://www.reddit.com/r/Devvit)  
