"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/store/app-store";
import { cn } from "@/lib/cn";
import { accuracyOf, isDue } from "@/lib/srs";
import { relativeTime } from "@/lib/stats";
import type { Word, WordStatus } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, Select, StatusBadge } from "@/components/ui";
import { IconFlame, IconPlay, IconRepeat, IconShuffle, IconTarget } from "@/components/icons";

type FilterKey = "weak" | "review" | "bookmarked" | "recentlyWrong" | "recent" | "unpracticed" | "complete" | "due";

const FILTERS: { key: FilterKey; label: string; hint: string }[] = [
  { key: "due", label: "Due today", hint: "Spaced repetition queue" },
  { key: "weak", label: "Weak", hint: "Repeated mistakes" },
  { key: "review", label: "Need review", hint: "Slipping accuracy" },
  { key: "bookmarked", label: "Bookmarked", hint: "Saved for later" },
  { key: "recentlyWrong", label: "Recently wrong", hint: "Latest session mistakes" },
  { key: "recent", label: "Recently added", hint: "Newest imports" },
  { key: "unpracticed", label: "Not practiced", hint: "Never attempted" },
  { key: "complete", label: "Completed", hint: "Mastered words" },
];

export function ReviewPage() {
  const { words, mistakes, lists } = useStore();
  const [filter, setFilter] = useState<FilterKey>("due");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const counts = useMemo(() => {
    const wrongIds = new Set(mistakes.map((m) => m.wordId).filter((v): v is number => typeof v === "number"));
    return {
      due: words.filter((w) => isDue(w) && w.status !== "new").length,
      weak: words.filter((w) => w.status === "weak").length,
      review: words.filter((w) => w.status === "review").length,
      bookmarked: words.filter((w) => w.bookmarked).length,
      recentlyWrong: words.filter((w) => wrongIds.has(w.id)).length,
      recent: words.length,
      unpracticed: words.filter((w) => w.correctCount + w.wrongCount === 0).length,
      complete: words.filter((w) => w.status === "complete").length,
    } as Record<FilterKey, number>;
  }, [mistakes, words]);

  const filtered = useMemo(() => {
    const wrongIds = new Set(mistakes.map((m) => m.wordId).filter((v): v is number => typeof v === "number"));
    let out: Word[];
    switch (filter) {
      case "weak":
        out = words.filter((w) => w.status === "weak");
        break;
      case "review":
        out = words.filter((w) => w.status === "review");
        break;
      case "bookmarked":
        out = words.filter((w) => w.bookmarked);
        break;
      case "recentlyWrong":
        out = words.filter((w) => wrongIds.has(w.id));
        break;
      case "recent":
        out = words.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "unpracticed":
        out = words.filter((w) => w.correctCount + w.wrongCount === 0);
        break;
      case "complete":
        out = words.filter((w) => w.status === "complete");
        break;
      default:
        out = words.filter((w) => isDue(w) && w.status !== "new");
    }
    if (category !== "all") out = out.filter((w) => w.category === category);
    if (filter !== "recent") {
      out = out.slice().sort((a, b) => {
        const wa = a.status === "weak" ? 2 : a.status === "review" ? 1 : 0;
        const wb = b.status === "weak" ? 2 : b.status === "review" ? 1 : 0;
        if (wb !== wa) return wb - wa;
        return accuracyOf(a.correctCount, a.wrongCount) - accuracyOf(b.correctCount, b.wrongCount);
      });
    }
    return out;
  }, [category, filter, mistakes, words]);

  const categories = useMemo(() => Array.from(new Set(words.map((w) => w.category))).sort(), [words]);
  const shown = filtered.slice(0, 200);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedIds = selected.size ? Array.from(selected) : filtered.map((w) => w.id);
  const practiceHref = (source: string) =>
    `/practice?source=${source}&count=all${category !== "all" ? `&category=${encodeURIComponent(category)}` : ""}`;

  const sourceForFilter: Partial<Record<FilterKey, string>> = {
    weak: "weak",
    review: "review",
    bookmarked: "bookmarked",
    complete: "complete",
    due: "all",
    unpracticed: "new",
    recentlyWrong: "all",
    recent: "all",
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="brand">
            <IconRepeat size={11} /> Smart review
          </Badge>
          <h2 className="font-display mt-2 text-xl font-bold text-ink">Spaced repetition queue</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
            Weak words repeat every few hours, review words daily, mastered words come back at 3 · 7 · 14 · 30 days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              selected.size
                ? `/practice?ids=${Array.from(selected).join(",")}`
                : practiceHref(sourceForFilter[filter] ?? "all")
            }
          >
            <Button variant="primary" icon={<IconPlay size={15} />}>
              {selected.size ? `Practice selected (${selected.size})` : "Practice this queue"}
            </Button>
          </Link>
          <Link href={`/test?source=${sourceForFilter[filter] ?? "all"}&count=20`}>
            <Button variant="secondary" icon={<IconTarget size={15} />}>
              Test queue
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setSelected(new Set());
            }}
            className={cn(
              "rounded-card border p-3.5 text-left transition-all duration-150",
              filter === f.key
                ? "border-brand bg-brand-soft"
                : "border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong",
            )}
            aria-pressed={filter === f.key}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-[13px] font-semibold", filter === f.key ? "text-brand" : "text-ink")}>{f.label}</span>
              <span className="tabular font-display text-lg font-bold text-ink">{counts[f.key]}</span>
            </div>
            <span className="mt-0.5 block text-[11.5px] text-muted">{f.hint}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title={`${filtered.length} words`} hint={filter === "due" ? "Scheduled by the review algorithm" : FILTERS.find((f) => f.key === filter)?.hint} />
          <div className="flex items-center gap-2">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-auto min-w-[150px] text-[13px]">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Link href="/practice?source=all&order=random&count=20">
              <Button size="sm" variant="secondary" icon={<IconShuffle size={14} />}>
                Random 20
              </Button>
            </Link>
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<IconFlame size={22} />}
            title="Nothing to review"
            description="This queue is empty right now. Practice more words or switch filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] tracking-[0.06em] text-muted uppercase">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 font-semibold">Word</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Attempts</th>
                  <th className="w-40 px-3 py-2 font-semibold">Accuracy</th>
                  <th className="px-3 py-2 font-semibold">Last practiced</th>
                  <th className="px-3 py-2 font-semibold">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((w) => {
                  const acc = accuracyOf(w.correctCount, w.wrongCount);
                  const checked = selected.has(w.id);
                  return (
                    <tr
                      key={w.id}
                      className={cn("text-[13px] transition-colors hover:bg-surface-2", checked && "bg-brand-soft/60")}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(w.id)}
                          aria-label={`Select ${w.word}`}
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-semibold text-ink">{w.word}</span>
                        {w.bookmarked && <span className="ml-1.5 text-accent">★</span>}
                      </td>
                      <td className="px-3 py-2 text-muted">{w.category}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={w.status as WordStatus} />
                      </td>
                      <td className="tabular px-3 py-2 text-muted">
                        <span className="text-ok">{w.correctCount}✓</span>{" "}
                        <span className="text-danger">{w.wrongCount}✗</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={acc} tone={acc >= 80 ? "ok" : acc >= 50 ? "warn" : "danger"} size="sm" className="w-20" />
                          <span className="tabular text-[12px] text-muted">{acc}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted">{relativeTime(w.lastPracticed)}</td>
                      <td className="px-3 py-2 text-muted">
                        {w.nextReview ? new Date(w.nextReview).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > shown.length && (
              <p className="border-t border-line px-4 py-3 text-[12.5px] text-muted">
                Showing first {shown.length} of {filtered.length}. Refine the category filter or start the session to
                practice them all.
              </p>
            )}
          </div>
        )}
      </Card>

      {lists.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Custom lists" hint="Hand-picked sets for focused drills" />
          <div className="mt-3 flex flex-wrap gap-2">
            {lists.map((l) => (
              <Link key={l.id} href={`/practice?source=list&listId=${l.id}`}>
                <Badge tone="neutral" className="px-3 py-1.5 text-[12.5px]">
                  {l.name} · {l.wordIds.length}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
