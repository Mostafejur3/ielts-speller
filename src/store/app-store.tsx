"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { localDb, DEFAULT_SETTINGS, type Mistake, clearAllLocal } from "@/lib/local-db";
import { deriveStats } from "@/lib/stats";
import type {
  Category,
  DayStat,
  ImportRow,
  SessionConfig,
  Settings,
  Stats,
  Word,
  WordList,
} from "@/lib/types";

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error" | "warning";
}

export const CACHE_KEY = "spelling-lab:v2:store";

interface StoreValue {
  ready: boolean;
  error: string | null;
  words: Word[];
  categories: Category[];
  lists: WordList[];
  settings: Settings;
  days: DayStat[];
  mistakes: Mistake[];
  stats: Stats;
  toasts: Toast[];
  actions: Actions;
}

interface Actions {
  refresh: () => Promise<void>;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  patchWord: (id: number, patch: Partial<Word>, silent?: boolean) => Promise<void>;
  toggleBookmark: (id: number) => Promise<void>;
  setStatus: (ids: number[], status: Word["status"]) => Promise<void>;
  deleteWords: (ids: number[]) => Promise<void>;
  bulkCategory: (ids: number[], category: string) => Promise<void>;
  bulkList: (ids: number[], listId: number) => Promise<void>;
  bulkReset: (ids: number[]) => Promise<void>;
  importWords: (rows: ImportRow[]) => Promise<{ created: number; skipped: number }>;
  recordAnswers: (payload: {
    items: { wordId: number; answer: string; correct: boolean; attempts: number }[];
    mode: string;
    durationMs: number;
    config: SessionConfig;
  }) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  reset: (scope: "progress" | "words" | "everything") => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  renameCategory: (from: string, to: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  createList: (name: string) => Promise<void>;
  renameList: (id: number, name: string) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  toggleWordInList: (wordId: number, listId: number) => Promise<void>;
}

const EMPTY_STATS: Stats = {
  totalWords: 0,
  newWords: 0,
  learning: 0,
  completed: 0,
  needReview: 0,
  weak: 0,
  bookmarked: 0,
  totalCorrect: 0,
  totalWrong: 0,
  accuracy: 0,
  todayPracticed: 0,
  todayCorrect: 0,
  todayWrong: 0,
  streak: 0,
  totalMinutes: 0,
  dueForReview: 0,
  neverPracticed: 0,
  mastery: 0,
  days: [],
};

const StoreContext = createContext<StoreValue | null>(null);

export function clearLocalCache() {
  clearAllLocal();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lists, setLists] = useState<WordList[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [days, setDays] = useState<DayStat[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  const toast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = toastId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await localDb.bootstrap();
      setWords(data.words);
      setCategories(data.categories);
      setLists(data.lists);
      setSettings(data.settings);
      setDays(data.days);
      setMistakes(data.mistakes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your data");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", Boolean(settings?.darkMode));
    root.style.colorScheme = settings?.darkMode ? "dark" : "light";
  }, [settings?.darkMode]);

  const upsertWords = useCallback((incoming: Word[]) => {
    if (!incoming.length) return;
    setWords((prev) => {
      const map = new Map(prev.map((w) => [w.id, w]));
      for (const w of incoming) map.set(w.id, w);
      return Array.from(map.values());
    });
  }, []);

  const removeWords = useCallback((ids: number[]) => {
    const set = new Set(ids);
    setWords((prev) => prev.filter((w) => !set.has(w.id)));
  }, []);

  const patchWord = useCallback(
    async (id: number, patch: Partial<Word>, silent = false) => {
      const previous = wordsRef.current.find((w) => w.id === id);
      if (previous) upsertWords([{ ...previous, ...patch }]);
      try {
        const next = await localDb.updateWord(id, patch);
        if (next) upsertWords([next]);
      } catch {
        if (previous) upsertWords([previous]);
        if (!silent) toast("Could not save change", "error");
      }
    },
    [toast, upsertWords],
  );

  const toggleBookmark = useCallback(
    async (id: number) => {
      const current = wordsRef.current.find((w) => w.id === id);
      if (!current) return;
      const next = !current.bookmarked;
      await patchWord(id, { bookmarked: next }, true);
      toast(next ? `${current.word} bookmarked` : `Bookmark removed`, next ? "success" : "info");
    },
    [patchWord, toast],
  );

  const setStatus = useCallback(
    async (ids: number[], status: Word["status"]) => {
      const before = wordsRef.current.filter((w) => ids.includes(w.id));
      upsertWords(before.map((w) => ({ ...w, status })));
      const label = { new: "New", learning: "Learning", complete: "Complete", review: "Need Review", weak: "Weak" }[status];
      if (ids.length === 1) toast(`${before[0]?.word ?? "Word"} → ${label}`, status === "weak" ? "warning" : "success");
      else toast(`${ids.length} words → ${label}`, "success");
      try {
        const changed = await localDb.setStatus(ids, status);
        if (changed.length) upsertWords(changed);
      } catch {
        upsertWords(before);
        toast("Could not update status", "error");
      }
    },
    [toast, upsertWords],
  );

  const deleteWords = useCallback(
    async (ids: number[]) => {
      removeWords(ids);
      toast(`${ids.length} word${ids.length === 1 ? "" : "s"} deleted`, "info");
      try {
        await localDb.deleteWords(ids);
      } catch {
        toast("Could not delete words", "error");
        void refresh();
      }
    },
    [refresh, removeWords, toast],
  );

  const bulkCategory = useCallback(
    async (ids: number[], category: string) => {
      const before = wordsRef.current.filter((w) => ids.includes(w.id));
      upsertWords(before.map((w) => ({ ...w, category })));
      setCategories((prev) => (prev.some((c) => c.name === category) ? prev : [...prev, { id: Date.now(), name: category }]));
      toast(`Moved ${ids.length} word${ids.length === 1 ? "" : "s"} → ${category}`, "success");
      try {
        const changed = await localDb.moveCategory(ids, category);
        if (changed.length) upsertWords(changed);
        const state = await localDb.getState();
        setCategories(state.categories);
      } catch {
        upsertWords(before);
        toast("Could not move words", "error");
      }
    },
    [toast, upsertWords],
  );

  const bulkList = useCallback(
    async (ids: number[], listId: number) => {
      const list = lists.find((l) => l.id === listId);
      try {
        await localDb.listAdd(ids, listId);
        const state = await localDb.getState();
        setLists(state.lists);
        setWords(state.words);
        toast(`Added ${ids.length} word${ids.length === 1 ? "" : "s"} to ${list?.name ?? "list"}`, "success");
      } catch {
        toast("Could not update list", "error");
      }
    },
    [lists, toast],
  );

  const bulkReset = useCallback(
    async (ids: number[]) => {
      const before = wordsRef.current.filter((w) => ids.includes(w.id));
      upsertWords(
        before.map((w) => ({
          ...w,
          status: "new" as const,
          correctCount: 0,
          wrongCount: 0,
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          reviewStage: 0,
          lastPracticed: null,
          nextReview: null,
        })),
      );
      toast(`Reset progress for ${ids.length} word${ids.length === 1 ? "" : "s"}`, "info");
      try {
        const changed = await localDb.resetWords(ids);
        if (changed.length) upsertWords(changed);
      } catch {
        upsertWords(before);
        toast("Could not reset words", "error");
      }
    },
    [toast, upsertWords],
  );

  const importWords = useCallback(
    async (rows: ImportRow[]) => {
      const res = await localDb.importWords(rows);
      upsertWords(res.created);
      const state = await localDb.getState();
      setCategories(state.categories);
      return { created: res.created.length, skipped: res.skipped };
    },
    [upsertWords],
  );

  const recordAnswers = useCallback(
    async (payload: {
      items: { wordId: number; answer: string; correct: boolean; attempts: number }[];
      mode: string;
      durationMs: number;
      config: SessionConfig;
    }) => {
      try {
        const res = await localDb.recordAnswers(payload);
        if (res.words?.length) upsertWords(res.words);
        const state = await localDb.getState();
        setDays(state.days);
        setMistakes(state.mistakes);
      } catch {
        /* ignore */
      }
    },
    [upsertWords],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const before = settings;
      setSettings((prev) => ({ ...prev, ...patch }));
      try {
        const next = await localDb.saveSettings(patch);
        setSettings(next);
      } catch {
        setSettings(before);
        toast("Could not save settings", "error");
      }
    },
    [settings, toast],
  );

  const reset = useCallback(
    async (scope: "progress" | "words" | "everything") => {
      await localDb.reset(scope);
      if (scope === "everything") clearAllLocal();
      await refresh();
      toast(scope === "progress" ? "Progress reset" : "Library cleared", "success");
    },
    [refresh, toast],
  );

  const createCategory = useCallback(
    async (name: string) => {
      try {
        const cats = await localDb.createCategory(name);
        setCategories(cats);
        toast(`Category "${name}" created`, "success");
      } catch {
        toast("Could not create category", "error");
      }
    },
    [toast],
  );

  const renameCategory = useCallback(
    async (from: string, to: string) => {
      try {
        const res = await localDb.renameCategory(from, to);
        setCategories(res.categories);
        if (res.words.length) upsertWords(res.words);
        toast(`Category renamed`, "success");
      } catch {
        toast("Could not rename category", "error");
      }
    },
    [toast, upsertWords],
  );

  const deleteCategory = useCallback(
    async (name: string) => {
      try {
        const cats = await localDb.deleteCategory(name);
        setCategories(cats);
        const state = await localDb.getState();
        setWords(state.words);
        toast(`Category "${name}" deleted`, "info");
      } catch {
        toast("Could not delete category", "error");
      }
    },
    [toast],
  );

  const createList = useCallback(
    async (name: string) => {
      try {
        const all = await localDb.createList(name);
        setLists(all);
        toast(`List "${name}" created`, "success");
      } catch {
        toast("Could not create list", "error");
      }
    },
    [toast],
  );

  const renameList = useCallback(
    async (id: number, name: string) => {
      try {
        const all = await localDb.renameList(id, name);
        setLists(all);
        toast("List renamed", "success");
      } catch {
        toast("Could not rename list", "error");
      }
    },
    [toast],
  );

  const deleteList = useCallback(
    async (id: number) => {
      try {
        const all = await localDb.deleteList(id);
        setLists(all);
        const state = await localDb.getState();
        setWords(state.words);
        toast("List deleted", "info");
      } catch {
        toast("Could not delete list", "error");
      }
    },
    [toast],
  );

  const toggleWordInList = useCallback(
    async (wordId: number, listId: number) => {
      const word = wordsRef.current.find((w) => w.id === wordId);
      const inList = word?.listIds.includes(listId) ?? false;
      const list = lists.find((l) => l.id === listId);
      if (word) {
        upsertWords([
          {
            ...word,
            listIds: inList ? word.listIds.filter((l) => l !== listId) : [...word.listIds, listId],
          },
        ]);
      }
      try {
        const all = await localDb.toggleWordInList(wordId, listId);
        setLists(all);
        const state = await localDb.getState();
        setWords(state.words);
        toast(inList ? `Removed from ${list?.name ?? "list"}` : `Added to ${list?.name ?? "list"}`, "success");
      } catch {
        if (word) upsertWords([word]);
        toast("Could not update list", "error");
      }
    },
    [lists, toast, upsertWords],
  );

  const stats = useMemo(() => deriveStats(words, days), [words, days]);

  const actions = useMemo<Actions>(
    () => ({
      refresh,
      toast,
      dismissToast,
      patchWord,
      toggleBookmark,
      setStatus,
      deleteWords,
      bulkCategory,
      bulkList,
      bulkReset,
      importWords,
      recordAnswers,
      saveSettings,
      reset,
      createCategory,
      renameCategory,
      deleteCategory,
      createList,
      renameList,
      deleteList,
      toggleWordInList,
    }),
    [
      bulkCategory,
      bulkList,
      bulkReset,
      createCategory,
      createList,
      deleteCategory,
      deleteList,
      deleteWords,
      dismissToast,
      importWords,
      patchWord,
      recordAnswers,
      refresh,
      renameCategory,
      renameList,
      reset,
      saveSettings,
      setStatus,
      toast,
      toggleBookmark,
      toggleWordInList,
    ],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      error,
      words,
      categories,
      lists,
      settings,
      days,
      mistakes,
      stats: stats ?? EMPTY_STATS,
      toasts,
      actions,
    }),
    [actions, categories, days, error, lists, mistakes, ready, settings, stats, toasts, words],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function useActions(): Actions {
  return useStore().actions;
}
