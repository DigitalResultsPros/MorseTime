# Reddit Moderator Guide: MorseTime

## What is MorseTime?

MorseTime is a Reddit game built with [Devvit](https://developers.reddit.com/docs/llms.txt) that teaches players Morse code through touch and sound. Players listen to audio tones (dits and dahs) and tap their screen or press keys to transmit the same sequence.

---

## How the Game Works on Reddit

### Architecture

MorseTime is a **Devvit Web App** — a custom app that runs inside Reddit posts. It consists of:

- **Backend**: Node.js serverless functions (Hono + tRPC) that run on Reddit's infrastructure
- **Frontend**: React 19 + Tailwind CSS that renders inside an iframe on Reddit.com
- **Database**: Redis (provided by Devvit) for storing daily words, progress, and stats

### Post Types

The app creates **Reddit Custom Posts** using `reddit.submitCustomPost()`. Each post contains:

1. An **inline view** (`splash.html`) — a lightweight preview shown directly in the Reddit feed
2. An **expanded view** (`game.html`) — the full game experience when users click into the post

### Daily Frequency System

Every day, the game selects a new word from a curated list (PARIS, CODE, MORSE, SIGNAL, etc.) using a deterministic hash based on the date. This means:

- All players get the **same word** each day
- The word is cached in Redis for 24 hours
- Players compete to decode it fastest

---

## Moderator Workflow

### Creating a New Game Post

**Only moderators can create new game posts.**

When you install the app on your subreddit, a menu item appears in the moderator toolbar:

- **"Post Today's Frequency"** — Creates a new Reddit post titled *"MorseTime - Daily Frequency"* with today's word

To create a post:
1. Go to your subreddit
2. Open the moderator menu (three dots or app menu)
3. Click **"Post Today's Frequency"**
4. The app creates the post and navigates you to it

### Viewing Stats

- **"View Subreddit Stats"** — Shows engagement metrics (currently a placeholder; can be extended to show leaderboards, WPM averages, etc.)

---

## Answering Your Questions

### Can only mods create a new game?

**Yes.** The menu items in `devvit.json` are configured with:

```json
"forUserType": "moderator"
```

This means regular users will not see the "Post Today's Frequency" or "View Subreddit Stats" options. Only users with moderator permissions in the subreddit can trigger these actions.

### Is there only 1 post containing the game, or do previous game posts remain?

**Previous game posts remain.** Every time a moderator clicks "Post Today's Frequency" (or when the app is installed), a **brand new Reddit post** is created. The app does **not** delete or archive old posts.

This means:
- You will accumulate multiple "MorseTime - Daily Frequency" posts over time
- Each post is independent and contains its own game instance
- Users can play any previous day's post (though the daily word is date-based, so older posts may show stale data depending on implementation)

If you want a cleaner subreddit, you may want to:
- Manually remove old posts periodically
- Or modify the code to delete/archive previous posts before creating new ones

---

## What Happens on App Install?

When a moderator installs MorseTime on a subreddit, the `onAppInstall` trigger fires automatically and creates the **first game post**. This ensures the subreddit has an initial post to start with.

---

## User Experience

1. **Inline View**: Users scrolling their feed see a preview of the game with a "Play Target" button
2. **Expanded View**: Clicking the post opens the full game with:
   - A canvas for tapping Morse code
   - Audio playback of the target sequence
   - Real-time waveform visualization
   - Streak tracking and WPM calculation
3. **Progression**: The game tracks which characters the user has mastered and advances through a curriculum

---

## Technical Details for Mods

| Component | Technology |
|-----------|-----------|
| Backend | Node.js 22, Hono, tRPC v11 |
| Frontend | React 19, Tailwind CSS 4, Vite |
| Hosting | Reddit Devvit (serverless) |
| Database | Redis (managed by Devvit) |
| Audio | Web Audio API (oscillator-based tones) |

---

## Need Help?

- [Devvit Documentation](https://developers.reddit.com/docs)
- [r/Devvit](https://www.reddit.com/r/Devvit) — Community for Devvit developers
