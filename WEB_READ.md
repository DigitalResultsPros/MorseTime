# MorseTime — About page copy & product brief

**Audience:** players, judges, Reddit visitors, press  
**Product:** MorseTime — learn and race Morse code by ear and key, as a Reddit Devvit app  
**Use:** paste/adapt sections into an About page, Devpost, subreddit wiki, or app “About” form  

---

## One-liner

**MorseTime** is a daily Morse code challenge on Reddit: **listen** to today’s transmission, then **key it back** letter by letter — scored by how fast you send a correct copy.

---

## Elevator pitch (short)

Every day, everyone gets the **same** secret word in Morse. You hear it as pure tone (dits and dahs), watch letters appear with the audio, then **Start transmission** and send it back with your finger or keyboard. Correct letters advance; mistakes only clear the letter you’re on. Finish the word and see your time in **milliseconds**. Speed and accuracy meet a skill you can feel.

Built for Reddit’s **Games with a Hook** hackathon as a **Devvit Web** app — no install, play in the feed.

---

## What you do (player-facing)

1. **Today’s Frequency** loads the shared daily word (same for everyone that calendar day).
2. **Play transmission** — hear Morse at a clear practice pace (first play **20 WPM**). Letters light up one by one with the sound.
3. **Replay** (optional) — change **speed** (WPM slider) and **wide letter spacing** so letters like **E, I, and S** stay distinct.
4. **Start transmission** — the clock starts. Hold to key (or **Space** / **Enter**): short = dit (·), long = dah (−).
5. Match each letter’s Morse pattern. The live ·/− strip shows only your **current** letter.
6. Complete the word → **celebration** and your time in **ms**.

**Open full game** expands into a richer practice / lesson surface when you want more than the daily.

---

## Why it’s not “just another trivia game”

| Hook | Why it sticks |
|------|----------------|
| **Daily shared target** | Fair race: one Morse word for the whole community |
| **Audio-first** | Skill is in the ear and the fist, not typing Latin letters |
| **Dual timeline** | Listen first, then transmit on **your** clock — not “tap along with a ghost” |
| **Letter boundaries** | Wide spacing on first play teaches that short gaps are *inside* a letter; long gaps mean *next* letter |
| **Millisecond pride** | Clear, comparable score for leaderboards and bragging rights |
| **Touch + keyboard** | Works on phone in the Reddit app and on desktop |

---

## How Morse is taught here (plain language)

Morse letters are made of **dits** (short) and **dahs** (long).

- Inside a letter, gaps are **short**.
- Between letters, gaps are **longer**.
- That’s how **E** (·), **I** (··), and **S** (···) stay different — not by pitch, by **rhythm and space**.

**Wide letter spacing** keeps character speed real while stretching the silence between letters (Farnsworth-style), so beginners hear the edge of each character. Advanced players can turn it off and run standard spacing at higher WPM on replay.

---

## Features (current product)

### Daily loop (main / inline page)

- Daily word via server (`/api/daily-frequency`), date-hashed, cached  
- Listen → ready → **Start** → letter-by-letter key → result in **ms**  
- Replay with **WPM slider** (after first play) and **wide letter spacing** toggle  
- Sidetone while keying; subtle ·/− feedback under the word  
- Celebration on full correct copy  
- Link to expanded **full game**

### Platform

- **Reddit Devvit Web** (iframe UI in feed + expanded mode)  
- React + Web Audio + lightweight DOM UI (no Phaser)  
- Hono backend, Redis for daily cache / progress hooks  

### Coming / intentional next

- **Leaderboard** — same daily Morse; rank by correct + transmit time → effective WPM  
- Durable **streaks** per user  
- Expanded game curriculum polish  
- Stretch: **choir** (shared keying event), UI language toggle (strings only; Morse stays one alphabet for a fair board)

---

## About section blocks (ready to paste)

### About MorseTime

MorseTime turns Morse code into a daily Reddit ritual. Each day brings one shared “frequency” — a word sent as pure CW tone. Listen carefully, then key it back as fast as you can without breaking the code. Whether you’re learning your first letters or chasing a faster copy, the loop is the same: **ear, then fist, then time.**

### How to play

1. Tap **Play transmission** and listen.  
2. Letters appear as each character is sent.  
3. Optionally **Replay** slower/faster, with wide spacing for clarity.  
4. Tap **Start transmission** — the timer runs.  
5. Hold the pad (or Space/Enter): short hold = ·, long hold = −.  
6. Finish every letter correctly to lock your time.

### Fair play & daily challenge

Everyone gets the **same** daily word. Your score is how quickly you send a **correct** full copy after Start. Future leaderboards will rank correct runs by time (and WPM derived from that time) — not by guessing plaintext without the ear.

### Accessibility & devices

- Works in the Reddit mobile app and desktop  
- Keyboard keying supported (Space / Enter)  
- Visual letter reveal supports audio  
- Reduced-motion friendly success animation where possible  
- Tip: use headphones if the feed is noisy  

### Technology (for judges / technical readers)

MorseTime is a **Devvit Web** application: React 19 client, Vite build, Hono server routes, Web Audio for scheduled Morse and live sidetone, shared TypeScript Morse timing (ITU-style units, optional wide inter-character gaps). Gameplay deliberately avoids a single shared playhead; target and user timelines stay separate.

### Credits & license

- **Name / package:** MorseTime (`morsetime`)  
- **Hackathon:** Reddit Games with a Hook (2026)  
- **License:** BSD-3-Clause (see repository `LICENSE`)  
- **Playtest subreddit:** configured in app `devvit.json` (development: `morsetime_dev`)

---

## FAQ (About / support)

**Is the word the same for everyone?**  
Yes, for that calendar day.

**Why can I see the letters while I key?**  
The main daily loop is designed for onboarding and feed play: hear it, see it, key it. A harder “blind” mode can hide the word later.

**Why does the first play feel spaced out?**  
Wide letter spacing makes character boundaries obvious so E, I, and S don’t blur together. Replays can use standard tight spacing.

**What counts as a dit vs a dah?**  
Hold time: shorter than a midpoint threshold (based on WPM) is a dit; longer is a dah.

**Does wrong input ruin the whole word?**  
No — only the **current letter** buffer clears. Timer keeps running.

**Will there be a leaderboard?**  
That’s the planned social layer: correct copy first, then rank by transmit duration / WPM.

**Phaser / big game engine?**  
Not used. Timing-critical audio stays on Web Audio with a purpose-built UI.

---

## Tone & voice guidelines

- Warm, slightly radio / Q-code flavor without jargon walls  
- Prefer **clear** over cute when teaching spacing  
- Celebrate skill (“Transmission Received!”) more than gambling dopamine  
- Never claim real-world license credit; this is a game that teaches rhythm  

Suggested voice examples:

- “Today’s frequency is up.”  
- “Short gaps live inside a letter. A long gap means the next one.”  
- “Transmission Received! — 1,240 ms.”

---

## Screenshot / media checklist (About + Devpost)

1. Inline splash: word reveal during listen  
2. Replay controls: WPM slider + wide spacing  
3. Key pad + live ·/− strip during transmit  
4. Result celebration with ms time  
5. (Optional) Expanded full game  

---

## Links to keep on the About page

| Link | Purpose |
|------|---------|
| Play / open post in playtest sub | Primary CTA |
| How Morse spacing works (short FAQ) | Reduce E/I/S confusion |
| Full game (expanded) | Depth |
| r/Devvit or docs | Platform context for judges |
| Repo / license | Open source / hackathon |

---

## Internal note (not for public About)

Canonical product locks and agent status live under `project/agent/`. Implementation brief for the main page: `project/design/new.md`. This file is **player- and web-facing copy**, not an engineering status source of truth.

---

*End of WEB_READ.md — MorseTime about / marketing brief.*
