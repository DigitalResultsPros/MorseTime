# MorseTime Web — Start Instructions

> **Recommended approach**: Use SvelteKit for the web app (better SEO, smaller bundles, built-in SSR). Pair it with a separate Expo React Native project for mobile. Both share the Supabase backend and core Morse engine.

## Overview

Build a standalone, monetizable web version of MorseTime at `/home/drp/Projects/MorseTime_web`. This is a **separate** project from the existing Devvit app. It will be a freemium web app with premium subscriptions, ads, user accounts, cloud sync, expanded curriculum, social features, and offline mode.

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: Supabase (auth + database + edge functions) — chosen for rapid auth/DB + real-time + generous free tier
- **State**: Svelte stores (built-in, lightweight)
- **Routing**: SvelteKit file-based routing
- **Monetization**: Stripe (subscriptions) + Google AdSense (free tier ads)
- **Offline**: Service Worker + IndexedDB (via Dexie.js)
- **Audio**: Web Audio API (same engine as Devvit, ported)
- **Visualization**: Canvas 2D (same waveform viz, ported)

## Project Structure

```
MorseTime_web/
├── src/
│   ├── lib/
│   │   ├── core/                # Shared Morse engine (ported from Devvit)
│   │   │   ├── morse.ts
│   │   │   ├── wpm.ts
│   │   │   ├── curriculum.ts
│   │   │   ├── audio.ts
│   │   │   └── timing.ts
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI components
│   │   │   ├── WaveformViz.svelte  # Canvas 2D waveform
│   │   │   ├── TouchPad.svelte     # Tap-to-transmit pad
│   │   │   └── LessonCard.svelte
│   │   ├── stores/              # Svelte stores
│   │   ├── supabase.ts          # Supabase client
│   │   ├── stripe.ts            # Stripe client
│   │   └── db.ts                # Dexie/IndexedDB
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout
│   │   ├── +page.svelte         # Home
│   │   ├── lesson/
│   │   ├── practice/
│   │   ├── daily/
│   │   ├── auth/
│   │   ├── profile/
│   │   └── api/                 # API route handlers
│   └── app.css
├── static/
│   └── icons/
├── supabase/
│   ├── migrations/
│   └── config.toml
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Phase 1: Scaffold & Core Engine

1. Initialize SvelteKit project in `/home/drp/Projects/MorseTime_web` with TypeScript template
2. Install dependencies: `@supabase/supabase-js`, `stripe`, `dexie`, `tailwindcss`, `@tailwindcss/vite`, `vite-plugin-pwa`
3. Port `src/shared/morse.ts`, `src/shared/wpm.ts`, `src/shared/curriculum.ts` into `src/lib/core/`
4. Port `src/client/systems/AudioEngine.ts` into `src/lib/core/audio.ts` (remove Devvit-specific code)
5. Port `src/client/systems/WaveformViz.ts` into `src/lib/components/WaveformViz.svelte` (adapt to Svelte)
6. Set up Tailwind CSS 4 with SvelteKit
7. Create basic layout shell (header, nav, footer) using Svelte components

## Phase 2: Backend & Auth

1. Create Supabase project
2. Run migrations for:
   - `profiles` (id, email, display_name, avatar_url, subscription_status, created_at)
   - `progress` (user_id, lesson_number, char_mastery, wpm, streak, updated_at)
   - `daily_words` (date, word, char_wpm, effective_wpm)
   - `leaderboards` (user_id, mode, score, created_at)
   - `ghost_transmissions` (user_id, lesson_number, sequence, timing, created_at)
3. Implement Supabase auth (email/password + OAuth: Google, Reddit)
4. Implement protected routes
5. Implement profile page

## Phase 3: Core Game Features

1. **Lesson Mode**: Koch method with progression tracking
2. **Practice Mode**: Free practice with custom WPM
3. **Daily Frequency**: Daily word with streak tracking
4. **Waveform Visualization**: Real-time target vs user input
5. **Touch + Keyboard Input**: Tap canvas or press Space/Enter

## Phase 4: Premium & Monetization

1. Implement Stripe subscription integration (monthly/yearly)
2. Create premium gating logic (Svelte stores + route guards)
3. Premium features:
   - Expanded curriculum (beyond lesson 10)
   - Advanced analytics (WPM trends, error heatmaps)
   - Ghost transmission sharing
   - Custom lesson builder
   - Ad-free experience
4. Integrate Google AdSense for free tier (banner ads between lessons)
5. Implement paywall UI

## Phase 5: Social & Analytics

1. Leaderboards (daily, weekly, all-time)
2. Ghost transmissions (record and share your input)
3. Progress charts (WPM over time, character mastery)
4. Achievements/badges

## Phase 6: Offline & PWA

1. Service Worker for offline caching (SvelteKit built-in)
2. IndexedDB (Dexie) for local progress storage
3. Sync logic when back online
4. PWA manifest for installability

## Phase 7: Mobile (Expo)

See `mobile_start.md` for the React Native (Expo) project instructions.

## Key Constraints

- **No Devvit dependencies**: Remove all `@devvit/web`, `devvit`, `navigateTo` references
- **No Reddit API**: Standalone auth via Supabase
- **Independent codebase**: Do not import from the Devvit project; duplicate and adapt core logic
- **Type safety**: Maintain TypeScript strict mode
- **Performance**: Keep bundle under 500KB initial load

## Next Steps

1. Confirm this plan with the user
2. Switch to Code mode
3. Execute Phase 1 scaffolding
