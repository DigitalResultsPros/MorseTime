# MorseTime — Contest entry (About / Inspiration)

**Hackathon:** Reddit *Games with a Hook* (2026)  
**Platform:** Devvit Web  
**License:** BSD-3-Clause  
**Brand / package:** MorseTime (`morsetime`)

Use the sections below for Devpost-style forms, app descriptions, or subreddit about pages.

---

## One-liner

**MorseTime** — Learn Morse by ear and hand. Every day, one shared word on Reddit. Listen, then key it back. Faster correct copy wins.

---

## About the Project

**MorseTime** is a daily skill game that runs **inside Reddit** as a Devvit Web app—no install, playable in the feed.

Each UTC day, every player gets the **same** secret word as a pure Morse tone (“Today’s Frequency”). You **listen** first, then **Start transmission** and send the word back **letter by letter** with touch or keyboard: short hold = dit (·), long hold = dah (−). Only a **full correct copy** counts. Your score is **transmit time in milliseconds**, shown as effective WPM, on a shared leaderboard with streaks and optional “Post my time” comments.

### The hook

Most feed games are trivia or guess-the-answer. MorseTime is different: the skill lives in **rhythm and timing**—your ear and your fist—not typing Latin letters. Everyone races the **same** daily word, so the board is a fair, comparable race. Come back tomorrow for a new frequency and to keep your streak.

### How it plays

1. Open the post inline → **Play transmission** (hear Morse; letters appear with the audio).
2. Optionally replay slower or with **wide letter spacing** (Farnsworth-style) so E, I, and S stay distinct.
3. **Start transmission** — *your* clock starts (you don’t tap along with playback).
4. Key each letter; mistakes clear only the current letter.
5. Finish → time in ms, leaderboard rank, streak; optionally post your result as a Reddit comment.

**Practice →** expands into a small training hub: free intro lessons (K, M, R, S, U) with a pass gate, plus the same daily race. Lesson times do **not** rank on the daily board. Deep training lives at [morsetime.com](https://morsetime.com); this entry is the **Reddit game**.

### Built for Reddit

- Inline play in the feed + expanded Practice mode
- Shared daily target, Redis leaderboard, anti-cheat session token + minimum time floor
- Share score as a real comment; sticky leaderboard comment; nightly auto-post of the daily frequency
- Mod tools: post frequency, pin board, subreddit stats

### Tech (for judges)

**Stack:** React 19, Tailwind CSS 4, Vite, Hono, Web Audio API, shared TypeScript Morse timing (ITU-style units).  
**Platform:** Devvit Web (Redis + Reddit APIs).  
**Deliberate choice:** no Phaser/heavy engine—timing-critical audio and a purpose-built dual-timeline loop (listen clock ≠ keying clock).

---

## Inspiration

Morse code is one of the oldest real-time skills still used on the airwaves—and almost nobody has a place to *practice it socially*. Most “learn Morse” tools are solitary drills. Most Reddit games are trivia, guess-the-word, or short-session luck.

We wanted the opposite: a **skill you can feel**—ear, then fist—with a **fair daily race** the whole community shares. Not “type what you heard in Latin letters,” but **send the code back** the way operators actually do: short and long holds, rhythm, and spacing.

Reddit’s **Games with a Hook** brief pushed us further: a game that belongs *in the feed*, that people return to every day, and that creates **shared moments**—same challenge, comparable times, comments under the post—without requiring an install.

**MorseTime** is that idea: *today’s frequency is up; listen carefully; key it back; see where you stand.*

---

## What it does

**MorseTime** is a daily Morse code challenge that runs **inside Reddit** as a Devvit Web app.

### Daily loop (“Today’s Frequency”)

1. Everyone gets the **same word** for that UTC calendar day (date-hashed, server-served).
2. **Play transmission** — hear pure CW tone; letters reveal with the audio.
3. Optionally **replay** with a WPM slider and **wide letter spacing** (Farnsworth-style) so short letters like E, I, and S stay distinct.
4. **Start transmission** — *your* clock starts (independent of the playback).
5. **Key letter by letter**: short hold = dit (·), long hold = dah (−); Space/Enter work the same way.
6. Finish a full correct copy → time in **milliseconds** (and effective WPM).
7. Climb **today’s leaderboard**, keep a **daily streak**, and optionally **Post my time** as a Reddit comment.

### Practice (expanded mode)

- Free intro lessons for five letters (**K M R S U**), sequential unlock with a pass gate.
- Same listen → start → key loop as the daily.
- Lesson times **do not** rank on the daily board.
- Link out to deeper training on [morsetime.com](https://morsetime.com).

### Reddit-native social layer

- Inline play in the feed + expanded Practice hub
- Sticky auto-updating leaderboard comment
- Participant counts, streaks, share-to-thread
- Nightly scheduled daily post + mod menu (post frequency, pin board, stats)

---

## How we built it

**Platform:** [Devvit Web](https://developers.reddit.com/docs) — React UI in an iframe (inline splash + expanded game), Hono server routes, Redis for scores/progress/tokens.

### Stack

| Layer | Choices |
|--------|---------|
| Client | React 19, Tailwind CSS 4, Vite |
| Audio / input | Web Audio API (scheduled Morse + live sidetone), custom hold-to-key (WPM-relative dit/dah threshold) |
| Server | Hono REST (`/api/daily-frequency`, leaderboard, progress, share, scheduler, mod menu) |
| Shared | TypeScript Morse codec (ITU-style timing, optional wide inter-character gaps), WPM helpers, curriculum data |
| Product split | **Reddit = game + light practice**; full LMS/training product is separate (web) |

**Core design decision:** a **dual timeline**. Target audio and the player’s keying clock never share one playhead. You listen first; you transmit on your own timer. That matches real CW practice and avoids the broken “tap along with a ghost” model.

We deliberately **skipped Phaser and heavy engines**—timing-critical audio and a small, purpose-built UI fit the feed better than a game-engine rewrite.

---

## Challenges we ran into

**1. Dual timeline vs “sync games”**  
Early instincts pointed at matching a shared playhead. That’s a different game (rhythm-tap), and it’s wrong for Morse. We had to lock the phase machine—*listen → ready → transmit → result*—and disable input until Start, even when that felt less “gamey” at first.

**2. Teaching letter boundaries without drowning beginners**  
E / I / S only differ by count of dits. At real speed they blur. We leaned on **Farnsworth-style wide letter spacing** on first play (character speed real, gaps longer) plus optional tight replay for advanced players—without making the daily board unfair.

**3. Fair ranking in a client-timed game**  
Scores are measured on the client (`performance.now()` → ms). We can’t magically verify every hold, but we can kill trivial cheating: **one-time daily tokens**, **minimum plausible elapsed time** from letter count, and rank only on **full correct copies**. Best-of-day is stored in Redis sorted sets.

**4. Feed constraints**  
Inline height, mobile keying, AudioContext unlock on first user gesture, and keeping the expanded surface a **game hub**—not a full LMS—were constant product constraints. Progress and streaks live **per Reddit user in Redis**, not in `localStorage` as the source of truth.

**5. Making “daily” actually daily on Reddit**  
A one-shot install post isn’t a habit. We wired **scheduler-driven daily posts**, sticky board comments, and share-as-user comments so the social loop is findable and visible in-thread.

---

## Accomplishments that we're proud of

- A **complete daily race** that feels like Morse, not trivia: ear → fist → millisecond pride.
- **Same word for everyone**, ranked by real transmit duration → effective WPM.
- **Dual-timeline gameplay** with live sidetone and letter-by-letter feedback.
- **Leaderboard + streak + participants + Post my time**, with light anti-cheat and a sticky board comment.
- A **free intro curriculum** (4 lessons / 5 letters) with server-enforced pass gates, without bloating the Reddit app into a full course.
- **Reddit-native ops**: auto daily post, mod menu, Devvit permissions used for real community features.
- A clean technical bet: **React + Web Audio + Hono**, not a heavy engine—and a product split that keeps this repo focused as the **Reddit game**.

---

## What we learned

- **Hooks on Reddit are social, not just mechanical.** A great loop still needs a shared target, a public board, and a reason to talk under the post.
- **Correctness before speed** is the only ranking that teaches skill; fast wrong copies must not score.
- **Spacing is pedagogy.** Wide inter-character gaps teach the structure of Morse faster than any chart alone.
- **Platform constraints are product design.** Feed height, iframe audio policy, and Redis-backed identity forced clearer scope: game first, deep training elsewhere.
- **Document the locks.** Product decisions (no Phaser, dual timeline, free intro only, no multi-alphabet boards) kept the team from reopening the same debates every session.

---

## What's next for MorseTime

### Near term (Reddit app)

- Onboarding polish (first-run “listen → start → hold” overlay)
- Accessibility and result audio (reduced-motion-friendly celebration, success chime)
- Optional **blind mode** (hide the word while keying) for harder runs
- Richer “others on this frequency” social signals

### Stretch

- **Choir mode** — scheduled shared keying events (full sync if feasible, or same-event + leaderboard fallback)
- UI language toggle for chrome only (one global Morse alphabet / board)

### Beyond the hackathon

- Continue the **web product** at [morsetime.com](https://morsetime.com) for full curriculum, stats, and account features
- Keep the Reddit surface lean: daily race, light practice, community board—and a clear path for people who want to go deeper

The long-term north star stays the same: **ear, then fist, then time**—as a daily ritual people share.

---

## Why it fits “Games with a Hook”

| Criterion | How MorseTime hits it |
|-----------|------------------------|
| **Daily return** | One shared word per day + streak for consecutive correct days |
| **Collective joy** | Fair race, public leaderboard, sticky board, share-as-comment |
| **Not a clone** | CW keying + dual timeline; skill is rhythm, not MCQ |
| **Reddit-native** | Inline iframe, expanded hub, comments, scheduler, mod menu |
| **Polish / craft** | Web Audio sidetone, Farnsworth spacing, letter-by-letter matcher, Redis anti-cheat |

---

## Suggested media captions

1. **Inline:** “Today’s Frequency — listen while letters reveal.”
2. **Replay:** “WPM + wide spacing for clear letter boundaries.”
3. **Transmit:** “Hold short · / long − with live pattern strip.”
4. **Result:** “Transmission received — 1,240 ms.”
5. **Board:** “Same word, ranked by correct transmit time.”

---

## Short form (tight character budgets)

MorseTime is a **daily Morse code race on Reddit**. Everyone gets the same word in pure tone; you listen, then key it back with short/long holds. Correct full copy only; rank by **milliseconds** (and WPM). Built as a **Devvit Web** app—play in the feed, climb the board, keep a streak, post your time. Practice mode adds a free intro to five letters; the full training product is on the web. Audio-first skill game, not trivia—**ear, then fist, then time.**
