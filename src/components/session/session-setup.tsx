"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/app-store";
import { buildQueue } from "@/lib/queue";
import { STATUS_LABEL, type SessionConfig, type SessionMode } from "@/lib/types";
import { Badge, Button, Card, Field, Kbd, SectionTitle, Select } from "@/components/ui";
import { IconHeadphones, IconPen, IconPlay, IconTarget } from "@/components/icons";

const MODE_COPY: Record<SessionMode, { title: string; blurb: string; icon: typeof IconPen; points: string[] }> = {
  learn: {
    title: "Learn",
    blurb: "Study the spelling, hear it, hide it, recall it. No typing — pure memorisation.",
    icon: IconHeadphones,
    points: ["Word is visible", "Hide / reveal with H", "Mark status manually"],
  },
  practice: {
    title: "Practice",
    blurb: "Active recall: hear the word, type the spelling, see a letter-level diff on mistakes.",
    icon: IconPen,
    points: ["Instant feedback", "Try again on mistakes", "Weak words resurface faster"],
  },
  test: {
    title: "Test",
    blurb: "Exam conditions. The word stays hidden — you only hear it, exactly like IELTS Listening.",
    icon: IconTarget,
    points: ["Word never shown first", "Scored at the end", "Keyboard only"],
  },
};

const COUNTS: (number | "all")[] = [10, 20, 30, 50, "all"];

const SOURCES: { value: SessionConfig["source"]; label: string }[] = [
  { value: "all", label: "All words" },
  { value: "new", label: "New" },
  { value: "weak", label: "Weak" },
  { value: "review", label: "Need Review" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "complete", label: "Completed" },
  { value: "due", label: "Due for review" },
  { value: "list", label: "Custom list" },
];

export function SessionSetup({
  mode,
  initial,
  onStart,
}: {
  mode: SessionMode;
  initial?: Partial<SessionConfig>;
  onStart: (config: SessionConfig) => void;
}) {
  const { words, categories, lists, settings } = useStore();
  const [config, setConfig] = useState<SessionConfig>({
    mode,
    category: "all",
    count: 20,
    source: "all",
    order: settings.shuffleMode ? "random" : "az",
    audio: settings.autoPlay ? "auto" : "manual",
    ...initial,
  });

  const set = <K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const preview = useMemo(() => buildQueue(words, config), [words, config]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of words) map.set(w.category, (map.get(w.category) ?? 0) + 1);
    return map;
  }, [words]);

  const copy = MODE_COPY[mode];
  const Icon = copy.icon;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-brand-soft blur-2xl" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-contrast">
            <Icon size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{copy.title} mode</h2>
            <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-muted">{copy.blurb}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {copy.points.map((p) => (
                <Badge key={p} tone="neutral">
                  {p}
                </Badge>
              ))}
              {settings.showShortcuts && (
                <Badge tone="brand">
                  <Kbd>1</Kbd> hear · <Kbd>2</Kbd> type · <Kbd>↵</Kbd> check
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle title="Configure session" hint="Everything here is optional — press Start and go keyboard-only." />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select value={config.category} onChange={(e) => set("category", e.target.value)}>
              <option value="all">All categories ({words.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({categoryCounts.get(c.name) ?? 0})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Word source">
            <Select value={config.source} onChange={(e) => set("source", e.target.value as SessionConfig["source"])}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          {config.source === "list" && (
            <Field label="Custom list">
              <Select
                value={config.listId ?? ""}
                onChange={(e) => set("listId", Number(e.target.value))}
              >
                <option value="">Select a list…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.wordIds.length})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Number of words">
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((c) => (
                <button
                  key={String(c)}
                  type="button"
                  onClick={() => set("count", c)}
                  className={cn(
                    "h-11 min-w-[58px] rounded-xl border px-3 text-[13px] font-semibold transition-all",
                    config.count === c
                      ? "border-transparent bg-brand text-brand-contrast"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong",
                  )}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Order">
            <div className="flex flex-wrap gap-1.5">
              {(["random", "az", "smart"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set("order", o)}
                  className={cn(
                    "h-11 rounded-xl border px-3.5 text-[13px] font-semibold transition-all",
                    config.order === o
                      ? "border-transparent bg-brand text-brand-contrast"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong",
                  )}
                >
                  {o === "random" ? "Random" : o === "az" ? "A–Z" : "Smart review"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Audio">
            <div className="flex flex-wrap gap-1.5">
              {(["manual", "auto"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("audio", a)}
                  className={cn(
                    "h-11 rounded-xl border px-3.5 text-[13px] font-semibold transition-all",
                    config.audio === a
                      ? "border-transparent bg-brand text-brand-contrast"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong",
                  )}
                >
                  {a === "manual" ? "Manual (press 1)" : "Auto-play each word"}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
          <p className="text-[13px] text-muted">
            <span className="tabular font-display text-xl font-bold text-ink">{preview.length}</span> words ready
            {preview.length > 0 && (
              <span className="ml-2">
                · {Array.from(new Set(preview.map((p) => STATUS_LABEL[p.status]))).join(", ")}
              </span>
            )}
          </p>
          <Button
            variant="primary"
            size="lg"
            disabled={preview.length === 0}
            onClick={() => onStart(config)}
            icon={<IconPlay size={15} />}
            className="w-full sm:w-auto"
          >
            Start {copy.title} Session
          </Button>
        </div>
      </Card>
    </div>
  );
}
