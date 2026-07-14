# MorseTime — Status Report (Plan vs. Reality)

**Generated:** 2026-07-14
**Plan source:** `.kilo/plans/1784059606365-morse-reddit-win-plan.md`
**Prior handoff:** `.kilo/HANDOFF.md` (now **stale** — see note below)

> **Important:** `.kilo/HANDOFF.md` claimed items P0.2 / P1.6 / P2.7 / P2.8 / §3.5 / P2.10 were
> still "remaining / not rendered." That was written *before* the final commit `737b5c6`
> ("feat: daily streak, anti-cheat, leaderboard polish, and TrainingHub UI"), which actually
> implements all of them. The handoff is out of date; this report reflects the **current
> committed tree** (HEAD = `737b5c6`), verified by reading the code and running the build.

---

## Verification (green)

- `npm run type-check` → **passes** (`tsc --build`, no errors)
- `npm test` → **66 passed** (5 test files)
- No `TODO` / `FIXME` / placeholder markers remain in `src/`
- Working tree clean except the untracked `.kilo/` docs

---

## Completed (all P0 + P1 + most P2, verified in code)

### P0 — Fix what's broken/faked
| # | Item | Status | Evidence |
|---|------|--------|----------|
| P0.1 | Real persisted daily streak | ✅ DONE | `touchDailyStreak`/`loadDailyStreak` in `src/server/core/dailyBoard.ts`; exposed as `streak` in `LeaderboardResponse` (`src/shared/api.ts`); rendered in `DailyChallenge.tsx` header + `TrainingHub.tsx` |
| P0.2 | "Post my time" button | ✅ DONE | `shareScore` + button in `DailyChallenge.tsx` result card (lines ~995–1010), `navigateTo(sharePermalink)` link, `showToast` feedback |
| P0.3 | Anti-cheat (token + floor) | ✅ DONE | `issueDailyToken` in `daily.ts`, `validateDailyToken`/`minPlausibleMs` in `leaderboard.ts`; anonymous allowed through; rejects impossible `elapsedMs` |

### P1 — Reddit-native daily community
| # | Item | Status | Evidence |
|---|------|--------|----------|
| P1.4 | Auto-post "Today's Frequency" daily | ✅ DONE | `devvit.json` `scheduler.tasks.daily-frequency-post` (cron `0 0 * * *`) → `src/server/routes/scheduler.ts` → `createPost(subreddit)` (subreddit-aware in `post.ts`) |
| P1.5 | Community participation signal | ✅ DONE | `recordParticipant` (hash-based distinct) + `getParticipantCount` (hLen) in `dailyBoard.ts`; `participants: number` in response; rendered in `LeaderboardPanel.tsx` ("N operators copied today") + sticky markdown |
| P1.6 | "Others on this frequency" ghost row | ✅ DONE | `others` state fetched from `GET /api/leaderboard`, rendered in `DailyChallenge.tsx` (lines ~1026+) with `·/−` glyph strip |

### P2 — Polish / onboarding / accessibility
| # | Item | Status | Evidence |
|---|------|--------|----------|
| P2.7 | First-run tutorial overlay | ✅ DONE | `MorseCheatSheet.tsx` (new) + overlay in `DailyChallenge.tsx` (lines ~805–832), gated by `localStorage['morsetime-tutorial-dismissed']`; also in `TrainingHub.tsx` + `splash.tsx` |
| P2.8 | Blind mode (accessibility) | ✅ DONE | `blindMode` toggle in `DailyChallenge.tsx` (lines ~866–875); hides letters during `transmit` phase; persisted in `localStorage` |
| §3.5 | Streak initial-load fetch fix | ✅ DONE | `useEffect` now `fetch('/api/leaderboard')` → `data.streak` (lines ~382–386), not the removed `/api/streak` |
| P2.10 | Achievement identity / badges | ✅ DONE | `buildBadges` in `TrainingHub.tsx` (first copy, first lesson, intro, practice 3/7/30, daily 3/7/30), rendered as badge row |
| §3.6 | TrainingHub daily streak | ✅ DONE | `TrainingHub.tsx` fetches `GET /api/leaderboard` into `dailyStreak` and shows it in title + badges |
| P2.9 | Two-lane block viz | ⏭ SKIPPED | Plan explicitly says **keep** current letter-reveal + glyph strip unless user testing shows confusion. Not rebuilt by design. |

---

## Remaining (deliberately deferred, not blocking)

### P3 — Stretch
| # | Item | Status | Note |
|---|------|--------|------|
| P3.11 | Choir (light same-event version) | ⬜ NOT STARTED | DECISIONS.md locks Choir as stretch. Plan says build **only after** P0–P2 are solid and never let it block social/dual-timeline ship. Still open. |

### Unverified at runtime (code complete, needs live `morsetime_dev` playtest)
These are implemented but the handoff flagged them as needing a real deployment to confirm:
- `runAs: 'USER'` comment posting for "Post my time" (Reddit spam/scope rules) — degrades gracefully via try/catch → toast.
- Daily **cron** actually fires and pins a fresh post (scheduler trigger support in this `@devvit/web` version).
- Streak increments across two real days; board rejects bad `elapsedMs`/token end-to-end.
- `prefers-reduced-motion` celebration guard + mobile in-feed keypad/scroll.

---

## Conclusion

**The plan's core scope (P0 + P1 + P2) is COMPLETE and the build is green (type-check + 66 tests).**
The only outstanding planned item is **P3.11 Choir**, which is intentionally a locked stretch goal
and does not block the "Games with a Hook" submission.

**Recommended next step before submitting:** deploy to `morsetime_dev` and run the live playtest
checklist (cron auto-post, "Post my time" comment, cross-day streak, anti-cheat rejection, mobile
in-feed) to close the "unverified at runtime" items above. Then produce submission assets
(Devpost, 2-min demo, screenshots) per the plan's Submission Assets section.
