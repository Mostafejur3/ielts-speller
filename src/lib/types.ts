export type WordStatus = "new" | "learning" | "complete" | "review" | "weak";
export type Difficulty = "easy" | "medium" | "hard";
export type SessionMode = "learn" | "practice" | "test";

export interface Word {
  id: number;
  word: string;
  category: string;
  meaning: string;
  translation: string;
  pronunciation: string;
  difficulty: Difficulty;
  notes: string;
  tags: string[];
  status: WordStatus;
  bookmarked: boolean;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  reviewStage: number;
  lastPracticed: string | null;
  nextReview: string | null;
  createdAt: string;
  updatedAt: string;
  listIds: number[];
}

export interface Category {
  id: number;
  name: string;
}

export interface WordList {
  id: number;
  name: string;
  wordIds: number[];
}

export interface Settings {
  accent: "en-GB" | "en-US";
  voiceURI: string;
  rate: number;
  autoPlay: boolean;
  autoFocus: boolean;
  showShortcuts: boolean;
  darkMode: boolean;
  dailyGoal: number;
  strictMode: boolean;
  shuffleMode: boolean;
  showMeaning: boolean;
  showTranslation: boolean;
}

export interface DayStat {
  day: string;
  practiced: number;
  correct: number;
  wrong: number;
  mastered: number;
  minutes: number;
}

export interface Stats {
  totalWords: number;
  newWords: number;
  learning: number;
  completed: number;
  needReview: number;
  weak: number;
  bookmarked: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  todayPracticed: number;
  todayCorrect: number;
  todayWrong: number;
  streak: number;
  totalMinutes: number;
  dueForReview: number;
  neverPracticed: number;
  mastery: number;
  days: DayStat[];
}

export interface SessionConfig {
  mode: SessionMode;
  category: string;
  count: number | "all";
  source: "all" | "new" | "weak" | "review" | "bookmarked" | "complete" | "due" | "list";
  listId?: number;
  order: "random" | "az" | "smart";
  audio: "manual" | "auto";
}

export interface SessionItemResult {
  wordId: number;
  word: string;
  answer: string;
  correct: boolean;
  attempts: number;
}

export interface ImportRow {
  word: string;
  category?: string;
  meaning?: string;
  translation?: string;
  pronunciation?: string;
  difficulty?: string;
  notes?: string;
  tags?: string[] | string;
}

export interface ParsedImport {
  rows: ImportRow[];
  invalid: { line: number; reason: string; raw: string }[];
  duplicates: number[];
  source: string;
}

export const STATUS_LABEL: Record<WordStatus, string> = {
  new: "New",
  learning: "Learning",
  complete: "Complete",
  review: "Need Review",
  weak: "Weak",
};

export const STATUS_ORDER: WordStatus[] = ["new", "learning", "complete", "review", "weak"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
