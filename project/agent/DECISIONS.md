# Decisions (locked)

Last updated: 2026-07-10

## Hackathon / product

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope for competition | **Devvit Reddit app only** | Web and mobile are separate programs; not hackathon critical path |
| Brand / package name | **MorseTime** (`morsetime`) | `package.json`, `devvit.json`, playtest sub |
| Playtest subreddit | **`morsetime_dev`** | `devvit.json` → `dev.subreddit` |
| Phaser | **Out — do not add** | No product unlock; timing/audio stay Web Audio + Canvas; avoid rewrite tax; Phaser special award abandoned |
| Game stack | **React 19 + Tailwind + Vite + Hono + Web Audio + Canvas 2D** | Live playtest; smaller feed bundle; purpose-built Morse systems |
| Core mechanic | **Keying** (tap/hold dit/dah; Space/Enter) | Not type-to-copy primary loop |
| Choir mode | **Stretch** (after P0 gameplay + async social) | Collective joy; needs sync or a lighter same-event fallback; must not block dual-timeline ship |
| UI language toggle | **Stretch / P2** — UI strings only (e.g. EN + one locale) | Does **not** change daily Morse; safe for one global leaderboard |
| Multilingual Morse content | **Out** (non-Latin alphabets, per-locale daily words) | Different challenges break one fair speed board |
| Agent notes location | **`project/agent/`** | Approved 2026-07-10 |

## Leaderboard (locked intent — not implemented yet)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Daily challenge | **Same Morse target for everyone** that calendar day | Fair race; date-hashed word already works this way |
| Eligibility | **Correct sequence** (or clear accuracy threshold) first | Speed without correctness is not skill |
| Rank metric | **Transmit time → effective WPM** (from user timeline duration) | Match `LeaderboardEntry.wpm` intent; use real duration, not splash’s rough formula |
| UI locale | **Does not affect ranking** | Chrome only |
| Per-language / per-alphabet boards | **No** for default daily | Would split community; only if content multilingual returns later |
| Code state | Types in `src/shared/api.ts` only; **no route/UI yet** | Implement after dual-timeline scoring works |

## Gameplay & display (locked 2026-07-10)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timeline model | **Dual timeline** — target and user clocks are independent | Current single-clock “tap along with playhead” is broken and wrong for CW |
| Default daily loop | **Listen → Transmit (whole word)** | Hear full target, then key on a new timeline; closest to real CW |
| Rhythm-sync mode | **Not default**; optional hard mode only later | Absolute ms alignment is a different game |
| Letter-by-letter entry | **Later / lesson path**, not default daily | See `project/design/ux.md` backlog; lower cognitive load for learning, not first ship |
| Server API style | **Hono REST routes** (not tRPC) | Matches `src/server`; AGENTS.md corrected 2026-07-10 |
| Docs layout | **`project/{design,ops,research,agent}/`** | Root keeps `README.md` + `AGENTS.md` only |
| Input phases | **Input disabled during listen; enabled only in transmit** | No keying during target playback |
| Scoring (P0) | **Sequence match** (dit/dah list or per-char) | Correctness first |
| Scoring (P1 / board) | **Transmit duration → effective WPM** among correct runs | Daily leaderboard metric; see Leaderboard section |
| Dit/dah threshold | **WPM-relative** (not fixed 150ms) | Fixed threshold breaks at different speeds |
| Display lanes | **Two lanes**: Target (top) / You (bottom) | Separate timelines must be visually separate |
| Element rendering | **Prefer block keying view** (short/long bars + gaps); CRT arcs optional skin | Morse must be readable as language, not only decorative arcs |
| Daily plaintext | **Hide word until result** (or explicit reveal policy) | Preserves challenge / daily hook |
| User sidetone | **On key down/up during transmit** | Key must feel and sound live |

### Phase machine (canonical)

```text
idle → listen → transmit → result
         ↑         │
         └─ replay ┘  (optional re-listen before/after)
```

| Phase | Target clock | User clock | Input |
|-------|--------------|------------|-------|
| `listen` | Runs with audio + target playhead | Off / frozen | **Off** |
| `transmit` | Frozen (dim target strip OK) | Starts at 0 on GO or first key | **On** |
| `result` | Static | Static | Off |

### Explicit non-goals for this loop

- Requiring user to match target absolute timestamps (default)
- Mixing user and target elements on one baseline / one `currentTime`
- Showing the answer word during listen/transmit by default

## Explicit non-goals (hackathon window)

- Phaser / three.js / other game engines
- **Multilingual Morse content** (extra alphabets, locale-specific daily words that desync the board)
- 40-lesson curriculum depth over polish
- Standalone web SEO PWA or native mobile (separate tracks; `plans/` cleaned)
- Blocking ship on choir or UI i18n

## Stretch (after P0)

- **Choir** — scheduled shared keying; full sync if feasible, else same-event + leaderboard
- **UI language toggle** — string tables only; default English
- Share card PNG, richer stats menu, blind mode, audio polish (noise/filter) — see `design/gui.md`

## When to reopen

Only reopen a locked row if the human owner explicitly overrides it in chat or edits this file.
