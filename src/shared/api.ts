// Legacy counter types (used by existing template hook)
export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

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
  data: DailyFrequency;
};

export type LessonState = {
  currentLesson: number;
  chars: string[];
  masteredChars: string[];
  totalCorrect: number;
  totalAttempts: number;
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

export type LeaderboardEntry = {
  username: string;
  wpm: number;
  lesson: number;
  date: string;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
};
