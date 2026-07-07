# UX Redesign: MorseTime on Reddit

## 1. Current Flow vs. Proposed Flow

**Current**: Play target → user taps along in real-time → result at end
**Proposed**: Countdown → listen → enter letter-by-letter → time-based score

---

## 2. Proposed Game Flow

### Phase 1: Countdown
- Show a large centered countdown: **3 → 2 → 1 → GO**
- Audio: short beep or tone pulse on each number, rising pitch on GO
- Duration: ~3 seconds total
- Prevents accidental starts and builds anticipation

### Phase 2: Target Playback
- Play the full word once at the selected WPM
- Visual: waveform scrolls automatically, playhead moves
- User cannot input during this phase — pure listening
- After playback ends, show a "Your turn" prompt

### Phase 3: Letter-by-Letter Entry
- User enters one character at a time
- Display shows:
  - **Target word** (hidden or revealed? — recommend hidden for challenge)
  - **Current letter index** (e.g., "Letter 2 of 5")
  - **User's decoded text so far** (e.g., "PAR..")
- Input: tap canvas or press key for each dit/dah
- After each letter, show immediate feedback:
  - Green flash + chime = correct
  - Red flash + buzz = incorrect, show what they sent vs. target
- Auto-advance to next letter after correct entry or after a timeout

### Phase 4: Scoring & Results
- **Time-based score**: total seconds from first input to last correct letter
- **WPM calculation**: `(charCount / timeSeconds) * 60`
- **Accuracy**: percentage of letters entered correctly on first try
- **Grade**: S/A/B/C/D based on combined speed + accuracy
- Display: time, WPM, accuracy, grade, and a replay button

---

## 3. Audio Changes Needed

1. **Countdown audio**: distinct tones for each number
2. **Letter feedback**: short chime (correct) / buzz (incorrect) per letter
3. **Completion fanfare**: ascending arpeggio for S rank, simple ding for pass
4. **Silence during entry**: no auto-playback while user is thinking

---

## 4. Display Changes Needed

1. **Countdown overlay**: full-screen centered numbers with pulse animation
2. **Letter progress indicator**: dots or boxes filling in as user progresses
3. **Timer display**: subtle running timer in corner during entry phase
4. **Per-letter feedback**: brief color flash on the letter just entered

---

## 5. Why This Works Better

- **Reduces cognitive load**: user focuses on one letter at a time instead of tracking the whole sequence
- **Clearer feedback**: immediate per-letter correction is more actionable than end-of-sequence feedback
- **Fairer scoring**: time-based WPM rewards efficiency, not just accuracy
- **More engaging**: countdown + phased flow feels like a real test/exam
- **Better for Reddit**: shorter, more intense sessions fit the Reddit attention span

---

## 6. Reddit-Specific Enhancements

### 6.1 Engagement Loop
- **Daily challenge**: same word for everyone, posted by mods each day
- **Streak tracking**: consecutive days played, displayed on post flair
- **Personal bests**: best WPM/accuracy per user, stored in Redis
- **Replay value**: "Try Again" button encourages multiple attempts per day

### 6.2 Achievements & Badges
- **Speed badges**: "Lightning" (30+ WPM), "Speed Demon" (20+ WPM), "Steady" (15+ WPM)
- **Accuracy badges**: "Sharpshooter" (100% accuracy), "Consistent" (95%+)
- **Streak badges**: "Week Warrior" (7-day streak), "Monthly Master" (30-day streak)
- **Special badges**: "First Transmission", "Century Club" (100 total letters decoded)
- Display: badges shown on result screen and in user profile (if Reddit profile integration is possible)

### 6.3 Challenges
- **Daily challenge**: same word for all players, leaderboard at end of day
- **Speed run**: beat your personal best WPM
- **Accuracy run**: perfect score on a longer word
- **Night mode**: play with reduced visibility (hides target word longer)
- **Reverse mode**: user sends the word, system decodes and verifies

### 6.4 Leaderboards
- **Daily leaderboard**: top 10 WPM scores for today's word
- **All-time leaderboard**: top 100 scores across all words
- **Friends leaderboard**: if Reddit friend system is accessible
- Display: compact table in post comments or a sticky comment by the mod bot
- Update frequency: real-time for daily, daily for all-time

### 6.5 Social Features
- **Share result**: button to copy score as a Reddit comment template
- **Challenge a friend**: tag another user to beat your score
- **Team scores**: subreddit-wide average WPM displayed in sidebar
- **Mod announcements**: mods can pin top scores or challenge words

### 6.6 Progression System
- **Koch method**: unlock new characters as you master previous ones (already partially implemented in [`curriculum.ts`](src/shared/curriculum.ts))
- **Level system**: XP based on letters decoded, time played, accuracy
- **Titles**: "Radio Operator", "Telegraphist", "Master of Morse"
- **Unlockables**: new visual themes, audio filters, canvas colors

---

## 7. Implementation Notes

- Add `GamePhase` type: `'countdown' | 'listening' | 'entry' | 'result'`
- Refactor `playSequence` into `playTarget()` (listening phase) and `startEntry()` (user input phase)
- Track `entryStartTime` and `letterStartTime` for timing
- Add `currentLetterIndex` state
- Keep existing waveform viz but add a "current letter highlight" mode

---

## 8. Open Questions

1. **Should the target word be hidden during entry?** 
   - Pro: harder, more realistic
   - Con: frustrating for beginners
   - Compromise: reveal first letter, hide rest

2. **Should there be a time limit per letter?**
   - Pro: adds pressure, prevents overthinking
   - Con: stressful, may discourage beginners
   - Compromise: soft timeout that shows target letter after 10s

3. **How should leaderboards be displayed?**
   - Option A: sticky comment by mod bot
   - Option B: inline in the post body (updated via edit)
   - Option C: separate wiki page
   - Recommendation: sticky comment for daily, wiki for all-time

4. **Should achievements be Reddit-specific (flairs, awards) or in-app only?**
   - Reddit flairs require mod setup
   - In-app badges are easier to implement
   - Compromise: both — in-app badges + optional flair assignment by mod bot

5. **How to handle cheating / fake scores?**
   - Server-side validation of timing
   - Rate-limit score submissions
   - Mod tools to remove suspicious scores
