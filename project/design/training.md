# Training hub (expanded surface)

**Path:** `project/design/training.md`  
**Status:** Product locked 2026-07-10; free intro + platform split updated same day  
**Surface:** Expanded entry `game.html` / `game.tsx` — **not** the feed daily race  
**Related:** [ux.md](./ux.md) · [new.md](./new.md) · [../agent/DECISIONS.md](../agent/DECISIONS.md)

**Repo boundary:** This repository is the **Reddit Devvit app only**. Full web/mobile curriculum, other games, and account LMS live in **separate products** (e.g. morsetime.com). Design may mention web for funnel clarity; **do not add web app code here**.

---

## 0. Platform context (critical)

| Product | Role | Codebase |
|---------|------|----------|
| **Reddit app** (this repo) | **Game with extras** — daily race, board, **free intro lessons only** | `MorseTime` Devvit |
| **Website** | **Full training** + other games, stats, account | **Separate** (not this repo) |
| **Mobile** | Full product (later) | **Separate** |

Reddit stays iframe-friendly and session-short. After the free intro: drill those letters, play daily, **Full training on the web →**.

---

## 1. Product split (within Reddit)

| Surface | Role | Entry |
|---------|------|--------|
| **Feed (splash)** | Daily **game** — “Today’s Frequency” + board | `splash.html` (inline) |
| **Expanded hub** | **Extras** — free intro lessons, light challenges | `game.html` via expand CTA |

| Copy | Value |
|------|--------|
| Feed CTA (in-app) | **Practice →** → expanded hub |
| Feed (main page) | **No** outbound web training link |
| Expanded | **Full training on the web →** → `https://morsetime.com` |
| Daily title | **Today’s Frequency** |

---

## 2. Locked choices

| # | Decision |
|---|----------|
| 1 | **Free intro only on Reddit** — see §2.1 (not a full alphabet course) |
| 2 | Splash remains daily; **Practice →** hub only (no lesson UI on feed) |
| 3 | Hub: continue + **4 lesson tiles** + daily + web CTA |
| 4 | Unlock: **strict sequential** Pass gate |
| 5 | Progress: **per-user Redis** |
| 6 | **No web curriculum implementation in this repo** |

### 2.1 Free intro curriculum (locked)

| Item | Value |
|------|--------|
| **Free lessons** | **4** |
| **Free letters** | **5** — **K, M, R, S, U** |
| Lesson 1 | **2 letters:** K M |
| Lessons 2–4 | **+1 letter each:** R, then S, then U |
| After lesson 4 | Intro complete — no lesson 5 in-app; optional drill on KMRSU; strong web CTA |
| Web free tier (product, not this repo) | Same **4 / 5** recommended for a single funnel story |
| Web full path | +1 letter per step after U — **owned by web product** |

```text
1  K M          (2 letters)
2  + R          (3)
3  + S          (4)
4  + U          (5)  ← free / Reddit training ends
─── full path on morsetime.com (separate codebase) ───
```

**Implementation:** `src/shared/curriculum.ts` matches these **4 steps** (`FREE_LESSON_STEPS` / `FREE_LETTER_COUNT`).

---

## 3. Hub IA (Reddit)

```text
┌─────────────────────────────────────────┐
│  Practice              streak            │
├─────────────────────────────────────────┤
│  Continue                               │
│  Lesson 2 · Add R              [Resume] │
│  Pass 6/10 · Accuracy 92% · need 90%    │
├─────────────────────────────────────────┤
│  Lessons  1● 2▶ 3○ 4○                   │  ← only 4 free steps
├─────────────────────────────────────────┤
│  Challenges                             │
│  · Today's Frequency                    │
│  · Full training on the web →           │
├─────────────────────────────────────────┤
│  After intro: “Intro complete” + web    │
│  footer (morsetime.com · …)             │
└─────────────────────────────────────────┘
```

**Lesson session** (this app): same as daily —

`listen → ready → Start → letter-by-letter key → result (ms)`

+ large ·/− sound indicator in practice. Groups from lesson `cumulative`.

---

## 4. Lessons (free intro, strict)

### 4.1 Data (product target)

Four steps only in this app — see §2.1. Do **not** implement the full web ladder here.

### 4.2 Session generation

| Phase | Behavior |
|-------|----------|
| Introduce (nice-to-have) | 2–4 single-char listens of each **new** char |
| Groups | Random length **2–5** from `cumulative`, **bias newChars** (~60%) |
| Not this | Fixed “2 letters × 10 identical reps” |

One **group** = listen → Start → key → result (same as daily).

### 4.3 Pass gate (strict unlock) — locked

**Only two user-facing requirements.** No separate “30 attempts” floor in product or UX  
(group length 2–5 naturally yields plenty of letter decisions).

| Requirement | Rule |
|-------------|------|
| **Groups** | Complete **10 scored groups** in lesson *N* |
| **Accuracy** | **≥ 90% letter accuracy** over those groups (correct letters / letters attempted) |

Unlock lesson *N+1* only when **all** of:

1. User’s current lesson is *N* (strict sequential)
2. Pass criteria above are met for lesson *N*
3. **Server** validates and advances (client cannot skip)

**If 10/10 groups done but accuracy &lt; 90%:** do **not** unlock. Keep accepting groups; accuracy is a **live rolling or cumulative** session metric with clear copy, e.g.:

> 10/10 groups · 87% accuracy — need 90%. Keep practicing; accuracy updates live.

**Recommended accuracy window (implementation):** accuracy computed over **all scored groups in this lesson attempt toward Pass**, or over the **last 10 groups** once they have 10+ — pick one and keep UI label honest (`Session` vs `Last 10`). Prefer **last 10 groups** so recovery is always possible without a reset button.

#### Always-visible progress (required — avoid “broken” feel)

During lesson play and on the hub continue card, show **both** meters at all times:

```text
Pass  6/10 groups
Accuracy  92%  ·  need 90%
```

Locked next lesson tooltip / subtitle:

> Clear Lesson N first — finish **10 groups** at **90%+** accuracy.

Never refuse unlock without explaining **what’s left**. Never hide a second silent threshold.

#### What counts as a scored group

- User completes the full keying of the target string (all letters matched) **or** we count every letter attempt in that run toward accuracy even if they retry letters mid-group (prefer: **each letter’s first successful match + any wrong buffers** — simplest ship: **letters advanced correctly / total letter slots in completed groups only**, and only **completed** groups increment 1/10).
- **Ship-simple rule:** A group scores when the user finishes the word correctly (same as daily result).  
  - `groupsCompleted += 1`  
  - Letter accuracy for that group = 100% for the clear path if we only complete on full correct word…  

**Important:** Daily loop only finishes on full correct copy, so per-group letter accuracy is always 100% unless we also count **errors before success** (wrong letter buffers).

**Locked scoring for accuracy (must implement):**

- On each **wrong letter buffer** (clear current letter): `letterAttempts += 1`, no correct  
- On each **correct letter advance**: `letterAttempts += 1`, `letterCorrect += 1`  
- Accuracy = `letterCorrect / letterAttempts` over the Pass window  
- Group counter += 1 only when the **full group** is completed  

So mistakes matter; users aren’t at permanent 100%.

### 4.4 Achievement tiers (engagement — do not block unlock)

**Pass** unlocks the next lesson. Higher tiers are prestige only (badges, hub flair, replay motive).

| Tier | Name | Criteria | Unlocks N+1? |
|------|------|----------|----------------|
| **Pass** | Cleared | 10 groups + ≥90% letter accuracy (§4.3) | **Yes** |
| **Solid** | Solid | ≥20 groups in lesson @ ≥95% (last 20 or lifetime lesson stats) | No |
| **Sharp** | Sharp fist | Pass + effective WPM ≥ threshold (e.g. 12) on best/average group | No |
| **Clean** | Clean run | 5 groups in a row with **zero** wrong-letter buffers | No |
| **Blind** | Head copy | Meet Pass criteria with plaintext hidden (mode unlock after lesson ≥3) | No |

Account milestones (hub): first lesson, lesson 5, all 10, practice streak 3/7/30.

Show earned tiers on the lesson tile (e.g. stars or chips). Replaying a cleared lesson is always allowed.

### 4.5 Progress API (per user)

Replace `progress:${postId}` with user-scoped keys:

```text
progress:user:{userId}           # LessonState + streak fields
char:user:{userId}:{char}        # per-char mastery
```

Identity: same as leaderboard — `context.userId` / `resolveUsername()` / `resolveMemberId`. Anonymous may practice locally but **must not** advance durable unlocks (or store under a disposable key and discard).

Extend `LessonState` as needed:

```ts
type LessonState = {
  currentLesson: number;      // highest unlocked / in-progress (1–4 free intro)
  chars: string[];            // cumulative for current
  masteredChars: string[];
  totalCorrect: number;       // letter-level
  totalAttempts: number;      // letter-level
  // Pass progress (current lesson)
  passGroupsCompleted: number;  // 0–10 toward Pass
  passLetterCorrect: number;
  passLetterAttempts: number;
  // retention
  practiceStreakDays: number;
  lastPracticeDate: string;   // YYYY-MM-DD UTC
  lessonBestMs: Record<string, number>; // lessonNumber → best group ms
  completedLessons: number[]; // fully Passed
  lessonTiers: Record<string, string[]>; // lessonNumber → ['pass','solid',…]
};
```

---

## 5. Retention systems (hub)

Prioritize what keeps people opening the app **between** daily races.

| Feature | Loop | Why it retains |
|---------|------|----------------|
| **Practice streak** | Any training activity (lesson group or drill) updates `lastPracticeDate` / streak | Habit beyond daily race alone |
| **Continue card** | One-tap resume current lesson | Reduces friction |
| **Daily Frequency in hub** | Same word + can submit to same board | Bridge race ↔ training |
| **Daily drill challenge** | Fixed short goal (e.g. 5 correct groups or 3 minutes) on today’s unlocked set | Finishable session |
| **Intro complete** | After lesson 4 Pass — celebrate + web CTA | Funnel without more in-app lessons |
| **Milestones (light)** | First lesson, intro complete, practice streak | Keep simple on Reddit |

**Out of daily leaderboard:** lesson times do **not** rank on the public daily board.

**Web-only (separate product):** weak-letter lab, blind mode, full badges, other games — not built here.

### Challenge catalog (Reddit v1)

1. **Today’s Frequency** — daily race  
2. **Free intro lessons** (4 steps)  
3. Optional later: **quick drill** on free letters only  
4. **Full training on the web →**

---

## 6. Client structure (implementation sketch)

```text
game.tsx
  └─ TrainingApp
       ├─ Hub view (lessons grid, challenges, continue)
       ├─ LessonPlay view  → shared KeyingSession / DailyChallenge props
       ├─ DrillPlay view   → same
       └─ DailyPlay view   → DailyChallenge variant=expanded (optional board)
```

Prefer extracting the play surface from `DailyChallenge` into a shared **`KeyingSession`** (target word, title, onResult, showExpand=false) so splash and training do not diverge.

Splash changes: CTA label + `requestExpandedMode(..., 'game')` only.

---

## 7. Reddit vs website (product map only — web is separate code)

| Feature | Reddit (this repo) | Website (separate) |
|---------|-------------------|---------------------|
| Daily Frequency + board | **Primary** | Optional mirror |
| Share to Reddit | **Primary** | Optional |
| Keying loop design | Yes | Can reuse *ideas*, own implementation |
| Lessons | **Free intro only (4 / 5 letters)** | Full +1 path + more |
| Other games | Out / link out | **Primary** |
| Weak-letter, blind, deep stats | Out or minimal | **Primary** |
| Web app source | **Not in this repo** | Own codebase |

---

## 8. Implementation order (Reddit only)

| Priority | Work |
|----------|------|
| Done | Hub, lesson runner, Pass, ·/− indicator, web CTA, **free intro 4/5** |
| P1 | Quick drill mode on free letters only |
| P2 | Mobile polish |

---

## 9. Explicit non-goals (this repo)

- Implementing **morsetime.com** or mobile apps here  
- Full alphabet / 10–40 lesson LMS in the Reddit iframe  
- Web curriculum data structures “for later” that bloat shared code  
- Skipping free intro / free unlock of everything  
- Replacing splash daily game with hub  

---

## 10. Open implementation details (Reddit)

1. Accuracy window: prefer **last 10 groups** for recovery (Pass)  
2. Group length / new-char bias (~60%)  
3. Compact board on hub daily vs omit  
4. Anonymous progress UX  
