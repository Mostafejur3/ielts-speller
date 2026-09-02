import type { Word, WordStatus } from "./types";

/** Spaced repetition intervals in days, keyed by status. */
export const REVIEW_INTERVALS: Record<WordStatus, number[]> = {
  new: [0],
  learning: [1],
  review: [1],
  weak: [0.25], // 6 hours — repeat frequently until performance improves
  complete: [3, 7, 14, 30],
};

/** Relative weight used when building a smart / random practice queue. */
export const STATUS_WEIGHT: Record<WordStatus, number> = {
  new: 1,
  learning: 1.5,
  review: 2,
  weak: 3,
  complete: 0.35,
};

const DAY = 86_400_000;

export function nextReviewDate(status: WordStatus, stage: number, from: Date = new Date()): Date {
  const table = REVIEW_INTERVALS[status];
  const days = status === "complete" ? table[Math.min(stage, table.length - 1)] : table[0];
  return new Date(from.getTime() + days * DAY);
}

export interface AnswerPatch {
  status: WordStatus;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  reviewStage: number;
  nextReview: string;
  lastPracticed: string;
  becameComplete: boolean;
}

type Pickable = Pick<
  Word,
  | "status"
  | "correctCount"
  | "wrongCount"
  | "consecutiveCorrect"
  | "consecutiveWrong"
  | "reviewStage"
>;

/**
 * Pure status / SRS transition engine. Shared by the client (optimistic UI)
 * and the server (source of truth) so both always agree.
 *
 *  New -> Learning -> Complete
 *  Complete -> Need Review (on mistake)
 *  Need Review -> Weak (on repeated mistakes)
 *  Weak -> Need Review -> Complete (on repeated correct answers)
 */
export function applyAnswer(input: Pickable, correct: boolean, now: Date = new Date()): AnswerPatch {
  let status: WordStatus = input.status;
  let consecutiveCorrect = input.consecutiveCorrect;
  let consecutiveWrong = input.consecutiveWrong;
  let reviewStage = input.reviewStage;
  let becameComplete = false;

  if (correct) {
    consecutiveCorrect += 1;
    consecutiveWrong = 0;
    if (status === "new") {
      status = consecutiveCorrect >= 2 ? "complete" : "learning";
    } else if (status === "learning") {
      status = consecutiveCorrect >= 2 ? "complete" : "learning";
    } else if (status === "weak") {
      status = consecutiveCorrect >= 2 ? "complete" : "review";
    } else if (status === "review") {
      status = consecutiveCorrect >= 2 ? "complete" : "review";
    }
    if (status === "complete") {
      reviewStage = input.status === "complete" ? Math.min(reviewStage + 1, 3) : 0;
      if (input.status !== "complete") becameComplete = true;
    } else {
      reviewStage = 0;
    }
  } else {
    consecutiveWrong += 1;
    consecutiveCorrect = 0;
    reviewStage = 0;
    if (status === "complete") status = "review";
    else if (status === "review") status = consecutiveWrong >= 2 ? "weak" : "review";
    else if (status === "learning") status = consecutiveWrong >= 2 ? "weak" : "review";
    else status = "review"; // brand new word missed -> needs attention
  }

  return {
    status,
    correctCount: input.correctCount + (correct ? 1 : 0),
    wrongCount: input.wrongCount + (correct ? 0 : 1),
    consecutiveCorrect,
    consecutiveWrong,
    reviewStage,
    nextReview: nextReviewDate(status, reviewStage, now).toISOString(),
    lastPracticed: now.toISOString(),
    becameComplete,
  };
}

export function accuracyOf(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function isDue(word: Pick<Word, "nextReview" | "status">, now: Date = new Date()): boolean {
  if (!word.nextReview) return true;
  return new Date(word.nextReview).getTime() <= now.getTime();
}

/** Weighted random selection: weak words surface far more often. */
export function weightedShuffle<T extends { status: WordStatus }>(items: T[], rng: () => number = Math.random): T[] {
  const keyed = items.map((item) => ({ item, key: Math.pow(rng(), 1 / STATUS_WEIGHT[item.status]) }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.map((k) => k.item);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Smart review ordering: due first, then weakest, then least practiced. */
export function smartSort(words: Word[]): Word[] {
  const now = Date.now();
  return words.slice().sort((a, b) => {
    const aDue = a.nextReview ? new Date(a.nextReview).getTime() : 0;
    const bDue = b.nextReview ? new Date(b.nextReview).getTime() : 0;
    const aOverdue = aDue <= now ? now - aDue : Number.MAX_SAFE_INTEGER;
    const bOverdue = bDue <= now ? now - bDue : Number.MAX_SAFE_INTEGER;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    const scoreA = STATUS_WEIGHT[a.status] * 100 - accuracyOf(a.correctCount, a.wrongCount);
    const scoreB = STATUS_WEIGHT[b.status] * 100 - accuracyOf(b.correctCount, b.wrongCount);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.lastPracticed ?? "").localeCompare(b.lastPracticed ?? "");
  });
}
