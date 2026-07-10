# Status

Last updated: 2026-07-10

## Snapshot

| Item | State |
|------|--------|
| Repo | `/home/drp/Projects/MorseTime` · branch `working` |
| Platform | Devvit Web — splash (inline) + game (expanded) |
| Playtest | `morsetime_dev` |
| Phaser | **Not using** |
| Gameplay model | Splash implements [../design/new.md](../design/new.md): listen → Start → letter-by-letter → **ms** |
| Expanded surface | **Practice hub** + **lesson group runner** (Pass 10@90% last-10) |
| Leaderboard | Built (daily board); lesson times stay off this board |
| Progress | **Per-user** Redis + `POST /api/lesson-group` Pass unlock |
| Choir | **Stretch** |
| UI locale toggle | **Stretch** |
| Unit tests | **54 passed** (2026-07-10) |
| Docs layout | `project/{design,ops,research,agent}/` |

## What exists (code)

- Client: daily phase machine (`DailyChallenge`), splash + expanded both mount it; `AudioEngine`, `TouchInput`, `Progression`, leaderboard panel
- Server: Hono — daily frequency, leaderboard, progress (post-scoped), share, menu
- Shared: Morse codec + letter match helpers, WPM, curriculum (10 lessons)
- Tests: `tests/unit/` (codec, touch, audio, wpm)

## P0 remaining (release path)

1. ~~Per-user progress · hub · lesson runner + Pass~~ (done)
2. ~~Free intro curriculum (4 / KMRSU) + hub map + intro-complete UX~~ (done)
3. Mobile playtest polish
4. Optional: quick drill mode (free letters only)

### Stretch

6. Choir
7. UI language toggle
8. Blind mode (hub challenge; unlock after lesson ≥3)
9. Lesson-clear share / badges

## Next (suggested)

1. Implement training hub per [../design/training.md](../design/training.md)
2. Migrate progress keys to `progress:user:{userId}`
3. Extract shared `KeyingSession` from `DailyChallenge` if reuse gets messy
4. Playtest on `morsetime_dev`

## Session log

| Date | Note |
|------|------|
| 2026-07-10 | Agent notes; Phaser out; dual timeline locked |
| 2026-07-10 | Docs reorganized under `project/` |
| 2026-07-10 | Choir → stretch; leaderboard intent = WPM/time |
| 2026-07-10 | **Splash rewrite per new.md** on branch `working` |
| 2026-07-10 | Layout: center challenge above bottom board; word `mt-8` |
| 2026-07-10 | **Training hub locked**: 10 lessons, strict unlock, per-user progress, retention challenges |
| 2026-07-10 | **Pass gate locked**: 10 groups + 90% letters, live meters; prestige tiers; no silent attempt floor |
| 2026-07-10 | **Platform split**: Reddit = game + extras; domain website = full-featured product |
| 2026-07-10 | Web CTA: **Full training on the web →** + footer **morsetime.com**; expand = **Practice →** |
| 2026-07-10 | Practice hub shell: `TrainingHub` + lesson placeholder; progress per-user |
| 2026-07-10 | Lesson runner: groups + Pass API (10 groups · 90% last-10) · unlock next |
| 2026-07-10 | **Free intro locked**: 4 lessons / 5 letters (KMRSU); web stays separate repo |
| 2026-07-10 | Curriculum + hub/API aligned to free intro; intro-complete banner |
