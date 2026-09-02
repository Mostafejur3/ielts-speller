"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/app-store";
import { accuracyOf } from "@/lib/srs";
import { relativeTime } from "@/lib/stats";
import { DIFFICULTY_LABEL, STATUS_LABEL, type Difficulty, type Word, type WordStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  DifficultyBadge,
  EmptyState,
  Field,
  IconButton,
  Modal,
  ProgressBar,
  SectionTitle,
  Segmented,
  Select,
  StatusBadge,
  TextInput,
} from "@/components/ui";
import {
  IconBookmark,
  IconCheck,
  IconFolder,
  IconLibrary,
  IconList,
  IconPencil,
  IconPlay,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";
import { WordEditor, emptyDraft, type WordDraft } from "@/components/library/word-editor";

type SortKey = "az" | "recent" | "mostWrong" | "mostPracticed" | "lowAccuracy" | "highAccuracy";
type Tab = "words" | "categories" | "lists";

const PAGE_SIZE = 40;

const SORTS: { value: SortKey; label: string }[] = [
  { value: "az", label: "A–Z" },
  { value: "recent", label: "Recently added" },
  { value: "mostWrong", label: "Most wrong" },
  { value: "mostPracticed", label: "Most practiced" },
  { value: "lowAccuracy", label: "Lowest accuracy" },
  { value: "highAccuracy", label: "Highest accuracy" },
];

export function LibraryView({
  preset,
  title = "Word Library",
  subtitle = "Search, filter and manage every word in your bank.",
  initialCategory = "all",
  initialQuery = "",
}: {
  preset?: { bookmarked?: boolean; status?: WordStatus };
  title?: string;
  subtitle?: string;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const { words, categories, lists, actions } = useStore();
  const [tab, setTab] = useState<Tab>("words");
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState<"all" | WordStatus>(preset?.status ?? "all");
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all");
  const [bookmarked, setBookmarked] = useState<"all" | "yes" | "no">(preset?.bookmarked ? "yes" : "all");
  const [sort, setSort] = useState<SortKey>("az");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filterKey = `${query}|${category}|${status}|${difficulty}|${bookmarked}|${sort}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = words;
    if (preset?.bookmarked) out = out.filter((w) => w.bookmarked);
    if (q) {
      out = out.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q) ||
          w.notes.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (category !== "all") out = out.filter((w) => w.category === category);
    if (status !== "all") out = out.filter((w) => w.status === status);
    if (difficulty !== "all") out = out.filter((w) => w.difficulty === difficulty);
    if (bookmarked === "yes") out = out.filter((w) => w.bookmarked);
    if (bookmarked === "no") out = out.filter((w) => !w.bookmarked);

    const sorted = out.slice();
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "mostWrong":
        sorted.sort((a, b) => b.wrongCount - a.wrongCount);
        break;
      case "mostPracticed":
        sorted.sort((a, b) => b.correctCount + b.wrongCount - (a.correctCount + a.wrongCount));
        break;
      case "lowAccuracy":
        sorted.sort((a, b) => accuracyOf(a.correctCount, a.wrongCount) - accuracyOf(b.correctCount, b.wrongCount));
        break;
      case "highAccuracy":
        sorted.sort((a, b) => accuracyOf(b.correctCount, b.wrongCount) - accuracyOf(a.correctCount, a.wrongCount));
        break;
      default:
        sorted.sort((a, b) => a.word.localeCompare(b.word));
    }
    return sorted;
  }, [bookmarked, category, difficulty, preset?.bookmarked, query, sort, status, words]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectedIds = Array.from(selected);

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPageSelected = current.length > 0 && current.every((w) => selected.has(w.id));

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; complete: number; weak: number; review: number }>();
    for (const w of words) {
      const e = map.get(w.category) ?? { total: 0, complete: 0, weak: 0, review: 0 };
      e.total++;
      if (w.status === "complete") e.complete++;
      if (w.status === "weak") e.weak++;
      if (w.status === "review") e.review++;
      map.set(w.category, e);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, pct: v.total ? Math.round((v.complete / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [words]);

  const runBulk = async (fn: () => Promise<void> | void) => {
    await fn();
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/import">
            <Button variant="secondary" icon={<IconPlus size={15} />}>
              Import
            </Button>
          </Link>
          <Button variant="primary" icon={<IconPlus size={15} />} onClick={() => setDraft(emptyDraft(category === "all" ? "General" : category))}>
            Add word
          </Button>
        </div>
      </Card>

      {!preset && (
        <Segmented
          value={tab}
          onChange={(next) => setTab(next as Tab)}
          options={[
            { value: "words", label: `Words (${words.length})`, icon: <IconLibrary size={14} /> },
            { value: "categories", label: `Categories (${categoryStats.length})`, icon: <IconFolder size={14} /> },
            { value: "lists", label: `Lists (${lists.length})`, icon: <IconList size={14} /> },
          ]}
        />
      )}

      {(tab === "words" || preset) && (
        <>
          <Card className="p-3 sm:p-4">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
              <div className="relative">
                <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search word, meaning, tag…"
                  className="pl-9"
                  aria-label="Search words"
                />
              </div>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
                <option value="all">All categories</option>
                {categoryStats.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.total})
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value as WordStatus | "all")} aria-label="Status filter">
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_LABEL) as WordStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")} aria-label="Difficulty filter">
                <option value="all">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            {!preset && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookmarked(bookmarked === "yes" ? "all" : "yes")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    bookmarked === "yes" ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  <IconBookmark size={13} className={bookmarked === "yes" ? "fill-current" : undefined} /> Bookmarked only
                </button>
                <span className="text-[12px] text-muted">
                  {filtered.length} match{filtered.length === 1 ? "" : "es"}
                </span>
                {(query || category !== "all" || status !== "all" || difficulty !== "all" || bookmarked !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setStatus("all");
                      setDifficulty("all");
                      setBookmarked("all");
                    }}
                    className="text-[12px] font-semibold text-brand hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </Card>

          {selectedIds.length > 0 && (
            <Card className="animate-rise flex flex-wrap items-center gap-2 border-brand/40 bg-brand-soft p-3">
              <span className="tabular text-[13px] font-semibold text-brand">{selectedIds.length} selected</span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                <Button size="sm" variant="success" onClick={() => void runBulk(() => actions.setStatus(selectedIds, "complete"))} icon={<IconCheck size={14} />}>
                  Complete
                </Button>
                <Button size="sm" variant="warning" onClick={() => void runBulk(() => actions.setStatus(selectedIds, "review"))}>
                  Need Review
                </Button>
                <Button size="sm" variant="danger" onClick={() => void runBulk(() => actions.setStatus(selectedIds, "weak"))}>
                  Weak
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<IconBookmark size={14} />}
                  onClick={() =>
                    void runBulk(async () => {
                      await Promise.all(selectedIds.map((id) => actions.patchWord(id, { bookmarked: true }, true)));
                      actions.toast(`${selectedIds.length} words bookmarked`, "success");
                    })
                  }
                >
                  Bookmark
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMoveOpen(true)} icon={<IconFolder size={14} />}>
                  Move
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setListOpen(true)} icon={<IconList size={14} />}>
                  Lists
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)} icon={<IconTrash size={14} />}>
                  Delete
                </Button>
              </div>
              <IconButton label="Clear selection" size="sm" onClick={() => setSelected(new Set())}>
                <IconX size={15} />
              </IconButton>
            </Card>
          )}

          <Card className="overflow-hidden">
            {current.length === 0 ? (
              <EmptyState
                icon={<IconSearch size={22} />}
                title="No words found"
                description="Try a different search, or import a new batch of words."
                action={
                  <Link href="/import">
                    <Button variant="primary">Import words</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-[11px] tracking-[0.06em] text-muted uppercase">
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (allOnPageSelected) current.forEach((w) => next.delete(w.id));
                              else current.forEach((w) => next.add(w.id));
                              return next;
                            })
                          }
                          aria-label="Select all on page"
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                      </th>
                      <th className="px-3 py-2 font-semibold">Word</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Level</th>
                      <th className="w-36 px-3 py-2 font-semibold">Accuracy</th>
                      <th className="px-3 py-2 font-semibold">Practiced</th>
                      <th className="w-24 px-3 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {current.map((w) => {
                      const acc = accuracyOf(w.correctCount, w.wrongCount);
                      return (
                        <tr key={w.id} className={cn("text-[13px] transition-colors hover:bg-surface-2", selected.has(w.id) && "bg-brand-soft/50")}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(w.id)}
                              onChange={() => toggleSelect(w.id)}
                              aria-label={`Select ${w.word}`}
                              className="h-4 w-4 accent-[var(--brand)]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13.5px] font-semibold text-ink">{w.word}</span>
                              <button
                                type="button"
                                onClick={() => void actions.toggleBookmark(w.id)}
                                aria-label={w.bookmarked ? `Remove bookmark from ${w.word}` : `Bookmark ${w.word}`}
                                className={cn("transition-colors", w.bookmarked ? "text-accent" : "text-muted/40 hover:text-muted")}
                              >
                                <IconBookmark size={14} className={w.bookmarked ? "fill-current" : undefined} />
                              </button>
                            </div>
                            {(w.meaning || w.translation) && (
                              <p className="mt-0.5 max-w-[320px] truncate text-[12px] text-muted">
                                {w.meaning || w.translation}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted">{w.category}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={w.status} />
                          </td>
                          <td className="px-3 py-2">
                            <DifficultyBadge difficulty={w.difficulty} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={acc} tone={acc >= 80 ? "ok" : acc >= 50 ? "warn" : "danger"} size="sm" className="w-16" />
                              <span className="tabular text-[12px] text-muted">{acc}%</span>
                            </div>
                          </td>
                          <td className="tabular px-3 py-2 text-muted">
                            <span className="text-ok">{w.correctCount}</span> / <span className="text-danger">{w.wrongCount}</span>
                            <span className="block text-[11px]">{relativeTime(w.lastPracticed)}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <IconButton
                                label={`Edit ${w.word}`}
                                size="sm"
                                onClick={() =>
                                  setDraft({
                                    id: w.id,
                                    word: w.word,
                                    category: w.category,
                                    meaning: w.meaning,
                                    translation: w.translation,
                                    pronunciation: w.pronunciation,
                                    difficulty: w.difficulty,
                                    notes: w.notes,
                                    tags: w.tags,
                                    status: w.status,
                                    bookmarked: w.bookmarked,
                                  })
                                }
                              >
                                <IconPencil size={15} />
                              </IconButton>
                              <IconButton
                                label={`Delete ${w.word}`}
                                size="sm"
                                className="hover:bg-danger-soft hover:text-danger"
                                onClick={() => {
                                  setSelected(new Set([w.id]));
                                  setConfirmDelete(true);
                                }}
                              >
                                <IconTrash size={15} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                <p className="tabular text-[12.5px] text-muted">
                  {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="tabular text-[12.5px] text-muted">
                    {page + 1} / {pageCount}
                  </span>
                  <Button size="sm" variant="secondary" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "categories" && !preset && <CategoriesTab stats={categoryStats} />}
      {tab === "lists" && !preset && <ListsTab words={words} />}

      {draft && <WordEditor open={Boolean(draft)} draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />}

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Move to category"
        description={`${selectedIds.length} words selected`}
        size="sm"
      >
        <MoveCategory
          onPick={async (name) => {
            await actions.bulkCategory(selectedIds, name);
            setSelected(new Set());
            setMoveOpen(false);
          }}
        />
      </Modal>

      <Modal open={listOpen} onClose={() => setListOpen(false)} title="Add to custom list" size="sm">
        <div className="space-y-2">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                void actions.bulkList(selectedIds, l.id);
                setSelected(new Set());
                setListOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-brand/40 hover:text-brand"
            >
              {l.name}
              <span className="tabular text-[12px] text-muted">{l.wordIds.length}</span>
            </button>
          ))}
          {!lists.length && <p className="py-4 text-center text-[13px] text-muted">No lists yet — create one in the Lists tab.</p>}
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete words?"
        description="This removes them from your library and cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void runBulk(() => actions.deleteWords(selectedIds));
                setConfirmDelete(false);
              }}
            >
              Delete {selectedIds.length}
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">
          {selectedIds.length} word{selectedIds.length === 1 ? "" : "s"} will be deleted permanently.
        </p>
      </Modal>
    </div>
  );
}

function MoveCategory({ onPick }: { onPick: (name: string) => Promise<void> }) {
  const { categories, actions } = useStore();
  const [name, setName] = useState("");
  return (
    <div className="space-y-3">
      <div className="max-h-52 space-y-1.5 overflow-y-auto">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => void onPick(c.name)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            {c.name}
          </button>
        ))}
      </div>
      <Field label="Or create a new category">
        <div className="flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Health" />
          <Button
            variant="primary"
            onClick={() => {
              const value = name.trim();
              if (!value) return;
              void actions.createCategory(value);
              void onPick(value);
            }}
          >
            Move
          </Button>
        </div>
      </Field>
    </div>
  );
}

function CategoriesTab({
  stats,
}: {
  stats: { name: string; total: number; complete: number; weak: number; review: number; pct: number }[];
}) {
  const { actions } = useStore();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionTitle title="Create category" hint="Categories group words for focused sessions." />
        <div className="mt-3 flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Health" aria-label="New category name" />
          <Button
            variant="primary"
            icon={<IconPlus size={15} />}
            onClick={() => {
              const value = name.trim();
              if (!value) return;
              void actions.createCategory(value);
              setName("");
            }}
          >
            Create
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((c) => (
          <Card key={c.name} className="group p-4">
            {renaming === c.name ? (
              <div className="flex gap-2">
                <TextInput value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                <Button
                  variant="primary"
                  onClick={() => {
                    const value = renameValue.trim();
                    if (value) void actions.renameCategory(c.name, value);
                    setRenaming(null);
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display truncate text-[15px] font-semibold text-ink">{c.name}</p>
                  <Badge tone={c.pct >= 70 ? "ok" : c.pct >= 35 ? "warn" : "neutral"}>{c.pct}%</Badge>
                </div>
                <ProgressBar value={c.pct} tone={c.pct >= 70 ? "ok" : "brand"} className="mt-3" size="sm" />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Cell label="Total" value={c.total} />
                  <Cell label="Complete" value={c.complete} tone="text-ok" />
                  <Cell label="Weak" value={c.weak} tone="text-danger" />
                </dl>
                <div className="mt-3 flex gap-1.5">
                  <Link href={`/practice?category=${encodeURIComponent(c.name)}`} className="flex-1">
                    <Button size="sm" variant="primary" block icon={<IconPlay size={13} />}>
                      Practice
                    </Button>
                  </Link>
                  <Link href={`/library?category=${encodeURIComponent(c.name)}`}>
                    <Button size="sm" variant="secondary" icon={<IconLibrary size={14} />}>
                      Words
                    </Button>
                  </Link>
                  <IconButton
                    label={`Rename ${c.name}`}
                    size="sm"
                    className="border border-line bg-surface-2"
                    onClick={() => {
                      setRenaming(c.name);
                      setRenameValue(c.name);
                    }}
                  >
                    <IconPencil size={14} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${c.name}`}
                    size="sm"
                    className="border border-line bg-surface-2 hover:bg-danger-soft hover:text-danger"
                    onClick={() => {
                      if (c.total > 0) {
                        actions.toast("Move or delete its words first", "warning");
                        return;
                      }
                      void actions.deleteCategory(c.name);
                    }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </div>
              </>
            )}
          </Card>
        ))}
        {!stats.length && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <EmptyState icon={<IconFolder size={22} />} title="No categories yet" description="Categories appear automatically when you import words." />
          </Card>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 py-1.5">
      <p className={cn("tabular text-[15px] font-bold", tone)}>{value}</p>
      <p className="text-[10.5px] text-muted">{label}</p>
    </div>
  );
}

function ListsTab({ words }: { words: Word[] }) {
  const { lists, actions } = useStore();
  const [name, setName] = useState("");
  const [openList, setOpenList] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const active = lists.find((l) => l.id === openList);
  const activeWords = active ? words.filter((w) => active.wordIds.includes(w.id)) : [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionTitle title="Custom lists" hint="Week 1, Hardest 50, Exam Tomorrow — a word can live in many lists." />
        <div className="mt-3 flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Listening Section 1" aria-label="New list name" />
          <Button
            variant="primary"
            icon={<IconPlus size={15} />}
            onClick={() => {
              const value = name.trim();
              if (!value) return;
              void actions.createList(value);
              setName("");
            }}
          >
            Create list
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <Card key={l.id} className="p-4">
            {renaming === l.id ? (
              <div className="flex gap-2">
                <TextInput value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                <Button
                  variant="primary"
                  onClick={() => {
                    const value = renameValue.trim();
                    if (value) void actions.renameList(l.id, value);
                    setRenaming(null);
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display truncate text-[15px] font-semibold text-ink">{l.name}</p>
                  <Badge tone="neutral">{l.wordIds.length} words</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link href={`/practice?source=list&listId=${l.id}`}>
                    <Button size="sm" variant="primary" icon={<IconPlay size={13} />}>
                      Practice
                    </Button>
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => setOpenList(openList === l.id ? null : l.id)}>
                    {openList === l.id ? "Hide" : "View"}
                  </Button>
                  <IconButton
                    label={`Rename ${l.name}`}
                    size="sm"
                    className="border border-line bg-surface-2"
                    onClick={() => {
                      setRenaming(l.id);
                      setRenameValue(l.name);
                    }}
                  >
                    <IconPencil size={14} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${l.name}`}
                    size="sm"
                    className="border border-line bg-surface-2 hover:bg-danger-soft hover:text-danger"
                    onClick={() => void actions.deleteList(l.id)}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </div>
                {openList === l.id && (
                  <div className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface-2 p-2">
                    {activeWords.length === 0 && <p className="px-1 py-2 text-[12.5px] text-muted">Empty list — add words from the Words tab.</p>}
                    {activeWords.map((w) => (
                      <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[12.5px]">
                        <span className="font-mono font-medium text-ink">{w.word}</span>
                        <button
                          type="button"
                          onClick={() => void actions.toggleWordInList(w.id, l.id)}
                          className="text-muted transition-colors hover:text-danger"
                          aria-label={`Remove ${w.word} from ${l.name}`}
                        >
                          <IconX size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
        {!lists.length && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <EmptyState icon={<IconList size={22} />} title="No custom lists yet" description="Create lists like “Hardest 50” or “Exam Tomorrow”." />
          </Card>
        )}
      </div>
    </div>
  );
}
