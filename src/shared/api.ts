// Morse game types
export type DailyFrequency = {
  word: string;
  morse: string;
  charWpm: number;
  effectiveWpm: number;
};

export type DailyFrequencyResponse = {
  type: 'daily-frequency';
  date: string;
  /** One-time-per-day anti-cheat token (must be echoed on leaderboard submit). */
  token?: string;
  data: DailyFrequency;
};

/** One finished group in the rolling Pass window (last 10). */
export type PassGroupStat = {
  correct: number;
  attempts: number;
};

export type LessonState = {
  /** Highest unlocked / in-progress lesson (1–10). Strict sequential. */
  currentLesson: number;
  chars: string[];
  masteredChars: string[];
  totalCorrect: number;
  totalAttempts: number;
  /**
   * Groups in the current Pass window (0–10).
   * Equals `passRecentGroups.length` (capped at 10).
   */
  passGroupsCompleted: number;
  /** Sum of correct letter advances in the Pass window (last ≤10 groups). */
  passLetterCorrect: number;
  /** Sum of letter attempts in the Pass window. */
  passLetterAttempts: number;
  /** Rolling last-10 group letter stats for Pass accuracy. */
  passRecentGroups: PassGroupStat[];
  practiceStreakDays: number;
  lastPracticeDate: string;
  completedLessons: number[];
};

export type LessonStateResponse = {
  type: 'lesson-state';
  state: LessonState;
};

export type ProgressUpdate = {
  char: string;
  correct: boolean;
  latencyMs: number;
};

export type ProgressUpdateResponse = {
  type: 'progress-update';
  updated: boolean;
};

/** Client finished one lesson practice group (full correct copy). */
export type LessonGroupSubmitRequest = {
  lessonNumber: number;
  letterCorrect: number;
  letterAttempts: number;
  elapsedMs?: number;
};

export type LessonGroupSubmitResponse = {
  type: 'lesson-group';
  state: LessonState;
  /** True when this submit unlocked the next lesson. */
  lessonPassed: boolean;
  /** Accuracy % over the Pass window after this group (0–100), or null if no attempts. */
  accuracyPct: number | null;
};

/** Daily transmit board — ranked by fastest correct `elapsedMs` (then display WPM). */
export type LeaderboardEntry = {
  rank: number;
  username: string;
  elapsedMs: number;
  wpm: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  date: string;
  entries: LeaderboardEntry[];
  /** Current user's best for today, if any. */
  me: {
    rank: number;
    username: string;
    elapsedMs: number;
    wpm: number;
  } | null;
  /** Current user's consecutive daily-transmission streak. */
  streak: number;
  /** Distinct operators who transmitted today. */
  participants: number;
};

export type LeaderboardSubmitRequest = {
  /** Transmit duration from Start → full correct word (ms). */
  elapsedMs: number;
  /** Letter count used for effective WPM (no spaces). */
  letterCount: number;
  /** Anti-cheat token issued by GET /api/daily-frequency. */
  token?: string;
};

export type LeaderboardSubmitResponse = {
  type: 'leaderboard-submit';
  date: string;
  elapsedMs: number;
  wpm: number;
  rank: number;
  /** True when this run beat the user's previous best for the day. */
  improved: boolean;
  username: string;
  /** Current user's consecutive daily-transmission streak after this run. */
  streak: number;
};

/** Explicit user action: post score as a reply under the sticky board. */
export type ShareScoreRequest = {
  elapsedMs: number;
  wpm: number;
  rank: number;
  improved?: boolean;
};

export type ShareScoreResponse = {
  type: 'share-score';
  commentId: string;
  permalink: string;
};
