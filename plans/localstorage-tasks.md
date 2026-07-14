# MorseTime — localStorage Tasks (prefs/UX only)

**Generated:** 2026-07-14
**Scope:** Client-side `localStorage` preference/UX tasks. **Excludes** Visual (theme/glow/AM)
and Cache (leaderboard snapshot) ideas. Authoritative data (streak, progress, scores) stays in
Redis — never mirror it here.

**Convention:** namespace all keys `morsetime-*` (matches existing `morsetime-tutorial-dismissed`).
Add a small `src/client/lib/storage.ts` helper (`getFlag`/`setFlag`/`getJSON`/`setJSON`) so reads
fail safe (private-mode / quota) and stay consistent. Wrap every read in try/catch.

**Expanded mode note:** `isExpanded = variant === 'expanded'`; triggered by the inline "Practice →"
button calling `requestExpandedMode(e, 'game')` (`splash.tsx:41`). Some toggles below should show in
both `inline` and `expanded` variants where noted.

## Status (updated 2026-07-14)
- **L0** storage helper — **DONE** (`src/client/lib/storage.ts`: `readString`/`writeString`/
  `readNumber`/`writeNumber`/`readFlag`/`writeFlag`, all try/catch wrapped).
- **L2** audio mute/volume — **REMOVED** (user opted out). Reverted `AudioEngine` to constant
  `PEAK`; removed `setVolume`/`setMuted`/`effectivePeak` and the `DailyChallenge` Audio pill +
  Volume slider. Keys `morsetime-audio-volume` / `morsetime-audio-muted` no longer used.
- **L3** preferred listen WPM — **DONE** (`listenWpm` initialized from + written to
  `morsetime-listen-wpm`).
- **L7** per-tip dismiss — **DONE** (explicit "Don't show again" button + existing auto-dismiss on
  result; key `morsetime-splash-tip-dismissed-v2`).
- Still **TODO:** L1 (blind mode), L4 (keyer threshold), L5 (wide spacing), L6 (reduced-motion
  override), L8 (tutorial step), L9 (seen-today flag).
- Verified: `npm run type-check` green, `npm test` 66 passed.

---

## L1 — Persist blind mode  [TODO]
- **Why:** P2.8 asked to persist it; today `blindMode` is session `useState(false)` and resets on reload.
- **Key:** `morsetime-blind-mode` (`'1'`/`'0'`).
- **Do:** on mount read flag → initial `useState`; on toggle write flag. Keep the header pill (currently `isExpanded`-only — consider showing in `inline` too since it's an accessibility pref).
- **Files:** `src/client/components/DailyChallenge.tsx` (~233, 868).

## L2 — Audio mute / volume  [REMOVED — not wanted]
- **Why:** Audio-first app; reload resets volume each visit.
- **Key:** `morsetime-audio-muted`, `morsetime-audio-volume` (0–1 number as string).
- **Do:** read on `AudioEngine.init()` / mount; add a mute button + volume slider near the listen control; write on change. `AudioEngine` already exposes `PEAK` gain — route volume through a stored multiplier.
- **Files:** `AudioEngine.ts` (gain), `DailyChallenge.tsx` (controls), new `MorseCheatSheet`? no — new control group.

## L3 — Preferred listen WPM  [DONE]
- **Why:** `activeListenWpm` resets to default each load; returning players have a comfort speed.
- **Key:** `morsetime-listen-wpm`.
- **Do:** persist last-used listen WPM; preselect it on next load. Reuse the existing WPM control if present, else add a small stepper.
- **Files:** `DailyChallenge.tsx` (listen speed state).

## L4 — Keyer dit/dah threshold
- **Why:** threshold is hardcoded ~150ms; players with different input/hand speed benefit from tuning.
- **Key:** `morsetime-keyer-threshold` (ms).
- **Do:** add a settings control (slider, e.g. 80–300ms); use it in the hold-duration classification that decides dit vs dah; persist. Keep a sensible default so first-run behavior is unchanged.
- **Files:** keyer logic in `DailyChallenge.tsx` / `TouchInput`; wherever the ~150ms compare happens.

## L5 — Wide letter spacing / "first-play" reset
- **Why:** `wideLetterSpacing` + `hasPlayedOnce` are in-memory; persisting lets spacing preference survive reloads and lets a user reset the "wide gaps for beginners" aid.
- **Key:** `morsetime-wide-spacing` (`'1'`/`'0'`), `morsetime-has-played` (`'1'`/`'0'`).
- **Do:** read on mount for initial spacing; expose a "use wide gaps" toggle; `hasPlayedOnce` can stay session, but if we want the beginner aid to re-trigger, persist a resettable flag.
- **Files:** `DailyChallenge.tsx` (spacing state, listen hint at ~1089–1098).

## L6 — Manual reduced-motion override
- **Why:** `reduceMotion` is read from OS `matchMedia` only; some users want to force it on/off regardless of OS.
- **Key:** `morsetime-reduced-motion` (`'on'`/`'off'`/`'auto'`).
- **Do:** read flag; if not `'auto'`, override the `matchMedia` result used at `DailyChallenge.tsx:234–239, 395–396`. Keep `'auto'` (OS) as default so current behavior is preserved.
- **Files:** `DailyChallenge.tsx` (reduceMotion derivation).

## L7 — Per-tip "don't show again"  [DONE]
- **Why:** existing `showTip` hints can annoy repeat users; no dismiss-memory today.
- **Key:** `morsetime-tip:<tipId>` (`'1'` = dismissed) — one key per tip id.
- **Do:** the `showTip` helper should check the flag before rendering and offer a "Don't show again" action that sets it. Centralize tip ids.
- **Files:** where `showTip` is defined/used (search `showTip` in `src/client`).

## L8 — Tutorial step reached / dismissed
- **Why:** tutorial overlay currently only stores a binary dismissed flag; if it becomes multi-step, persist progress so a reload doesn't restart it.
- **Key:** `morsetime-tutorial-step` (number), keep `morsetime-tutorial-dismissed`.
- **Do:** if tutorial stays single-step, no change needed beyond L-? (already done). If multi-step is added later, write the current step on advance and resume from it on mount.
- **Files:** `DailyChallenge.tsx` (~375, 805–832), `MorseCheatSheet.tsx`.

## L9 — "Seen today's word" streak reminder flag
- **Why:** drive a lightweight "play today to keep your streak" nudge in the inline view without a server round-trip.
- **Key:** `morsetime-seen-word:<YYYY-MM-DD>` (`'1'`).
- **Do:** set when a daily transmit completes; on inline load, if today's flag is absent and `streak>0`, show a subtle reminder. Purely client; server streak remains source of truth. Must not block or fake the streak.
- **Files:** `DailyChallenge.tsx` (result handler + inline header), `splash.tsx`.

---

## Out of scope (explicitly excluded per request)
- **Visual:** theme/CRT-glow/AM-level prefs.
- **Cache:** short-lived `GET /api/leaderboard` snapshot.

## Suggested order
1. Add `src/client/lib/storage.ts` helper first (L0) — everything else depends on it.
2. L1 (blind mode) — smallest, already planned, high value.
3. L2/L3/L4/L5 — audio + input comfort prefs (core to the audio-first experience).
4. L6 (reduced-motion override) — accessibility.
5. L7 (tips) — polish.
6. L8/L9 — only if tutorial expands / reminder is wanted.

## Validation
- Each: toggle in UI → reload page → preference persists; clear the key → default restored.
- `npm run type-check` + `npm test` stay green.
- Private-mode/quota errors swallowed (no console crashes).
- No authoritative data written to `localStorage`.
