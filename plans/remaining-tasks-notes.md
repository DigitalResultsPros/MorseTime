# MorseTime — Remaining Tasks Notes

**Generated:** 2026-07-14
**Companion to:** `status-report-2026-07-14.md`
**Scope:** Only the not-yet-done items. Everything in P0/P1/P2 is complete and green (see status report).

---

## R1 — P3.11 Choir (light same-event version)  [STRETCH — locked, not blocking]

**Plan intent:** Build the *light* version first — a scheduled group keying window + a shared
"harmony" board. **No** realtime WebSocket sync needed (ChoirSync only if time/quality allow).
DECISIONS.md locks Choir as stretch; must not block dual-timeline / social ship.

### Suggested breakdown (when picked up)
1. **Same-event window**
   - Reuse the daily cron pattern (`devvit.json` `scheduler.tasks.*` → `scheduler.ts`) to open a
     scheduled "choir window" (e.g. a 60s window at a fixed UTC time) that creates/pins a dedicated
     choir post or reuses the daily post.
   - Store window state in Redis with `expiration: Date` (limited API — see gotchas below).
2. **Shared harmony board**
   - New Redis `zSet` (sorted set) for choir submissions (e.g. `choir:date`), keyed by `memberId`
     with score = participation/accuracy. Render a lightweight "harmony" leaderboard panel.
   - Use the *same* `LeaderboardPanel` style for visual consistency.
3. **Client entry point**
   - Add a "Join the Choir" tile in `TrainingHub.tsx` that only appears when a window is open
     (read a `/api/choir/status` GET). Reuse `DailyChallenge` transmit flow with a shared target.
4. **Defer** realtime sync (ChoirSync) entirely unless P0–P2 ship is rock-solid and quality permits.

### Gotchas
- Redis API is limited: `get/set({expiration:Date})/del/exists/expire/incrBy/hSet/hGet/hGetAll/
  hLen/zAdd/zCard/zRange/zRank/zRem/zScore`. **No** `sAdd`/`sCard`/`incr`.
- Cron `context.subredditName` may be empty in a scheduled task → pass `data.subreddit` like the
  existing `daily-frequency-post` task and let `createPost` fall back.
- Keep anonymous play graceful; `runAs:'USER'` posting still unverified at runtime.

---

## R2 — Runtime verification checklist (code complete, needs live `morsetime_dev`)

These are **implemented** but flagged unverified at runtime. Treat as acceptance gates before
submission — not new coding.

| Item | What to confirm | How |
|------|-----------------|-----|
| R2.1 | Daily cron fires and pins a fresh "Today's Frequency" post | Deploy; wait for `0 0 * * *` UTC; confirm new post appears + sticky board |
| R2.2 | "Post my time" creates a comment under the sticky board | Click button on result card; confirm comment via `runAs:'USER'`; check spam/scope perms |
| R2.3 | Streak increments across two real days | Play two days; header + `TrainingHub` show real `streak` (not 0) |
| R2.4 | Board rejects impossible `elapsedMs` (e.g. `1`) and missing/invalid token | `POST /api/leaderboard` with `elapsedMs:1` → 400; without token (non-anon) → 400 |
| R2.5 | `prefers-reduced-motion` disables celebration | OS/browser reduced-motion on; confirm no animated celebration |
| R2.6 | Mobile in-feed (Reddit app) keypad height / scroll | Playtest in Reddit mobile in-feed; check key-pad doesn't hide controls |

### Notes
- `runAs:'USER'` + Reddit self-promo/spam rules (plan open Q2/Q3) are **unverified**; the code
  degrades gracefully (try/catch → `showToast` error), so a failure here is non-fatal but should be
  confirmed so the "Post my time" feature actually works for judges.
- If cron trigger is unsupported in this `@devvit/web` version, the plan's approved fallback is a
  mod-menu "New daily post" + documented external cron — verify support first (plan open Q1).

---

## R3 — Submission assets (mostly human; agent preps)

- Devpost page, 2-min demo video, screenshots/GIF, judge "why it wins" narrative — copy already
  drafted in `WEB_READ.md` and `project/research/morse-hackathon-report.md` §13.
- **Agent prep:** a capture checklist + ensure the app is **deployed to `morsetime_dev`** with a
  live daily post so screenshots/video show a real populated board + comment thread.

---

## Suggested order
1. R2 (verify at runtime) — highest leverage, gates the submission narrative.
2. R3 (assets) — can run in parallel with R2 once a live board exists.
3. R1 (Choir) — only after R2/R3 are done and quality permits; never blocks ship.
