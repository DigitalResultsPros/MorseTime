# Status

Last updated: 2026-07-10

## Snapshot

| Item | State |
|------|--------|
| Repo | `/home/drp/Projects/MorseTime` · DigitalResultsPros/MorseTime |
| Platform | Devvit Web — splash (inline) + game (expanded) |
| Playtest | Running on Reddit (`morsetime_dev`) |
| Team | Full team for remaining window |
| Phaser | **Not using** |
| Gameplay model | **New splash loop** in [../design/new.md](../design/new.md): full listen → Start → letter-by-letter keying → ms timer |
| Code vs docs | Splash still old shared-playhead UX until new.md implemented |
| Leaderboard | **Not built**; intent = correct + transmit WPM/time, same daily word |
| Choir | **Stretch** (not required for ship) |
| UI locale toggle | **Stretch**; Morse content stays monolingual for fairness |
| Unit tests | **43 passed** (2026-07-10) |
| Docs layout | `project/{design,ops,research,agent}/` — see [../README.md](../README.md) |

## What exists (code)

- Client: `splash.tsx`, `game.tsx`, `AudioEngine`, `TouchInput`, `WaveformViz`, `Progression`
- Server: Hono — daily frequency, progress, menu, on-app-install (no tRPC)
- Shared: Morse timing/codec, WPM helpers, 10-lesson curriculum
- Tests: four unit files under `tests/unit/`

## P0 gaps

### Gameplay / display

1. Dual-timeline phase machine (`idle → listen → transmit → result`)
2. Two-lane viz + independent clocks; readable block Morse
3. Input only in transmit; sidetone on hold
4. WPM-relative dit/dah threshold
5. Hide daily plaintext until result
6. Lesson encode path (don’t treat letters as Morse elements)

### Product / judging

7. Social: leaderboard / share (types only; rank = correct + transmit WPM/time)
8. Streak/WPM durable **per user** (not `postId`-only progress)
9. Stats menu still placeholder

### Stretch (do not block P0)

10. Choir (sync or light same-event fallback)
11. UI language toggle (strings only)

## Next (suggested)

1. Dual-timeline + two-lane display (ux/gui)
2. Real transmit-duration WPM + identity + daily leaderboard
3. Mobile playtest + polish first 30s
4. Devpost assets
5. Stretch: choir / UI locale if time

## Session log

| Date | Note |
|------|------|
| 2026-07-10 | Agent notes; Phaser out; dual timeline locked |
| 2026-07-10 | Docs reorganized under `project/`; accuracy pass |
| 2026-07-10 | Choir → stretch; UI locale stretch; multilingual Morse out; leaderboard = WPM/time on shared daily |
