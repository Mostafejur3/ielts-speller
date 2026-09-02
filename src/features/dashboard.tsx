"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/store/app-store";
import { ActivityBars } from "@/components/charts";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import {
  IconArrowRight,
  IconBookmark,
  IconCheck,
  IconFlame,
  IconHeadphones,
  IconLibrary,
  IconPen,
  IconRepeat,
  IconSpark,
  IconTarget,
  IconUpload,
  IconX,
} from "@/components/icons";
import { accuracyOf } from "@/lib/srs";
import { relativeTime } from "@/lib/stats";
import type { WordStatus } from "@/lib/types";

const SEGMENTS: { status: WordStatus; label: string; className: string }[] = [
  { status: "complete", label: "Complete", className: "bg-ok" },
  { status: "learning", label: "Learning", className: "bg-warn" },
  { status: "review", label: "Need review", className: "bg-brand" },
  { status: "weak", label: "Weak", className: "bg-danger" },
  { status: "new", label: "New", className: "bg-info/50" },
];

export function Dashboard() {
  const { words, stats, settings, mistakes, ready } = useStore();

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; complete: number; weak: number }>();
    for (const w of words) {
      const entry = map.get(w.category) ?? { total: 0, complete: 0, weak: 0 };
      entry.total += 1;
      if (w.status === "complete") entry.complete += 1;
      if (w.status === "weak") entry.weak += 1;
      map.set(w.category, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, pct: v.total ? Math.round((v.complete / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [words]);

  const activity = stats.days.slice(-7).map((d) => ({
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" }),
    value: d.practiced,
  }));

  const goalPct = settings.dailyGoal ? Math.min(100, Math.round((stats.todayPracticed / settings.dailyGoal) * 100)) : 0;
  const todayAccuracy = accuracyOf(stats.todayCorrect, stats.todayWrong);

  if (!ready) return null;

  if (words.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconUpload size={22} />}
          title="No words yet"
          description="Spelling Lab learns from your own vocabulary. Import a JSON, CSV or TXT list to build your IELTS word bank."
          action={
            <Link href="/import">
              <Button variant="primary" size="lg">
                Import words
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- goal row */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0 grid-paper opacity-40" aria-hidden="true" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="brand">
                  <IconTarget size={11} /> Daily goal
                </Badge>
                <p className="font-display mt-2 text-[clamp(2rem,6vw,2.75rem)] leading-none font-extrabold text-ink">
                  {stats.todayPracticed}
                  <span className="text-muted"> / {settings.dailyGoal}</span>
                </p>
                <p className="mt-1.5 text-[13px] text-muted">
                  words practiced today · {todayAccuracy}% accuracy ·{" "}
                  <span className="font-semibold text-accent">{stats.streak}-day streak</span>
                </p>
              </div>
              <div className="text-right">
                <p className="tabular font-display text-3xl font-bold text-brand">{goalPct}%</p>
                <p className="text-[11px] tracking-[0.06em] text-muted uppercase">of goal</p>
              </div>
            </div>
            <ProgressBar value={goalPct} tone={goalPct >= 100 ? "ok" : "brand"} size="lg" className="mt-4" />

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction href="/practice" label="Continue Practice" icon={<IconPen size={16} />} primary />
              <QuickAction href="/practice?source=weak" label="Weak Words" icon={<IconSpark size={16} />} count={stats.weak} />
              <QuickAction href="/review" label="Review Today" icon={<IconRepeat size={16} />} count={stats.dueForReview} />
              <QuickAction href="/test?count=10" label="Random Test" icon={<IconTarget size={16} />} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Mastery" hint="Share of your library by status" />
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-3">
            {SEGMENTS.map((seg) => {
              const count = words.filter((w) => w.status === seg.status).length;
              const pct = words.length ? (count / words.length) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={seg.status}
                  className={cnStrip(seg.className)}
                  style={{ width: `${pct}%` }}
                  title={`${seg.label}: ${count}`}
                />
              ) : null;
            })}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {SEGMENTS.map((seg) => {
              const count = words.filter((w) => w.status === seg.status).length;
              return (
                <li key={seg.status} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className={cnStrip(`h-2 w-2 rounded-full ${seg.className}`)} />
                    {seg.label}
                  </span>
                  <span className="tabular font-semibold text-ink">{count}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted">7-day activity</span>
              <Link href="/stats" className="text-[12px] font-semibold text-brand hover:underline">
                All stats
              </Link>
            </div>
            <div className="mt-2">
              <ActivityBars data={activity} height={64} />
            </div>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total words" value={stats.totalWords} icon={<IconLibrary size={15} />} tone="brand" />
        <StatTile label="New" value={stats.newWords} hint="not practiced" tone="info" />
        <StatTile label="Learning" value={stats.learning} hint="in progress" tone="warn" />
        <StatTile label="Completed" value={stats.completed} hint={`${stats.mastery}% mastered`} tone="ok" icon={<IconCheck size={15} />} />
        <StatTile label="Need review" value={stats.needReview} hint={`${stats.dueForReview} due`} tone="brand" />
        <StatTile label="Weak" value={stats.weak} hint="priority drill" tone="danger" icon={<IconX size={15} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-3">
          <Link href="/bookmarks" className="block">
          <StatTile label="Bookmarked" value={stats.bookmarked} icon={<IconBookmark size={15} />} tone="accent" className="h-full" />
        </Link>
          <StatTile label="Today's practice" value={stats.todayPracticed} hint={`goal ${settings.dailyGoal}`} tone="brand" />
          <StatTile label="Today's accuracy" value={`${todayAccuracy}%`} hint={`${stats.todayCorrect}✓ ${stats.todayWrong}✗`} tone={todayAccuracy >= 70 ? "ok" : "warn"} />
          <StatTile label="Streak" value={`${stats.streak}d`} icon={<IconFlame size={15} />} tone="accent" hint="keep it alive" />
          <StatTile label="Total correct" value={stats.totalCorrect} tone="ok" />
          <StatTile label="Total wrong" value={stats.totalWrong} tone="danger" />
        </div>

        <Card className="p-4">
          <SectionTitle title="Recently wrong" hint="Fresh mistakes to re-drill" />
          {mistakes.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">No mistakes recorded yet. Nice.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {mistakes.slice(0, 6).map((m, i) => (
                <li key={`${m.word}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                  <span className="truncate text-[13px] font-medium text-ink">{m.word}</span>
                  <span className="truncate text-[12px] text-danger line-through">{m.answer || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/review" className="mt-3 inline-flex">
            <Button size="sm" variant="ghost" trailing={<IconArrowRight size={14} />}>
              Open review
            </Button>
          </Link>
        </Card>
      </div>

      {/* -------------------------------------------------------- categories */}
      <Card className="p-4 sm:p-5">
        <SectionTitle
          title="Categories"
          hint="Progress per topic"
          action={
            <Link href="/library">
              <Button size="sm" variant="ghost" trailing={<IconArrowRight size={14} />}>
                Library
              </Button>
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryStats.slice(0, 6).map((c) => (
            <Link
              key={c.name}
              href={`/practice?category=${encodeURIComponent(c.name)}`}
              className="group rounded-card border border-line bg-surface-2 p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display truncate text-[14.5px] font-semibold text-ink">{c.name}</p>
                <Badge tone={c.pct >= 70 ? "ok" : "neutral"}>{c.pct}%</Badge>
              </div>
              <ProgressBar value={c.pct} tone={c.pct >= 70 ? "ok" : "brand"} size="sm" className="mt-2.5" />
              <p className="mt-2 text-[12px] text-muted">
                {c.total} words · {c.complete} complete
                {c.weak > 0 && <span className="text-danger"> · {c.weak} weak</span>}
              </p>
            </Link>
          ))}
        </div>
      </Card>

      {/* ------------------------------------------------------------- learn */}
      <Card className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <IconHeadphones size={19} />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold text-ink">Learn mode</p>
            <p className="text-[12.5px] text-muted">
              {stats.neverPracticed} words never practiced · last session{" "}
              {mistakes[0] ? relativeTime(mistakes[0].createdAt) : "—"}
            </p>
          </div>
        </div>
        <Link href="/learn" className="w-full sm:w-auto">
          <Button variant="secondary" block trailing={<IconArrowRight size={15} />}>
            Start learning
          </Button>
        </Link>
      </Card>
    </div>
  );
}

function cnStrip(cls: string) {
  return cls;
}

function QuickAction({
  href,
  label,
  icon,
  count,
  primary = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-[.98] ${
        primary
          ? "border-transparent bg-brand text-brand-contrast hover:bg-brand-hover"
          : "border-line bg-surface text-ink hover:border-brand/40 hover:text-brand"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span className={`tabular rounded-full px-1.5 py-0.5 text-[11px] ${primary ? "bg-brand-contrast/20" : "bg-surface-3 text-muted"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}
