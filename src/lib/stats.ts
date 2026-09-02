import { accuracyOf } from "./srs";
import type { DayStat, Stats, Word } from "./types";

export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function deriveStats(words: Word[], days: DayStat[]): Stats {
  const now = new Date();
  const today = localDay(now);
  const byDay = new Map(days.map((d) => [d.day, d]));

  const count = (s: Word["status"]) => words.filter((w) => w.status === s).length;
  const totalCorrect = words.reduce((sum, w) => sum + w.correctCount, 0);
  const totalWrong = words.reduce((sum, w) => sum + w.wrongCount, 0);
  const completed = count("complete");

  const window: DayStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = localDay(d);
    const row = byDay.get(key);
    window.push({
      day: key,
      practiced: row?.practiced ?? 0,
      correct: row?.correct ?? 0,
      wrong: row?.wrong ?? 0,
      mastered: row?.mastered ?? 0,
      minutes: row?.minutes ?? 0,
    });
  }

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const key = localDay(new Date(now.getTime() - i * 86_400_000));
    const row = byDay.get(key);
    if (row && row.practiced > 0) streak++;
    else if (i === 0) continue;
    else break;
  }

  const todays = byDay.get(today);

  return {
    totalWords: words.length,
    newWords: count("new"),
    learning: count("learning"),
    completed,
    needReview: count("review"),
    weak: count("weak"),
    bookmarked: words.filter((w) => w.bookmarked).length,
    totalCorrect,
    totalWrong,
    accuracy: accuracyOf(totalCorrect, totalWrong),
    todayPracticed: todays?.practiced ?? 0,
    todayCorrect: todays?.correct ?? 0,
    todayWrong: todays?.wrong ?? 0,
    streak,
    totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
    dueForReview: words.filter(
      (w) => !w.nextReview || new Date(w.nextReview).getTime() <= now.getTime(),
    ).length,
    neverPracticed: words.filter((w) => w.correctCount + w.wrongCount === 0).length,
    mastery: words.length ? Math.round((completed / words.length) * 100) : 0,
    days: window,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${`${s}`.padStart(2, "0")}s`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
