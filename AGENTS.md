# AGENTS.md

You are writing a **Devvit Web** application that runs on Reddit.com (MorseTime).

## Tech stack (actual)

- **Frontend:** React 19, Tailwind CSS 4, Vite, Canvas 2D, Web Audio API
- **Backend:** Node.js ≥22, Hono (REST-style routes) — **not tRPC** in this repo
- **Platform:** `@devvit/web` client + server (Redis, Reddit API, context)
- **No Phaser** — locked; see `project/agent/DECISIONS.md`

## Layout

- `/src/server` — Hono app (`index.ts`), routes under `routes/` (`api`, `daily`, `progress`, `menu`, `triggers`, `forms`), `core/post.ts`
- `/src/client` — iframe UI
  - `splash.html` / `splash.tsx` — inline feed entry (keep light)
  - `game.html` / `game.tsx` — expanded full game
  - `systems/` — `AudioEngine`, `TouchInput`, `WaveformViz`, `Progression`
- `/src/shared` — client/server shared types and Morse/WPM/curriculum logic
- `/tests` — Vitest unit tests
- `/project` — product docs (design, ops, research, agent notes)

There is **no** `trpc.ts` in this project. Prefer plain Hono handlers and typed shared types in `src/shared/api.ts`.

## Frontend rules

- Use `navigateTo` / `requestExpandedMode` from `@devvit/web/client` (not `window.location` assign for Reddit navigation)
- No `window.alert` — use `showToast` / `showForm` from `@devvit/web/client`
- No file-download APIs as primary UX; clipboard + toast is fine
- No geolocation, camera, mic, or notifications web APIs
- Do not put inline script bodies in HTML entrypoints — use bundled modules

## Input (current code)

- Pointer hold + keyboard **Space or Enter** both start/stop the keyer
- **Dit vs dah = hold duration**, not which key (fixed ~150ms threshold today; target is WPM-relative — see design docs)

## Commands

- `npm run type-check` — TypeScript project references build
- `npm run lint` — ESLint
- `npm run test` / `npm run test -- path` — Vitest
- `npm run dev` — Devvit playtest
- `npm run build` / `npm run deploy` / `npm run launch` — see root README

## Code style

- Prefer type aliases over interfaces
- Prefer named exports over default exports
- Avoid unnecessary type casts

## Global rules

- Devvit **Web only** — do not introduce `@devvit/public-api` blocks patterns
- New mod menu endpoints must be registered in `devvit.json`
- Product locks and dual-timeline gameplay: **`project/agent/DECISIONS.md`** and **`project/design/ux.md`**
- Doc index: **`project/README.md`**

Docs: https://developers.reddit.com/docs/llms.txt
