"use client";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/stats";
import type { SessionMode } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";
import { IconCheck, IconRepeat, IconTarget, IconAlert } from "@/components/icons";
import { WordDifference } from "./word-difference";

export interface ResultEntry {
  wordId: number;
  word: string;
  answer: string;
  correct: boolean;
  attempts: number;
}

export interface SummaryData {
  mode: SessionMode;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number;
  durationMs: number;
  marked: { complete: number; review: number; weak: number };
  mistakes: ResultEntry[];
}

function Ring({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const tone = value >= 85 ? "var(--ok)" : value >= 60 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-2xl font-bold text-ink">{value}%</span>
        <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">accuracy</span>
      </div>
    </div>
  );
}

export function SessionSummary({
  data,
  onExit,
  onRestart,
  onPracticeMistakes,
}: {
  data: SummaryData;
  onExit: () => void;
  onRestart: () => void;
  onPracticeMistakes: () => void;
}) {
  const headline =
    data.accuracy >= 90 ? "Excellent recall" : data.accuracy >= 70 ? "Solid work" : data.answered === 0 ? "Session ended" : "Keep drilling";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="animate-rise p-5 sm:p-7">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Ring value={data.accuracy} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <Badge tone="brand" className="mb-2">
              {data.mode} session complete
            </Badge>
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{headline}</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              {data.correct} of {data.answered} answered correctly · {formatDuration(data.durationMs)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile icon={<IconCheck size={14} />} label="Correct" value={data.correct} tone="text-ok" />
              <Tile icon={<IconAlert size={14} />} label="Wrong" value={data.wrong} tone="text-danger" />
              <Tile icon={<IconTarget size={14} />} label="Complete" value={data.marked.complete} tone="text-brand" />
              <Tile icon={<IconRepeat size={14} />} label="Weak" value={data.marked.weak} tone="text-warn" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {data.mistakes.length > 0 && (
            <Button variant="primary" size="lg" onClick={onPracticeMistakes} className="flex-1">
              Practice mistakes again ({data.mistakes.length})
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={onRestart} className="flex-1">
            Repeat this session
          </Button>
          <Button variant="ghost" size="lg" onClick={onExit}>
            Back
          </Button>
        </div>
      </Card>

      {data.mistakes.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h3 className="font-display text-[15px] font-semibold text-ink">Mistakes from this session</h3>
            <p className="text-[12.5px] text-muted">These words were pushed up the review queue automatically.</p>
          </div>
          <ul className="divide-y divide-line">
            {data.mistakes.map((m) => (
              <li key={`${m.wordId}-${m.attempts}`} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <WordDifference expected={m.word} typed={m.answer} compact />
                </div>
                <Badge tone="neutral">{m.attempts}× tried</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Tile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <p className={cn("tabular font-display flex items-center gap-1.5 text-lg font-bold", tone)}>
        {icon}
        {value}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
