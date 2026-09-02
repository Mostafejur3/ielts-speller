"use client";

import { useMemo } from "react";
import { useStore } from "@/store/app-store";
import { ActivityBars, TrendLine } from "@/components/charts";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import { IconChart, IconCheck, IconClock, IconFlame, IconTarget, IconX } from "@/components/icons";
import { accuracyOf } from "@/lib/srs";
import { formatDuration } from "@/lib/stats";

export function StatsPage() {
  const { stats, words } = useStore();

  const seven = stats.days.slice(-7);
  const fourteen = stats.days.slice(-14);

  const activity = seven.map((d) => ({
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
    value: d.practiced,
    secondary: d.wrong,
  }));

  const accuracyTrend = fourteen.map((d) => ({
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    value: accuracyOf(d.correct, d.wrong),
  }));

  const masteredTrend = fourteen.map((d, i) => ({
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    value: fourteen.slice(0, i + 1).reduce((sum, x) => sum + x.mastered, 0),
  }));

  const hardest = useMemo(
    () =>
      words
        .filter((w) => w.correctCount + w.wrongCount > 0)
        .sort((a, b) => accuracyOf(a.correctCount, a.wrongCount) - accuracyOf(b.correctCount, b.wrongCount))
        .slice(0, 8),
    [words],
  );

  const practicedTotal = words.reduce((sum, w) => sum + w.correctCount + w.wrongCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total practiced" value={practicedTotal} hint="answers given" tone="brand" icon={<IconTarget size={15} />} />
        <StatTile label="Total correct" value={stats.totalCorrect} tone="ok" icon={<IconCheck size={15} />} />
        <StatTile label="Total mistakes" value={stats.totalWrong} tone="danger" icon={<IconX size={15} />} />
        <StatTile label="Overall accuracy" value={`${stats.accuracy}%`} hint={`${stats.mastery}% mastered`} tone={stats.accuracy >= 75 ? "ok" : "warn"} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Words mastered" value={stats.completed} hint={`of ${stats.totalWords}`} tone="ok" />
        <StatTile label="Weak words" value={stats.weak} hint="need drilling" tone="danger" />
        <StatTile label="Practice streak" value={`${stats.streak}d`} tone="accent" icon={<IconFlame size={15} />} />
        <StatTile label="Practice time" value={formatDuration(stats.totalMinutes * 60000)} tone="info" icon={<IconClock size={15} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            title="7-day practice activity"
            hint="Bars show answers, the light segment shows mistakes"
            action={<Badge tone="brand">{seven.reduce((s, d) => s + d.practiced, 0)} answers</Badge>}
          />
          <div className="mt-4">
            <ActivityBars data={activity} height={130} />
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Mastery" hint="Overall library completion" />
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--ok)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - stats.mastery / 100)}
                  style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.22,1,.36,1)" }}
                />
              </svg>
              <span className="tabular font-display absolute inset-0 flex items-center justify-center text-xl font-bold text-ink">
                {stats.mastery}%
              </span>
            </div>
            <dl className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
              {[
                ["Complete", stats.completed, "text-ok"],
                ["Learning", stats.learning, "text-warn"],
                ["Need review", stats.needReview, "text-brand"],
                ["Weak", stats.weak, "text-danger"],
                ["New", stats.newWords, "text-info"],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="flex items-center justify-between gap-2">
                  <dt className="text-muted">{label as string}</dt>
                  <dd className={cnNum(tone as string)}>{value as number}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Accuracy trend" hint="Daily correct-answer rate" />
          <div className="mt-4">
            <TrendLine data={accuracyTrend} tone="brand" suffix="%" />
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle title="Words mastered over time" hint="Cumulative new completions" />
          <div className="mt-4">
            <TrendLine data={masteredTrend} tone="ok" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <SectionTitle title="Hardest words for you" hint="Lowest personal accuracy" />
        </div>
        {hardest.length === 0 ? (
          <EmptyState icon={<IconChart size={22} />} title="No data yet" description="Complete a practice session and your personal difficulty ranking appears here." />
        ) : (
          <ul className="divide-y divide-line">
            {hardest.map((w) => {
              const acc = accuracyOf(w.correctCount, w.wrongCount);
              return (
                <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono w-44 truncate text-[13px] font-semibold text-ink">{w.word}</span>
                  <span className="hidden truncate text-[12px] text-muted sm:block sm:w-32">{w.category}</span>
                  <ProgressBar value={acc} tone={acc >= 70 ? "ok" : acc >= 40 ? "warn" : "danger"} size="sm" className="flex-1" />
                  <span className="tabular w-10 text-right text-[12px] font-semibold text-muted">{acc}%</span>
                  <span className="tabular w-16 text-right text-[12px] text-muted">
                    <span className="text-ok">{w.correctCount}✓</span> <span className="text-danger">{w.wrongCount}✗</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function cnNum(cls: string) {
  return `tabular text-[13px] font-semibold ${cls}`;
}
