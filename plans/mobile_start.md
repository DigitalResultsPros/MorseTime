# MorseTime Mobile — Start Instructions

## Overview

Build a standalone React Native (Expo) mobile app for MorseTime. This is a **separate** project from both the Devvit app and the web app. It will share the same freemium model, backend, and core game logic but with a native mobile experience.

## Tech Stack

- **Framework**: Expo SDK (React Native)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State**: Zustand
- **Backend**: Same Supabase backend as web app
- **Audio**: expo-av (for Morse code audio playback)
- **Storage**: expo-secure-store + AsyncStorage (offline progress)
- **Monetization**: Expo IAP (in-app purchases) + AdMob (free tier ads)
- **Push Notifications**: expo-notifications (daily reminders)

## Project Structure

```
MorseTime_mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Home / Daily Frequency
│   │   ├── lessons.tsx        # Lesson list
│   │   ├── practice.tsx       # Free practice
│   │   ├── progress.tsx       # Analytics & stats
│   │   └── profile.tsx        # Account & premium
│   ├── lesson/
│   │   └── [id].tsx           # Active lesson screen
│   ├── practice/
│   │   └── [mode].tsx         # Active practice screen
│   └── _layout.tsx            # Root layout with providers
├── components/
│   ├── ui/
│   ├── WaveformViz.tsx        # Expo GL or Skia waveform
│   ├── TouchPad.tsx           # Large tap-to-transmit button
│   ├── MorseKey.tsx           # Visual dit/dah indicator
│   └── PremiumGate.tsx        # Paywall overlay
├── core/
│   ├── morse.ts               # Ported from Devvit/shared
│   ├── wpm.ts
│   ├── curriculum.ts
│   ├── audio.ts               # expo-av wrapper
│   └── timing.ts
├── features/
│   ├── auth/
│   ├── lesson/
│   ├── practice/
│   ├── daily/
│   ├── social/
│   ├── premium/
│   └── analytics/
├── hooks/
├── stores/
│   ├── authStore.ts
│   ├── progressStore.ts
│   └── premiumStore.ts
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts              # Expo IAP wrapper
│   └── admob.ts
├── constants/
│   ├── colors.ts
│   └── theme.ts
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

## Phase 1: Scaffold & Core Engine

1. Initialize Expo project: `npx create-expo-app MorseTime_mobile --template blank-typescript`
2. Install dependencies:
   - `expo-router`, `expo-secure-store`, `expo-av`, `expo-notifications`, `expo-haptics`
   - `@shopify/flash-list` (performant lists)
   - `@react-native-skia` or `expo-gl` (waveform visualization)
   - `@supabase/supabase-js`, `zustand`, `react-native-safe-area-context`
   - `react-native-iap`, `react-native-google-mobile-ads`
3. Configure Expo Router (file-based navigation)
4. Port core Morse engine from Devvit `src/shared/` into `core/`
5. Port audio engine using `expo-av` (replace Web Audio API)
6. Set up theme/colors (dark mode, colorblind-safe)

## Phase 2: Backend & Auth

1. Reuse Supabase project from web app
2. Implement Supabase auth in `lib/supabase.ts`
3. Create auth screens (login, signup, forgot password)
4. Implement auth state management in `stores/authStore.ts`
5. Set up deep linking for OAuth (Google, Apple)

## Phase 3: Core Game Features

1. **Home / Daily Frequency**: Daily word, streak counter, quick play button
2. **Lesson Mode**: Koch method with Skia-based waveform visualization
3. **Practice Mode**: Free practice with custom WPM
4. **Touch Input**: Large touch pad for dit/dah, haptic feedback
5. **Audio**: expo-av for Morse code playback with precise timing

## Phase 4: Premium & Monetization

1. Implement Expo IAP (subscriptions: monthly/yearly)
2. Create premium gating logic
3. Premium features:
   - Expanded curriculum
   - Advanced analytics
   - Ghost transmission sharing
   - Ad-free experience
4. Integrate AdMob (banner + interstitial ads for free tier)
5. Implement paywall UI

## Phase 5: Offline & Sync

1. Store progress locally with AsyncStorage
2. Sync with Supabase when online
3. Handle offline mode gracefully (show cached data)
4. Push notifications for daily reminders

## Phase 6: Polish & Deployment

1. App icons and splash screen
2. EAS Build setup (iOS + Android)
2. TestFlight / Internal Testing
3. App Store / Play Store listings

## Key Constraints

- **No Devvit dependencies**: Remove all `@devvit/web`, `devvit` references
- **No Reddit API**: Standalone auth via Supabase
- **Independent codebase**: Do not import from Devvit or web projects; duplicate and adapt core logic
- **Type safety**: TypeScript strict mode
- **Performance**: Smooth 60fps waveform, instant touch response

## Next Steps

1. Confirm this plan with the user
2. Switch to Code mode
3. Execute Phase 1 scaffolding
