# Notes

Scratch findings and open questions. Promote durable choices to `DECISIONS.md` and ship state to `STATUS.md`.

## Architecture reminders

- Devvit web only — rules in root [AGENTS.md](../../AGENTS.md)
- Client: `navigateTo` / `requestExpandedMode` from `@devvit/web/client`
- Server: `redis`, `reddit`, `context` from `@devvit/web/server`; **Hono routes, not tRPC**
- Entrypoints: `splash.html` (inline), `game.html` (expanded)

## Doc map (after 2026-07-10 reorg)

| Doc | Path |
|-----|------|
| Index | `project/README.md` |
| Locks | `project/agent/DECISIONS.md` |
| Status | `project/agent/STATUS.md` |
| UX | `project/design/ux.md` |
| GUI | `project/design/gui.md` |
| Mods | `project/ops/reddit_guide.md` |
| Research | `project/research/*` |

## Dual-timeline design (reference)

Full locks: `DECISIONS.md`. UX: `design/ux.md`. Display: `design/gui.md`.

```text
LISTEN                          TRANSMIT
─────────────────────           ─────────────────────────
Target audio + playhead    →    Target frozen (dim OK)
Input OFF                  →    User timeline t=0
Target lane animates       →    User lane grows with keys
                                Sidetone on hold
                                Score sequence at end
```

### Code touch map

| Area | Files |
|------|--------|
| Phase + loop | `src/client/splash.tsx`, `src/client/game.tsx` |
| Viz lanes / clocks | `src/client/systems/WaveformViz.ts` |
| Key down/up + threshold | `src/client/systems/TouchInput.ts` |
| Sidetone | `src/client/systems/AudioEngine.ts` |
| Encode / timing | `src/shared/morse.ts` |

### Why current code fails dual-timeline

- Splash: input only if `view === 'playing'`; user times use target start
- Game: same with `isPlayingRef`
- WaveformViz: one `elements[]`, one `currentTime`
- TouchInput: no sidetone; fixed 150ms dit threshold
- Keyboard: Space **or** Enter both = same keyer (duration → dit/dah), **not** Space=dit / Enter=dah

## Accuracy audit notes (2026-07-10)

| Claim found in old docs | Reality |
|-------------------------|---------|
| tRPC / `trpc.ts` | **False** — Hono only |
| Nightly scheduled daily trigger | **Not in** `devvit.json` |
| Phaser | **Not used**; locked out |
| Choir / ChoirSync | **Not in codebase**; **stretch** after P0 social |
| UI language toggle | Stretch; does not change daily Morse or board fairness |
| Multilingual Morse content | **Out** — would split or invalidate one WPM board |
| Leaderboard | Types only; **intent** = same daily word, correct first, rank by transmit time → effective WPM |
| Space=dit, Enter=dah | **False** — both keys; duration classifies |
| Progress per user | **False** — keys use `postId` |
| 43 unit tests | **True** (`npm run test`) |
| MorseCodec.ts filename | **False** — logic in `src/shared/morse.ts` |
| Stats menu | Placeholder toast only |

## Open questions for humans

- Exact submission deadline / Devpost registration
- Prize priority without Phaser
- Transmit start: GO vs first-key
- End transmit: Submit vs silence timeout
- Beginner reveal-word toggle?
- Public demo sub vs `morsetime_dev` only
- First UI locales if stretch (e.g. EN + ES only?)
- Choir: full sync vs same-event + board only

## Links

- Repo: https://github.com/DigitalResultsPros/MorseTime
- Devvit: https://developers.reddit.com/docs/llms.txt
