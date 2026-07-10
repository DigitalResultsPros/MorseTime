# Decisions (locked)

Last updated: 2026-07-10

## Hackathon / product

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope for competition | **Devvit Reddit app only** | Web and mobile are separate programs; not hackathon critical path |
| Brand / package name | **MorseTime** (`morsetime`) | `package.json`, `devvit.json`, playtest sub |
| Playtest subreddit | **`morsetime_dev`** | `devvit.json` → `dev.subreddit` |
| **Platform split** | **Reddit = game + extras**; **website = full product** | Feed is social/race; site is deep training / account / features (owner 2026-07-10) |
| **Public website** | **https://morsetime.com** | Full training product; Reddit CTA “Full training on the web →” via `navigateTo` |
| Phaser | **Out — do not add** | No product unlock; timing/audio stay Web Audio + Canvas; avoid rewrite tax; Phaser special award abandoned |
| Game stack | **React 19 + Tailwind + Vite + Hono + Web Audio + Canvas 2D** | Live playtest; smaller feed bundle; purpose-built Morse systems |
| Core mechanic | **Keying** (tap/hold dit/dah; Space/Enter) | Not type-to-copy primary loop |
| Choir mode | **Stretch** (after P0 gameplay + async social) | Collective joy; needs sync or a lighter same-event fallback; must not block dual-timeline ship |
| UI language toggle | **Stretch / P2** — UI strings only (e.g. EN + one locale) | Does **not** change daily Morse; safe for one global leaderboard |
| Multilingual Morse content | **Out** (non-Latin alphabets, per-locale daily words) | Different challenges break one fair speed board |
| Agent notes location | **`project/agent/`** | Approved 2026-07-10 |

### Platform roles (locked)

| Surface | Job | Depth |
|---------|-----|--------|
| **Reddit Devvit app** | Daily **game**: shared Frequency, leaderboard, share, light practice/lessons as **extras** | Iframe-friendly, session-short, social |
| **Website (domain)** | **Full product**: complete curriculum UX, rich stats, settings, account, future modes | No feed height tax; primary “learn Morse for real” home |

**Implication:** Do not turn the Reddit expanded view into a full LMS. Prefer a **game hub with a few extras** + optional “Continue on web” for power features. Shared core (morse codec, keying loop, curriculum data, daily word) can power both; **feature completeness lives on the site**.

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
| Default daily loop | **Listen → Start → letter-by-letter transmit → ms result** | See [../design/new.md](../design/new.md); full-word buffer remains optional later |
| Rhythm-sync mode | **Not default**; optional hard mode only later | Absolute ms alignment is a different game |
| Letter-by-letter entry | **Default on splash** (main page) | Whole-word single buffer optional later; lessons can share matcher |
| Server API style | **Hono REST routes** (not tRPC) | Matches `src/server`; AGENTS.md corrected 2026-07-10 |
| Docs layout | **`project/{design,ops,research,agent}/`** | Root keeps `README.md` + `AGENTS.md` only |
| Input phases | **Input disabled during listen; enabled only in transmit** | No keying during target playback |
| Scoring (P0) | **Sequence match** (dit/dah list or per-char) | Correctness first |
| Scoring (P1 / board) | **Transmit duration → effective WPM** among correct runs | Daily leaderboard metric; see Leaderboard section |
| Dit/dah threshold | **WPM-relative** (not fixed 150ms) | Fixed threshold breaks at different speeds |
| Display lanes | **Top: target word** (listen reveal) / **Bottom: live ·/−** (current letter) | Splash drops CRT waveform as primary; see new.md |
| Element rendering | Quiet ·/− glyph strip + provisional hold bar on splash | Block/CRT optional elsewhere |
| Daily plaintext | **Reveal during listen; full word visible in transmit** (splash default) | Blind mode can hide later; challenge is correct keying + speed |
| User sidetone | **On key down/up during transmit** | Key must feel and sound live |
| Scoring (P0 splash) | **Correct all letters + elapsed ms** from Start | Leaderboard later ranks by this time → WPM |

### Phase machine (canonical splash — new.md)

```text
loading → idle → listen → ready → transmit → result
                    ↑       │         │
                    └── replay ───────┘  (replay in transmit keeps timer)
```

| Phase | Target | User clock | Input |
|-------|--------|------------|-------|
| `listen` | Audio + letter reveal | Off | **Off** |
| `ready` | Full word visible | Off | **Off** (await Start) |
| `transmit` | Full word reference | Starts on **Start transmission** | **On** |
| `result` | Static | Frozen ms | Off |

### Explicit non-goals for this loop

- Requiring user to match target absolute timestamps (default)
- Mixing user and target elements on one baseline / one `currentTime`
- Shared playhead “tap along with ghost”

## Explicit non-goals (hackathon window)

- Phaser / three.js / other game engines
- **Multilingual Morse content** (extra alphabets, locale-specific daily words that desync the board)
- 40-lesson curriculum depth over polish
- Standalone web SEO PWA or native mobile (separate tracks; `plans/` cleaned)
- Blocking ship on choir or UI i18n

## Training hub / expanded surface (locked 2026-07-10)

Owner answers (chat). Spec: [../design/training.md](../design/training.md).

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feed vs expanded | **Splash stays daily**; CTA opens **Practice hub** | Daily race stays in feed; depth in expanded |
| Hub content | **Lessons + challenges + light retention** (Reddit-scale only) | Extras, not full LMS |
| Unlock model | **Strict sequential** (server-enforced Pass gate) | Avoid empty “unlocked everything” |
| Progress storage | **Per-user Redis** (`userId` / member id — not `postId`) | Released product; progress follows the account |
| Naming | Avoid “full game”; **Practice →** / hub **Practice** | Game tone |
| Lesson input format | **Same as daily** listen → Start → letter-by-letter → ms | One skill loop |
| Daily board | Lesson times **do not** rank on daily Frequency board | Fair shared-word race |
| Pass gate (unlock N+1) | **10 scored groups** + **≥90% letter accuracy**; both **always visible** | No hidden attempt floor |
| Accuracy counting | Wrong letter buffer = miss; correct advance = hit; group +1 on full clear | Mistakes affect % |
| Prestige tiers | Optional on Reddit; full suite is **web product** | Keep iframe light |
| **Web codebase** | **Separate repo / product** — do **not** land web curriculum or full LMS code here | This repo = Devvit Reddit app only |

### Free intro curriculum (locked)

| Decision | Choice |
|----------|--------|
| Lesson 1 | **2 letters** (K M) |
| Lessons 2+ | **+1 letter** each |
| **Free lessons** | **4** steps |
| **Free letters** | **5** total: **K M R S U** |
| Reddit training depth | **Only this free intro** — then drill those five + daily + web CTA |
| Full path / other games | **morsetime.com** (+ mobile later) — **out of this repo** |

```text
1  K M
2  + R
3  + S
4  + U   ← free / Reddit training ends (5 letters)
```

## Stretch (after P0)

- **Choir** — scheduled shared keying; full sync if feasible, else same-event + leaderboard
- **UI language toggle** — string tables only; default English
- Share card PNG, richer stats menu, blind mode, audio polish (noise/filter) — see `design/gui.md`

## When to reopen

Only reopen a locked row if the human owner explicitly overrides it in chat or edits this file.
