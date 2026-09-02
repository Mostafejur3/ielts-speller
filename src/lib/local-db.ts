/**
 * Option B — Local-only persistence (GitHub push ready)
 * Uses IndexedDB for words/lists/history + localStorage fallback.
 * No DATABASE_URL, no server, works on Vercel / Netlify / GitHub Pages.
 */

import { applyAnswer, nextReviewDate } from "./srs";
import { accuracyOf } from "./srs";
import type { Category, DayStat, ImportRow, SessionConfig, Settings, Word, WordList } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  accent: "en-GB",
  voiceURI: "",
  rate: 0.9,
  autoPlay: true,
  autoFocus: true,
  showShortcuts: true,
  darkMode: false,
  dailyGoal: 20,
  strictMode: false,
  shuffleMode: true,
  showMeaning: true,
  showTranslation: true,
};

export interface Mistake {
  wordId: number | null;
  word: string;
  answer: string;
  createdAt: string;
}

interface Stored {
  words: Word[];
  categories: Category[];
  lists: WordList[];
  settings: Settings;
  days: DayStat[];
  mistakes: Mistake[];
  wordSeq: number;
  listSeq: number;
  catSeq: number;
  version: number;
}

const LS_KEY = "spelling-lab:v2:store";
const IDB_NAME = "spelling-lab";
const IDB_STORE = "kv";
const IDB_KEY = "store";

const DEMO_WORDS: Array<Partial<Word> & { word: string }> = [
  { word: "accommodation", category: "Travel & Places", meaning: "a place where someone stays", difficulty: "hard", tags: ["IELTS", "listening"] },
  { word: "environment", category: "Science", meaning: "the natural world", difficulty: "medium", tags: ["IELTS"] },
  { word: "curriculum", category: "Academic", meaning: "the subjects in a course", difficulty: "hard", tags: ["IELTS"] },
  { word: "questionnaire", category: "Academic", meaning: "a set of written questions", difficulty: "hard", tags: ["IELTS"] },
  { word: "laboratory", category: "Science", meaning: "a room for scientific work", difficulty: "medium", tags: ["IELTS"] },
  { word: "vegetarian", category: "Food", meaning: "someone who does not eat meat", difficulty: "easy", tags: ["listening"] },
  { word: "transport", category: "Travel & Places", meaning: "moving people or goods", difficulty: "easy", tags: ["listening"] },
  { word: "temperature", category: "Science", meaning: "how hot or cold something is", difficulty: "medium", tags: ["IELTS"] },
  { word: "guarantee", category: "Common IELTS Words", meaning: "a formal promise", difficulty: "hard", tags: ["IELTS"] },
  { word: "necessary", category: "Common IELTS Words", meaning: "needed, essential", difficulty: "medium", tags: ["IELTS"] },
  { word: "receipt", category: "Common IELTS Words", meaning: "a written record of payment", difficulty: "hard", tags: ["listening"] },
  { word: "colleague", category: "Jobs", meaning: "a person you work with", difficulty: "medium", tags: ["listening"] },
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(raw: string) {
  return raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeSeed(): Stored {
  const cats = Array.from(new Set(DEMO_WORDS.map((w) => w.category ?? "General")));
  const categories: Category[] = cats.map((name, i) => ({ id: i + 1, name }));
  const catByName = new Map(categories.map((c) => [c.name, c.id]));
  void catByName;
  const words: Word[] = DEMO_WORDS.map((w, i) => ({
    id: i + 1,
    word: w.word,
    category: w.category ?? "General",
    meaning: w.meaning ?? "",
    translation: w.translation ?? "",
    pronunciation: w.pronunciation ?? "",
    difficulty: (w.difficulty ?? "medium") as Word["difficulty"],
    notes: w.notes ?? "",
    tags: w.tags ?? [],
    status: "new" as const,
    bookmarked: false,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    reviewStage: 0,
    lastPracticed: null,
    nextReview: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    listIds: i < 4 ? [1] : [],
  }));
  return {
    words,
    categories,
    lists: [{ id: 1, name: "Exam Tomorrow", wordIds: words.slice(0, 4).map((w) => w.id) }],
    settings: DEFAULT_SETTINGS,
    days: [],
    mistakes: [],
    wordSeq: words.length + 1,
    listSeq: 2,
    catSeq: categories.length + 1,
    version: 2,
  };
}

// ---------- IndexedDB helpers (best-effort, fallback to localStorage)

function idbSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<string | null> {
  if (!idbSupported()) return null;
  try {
    const db = await openIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const r = store.get(IDB_KEY);
      r.onsuccess = () => resolve((r.result as string) ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(value: string): Promise<void> {
  if (!idbSupported()) return;
  try {
    const db = await openIdb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

// ---------- core load / save

function readLs(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    // migrate from old cache key if present
    const old = window.localStorage.getItem("ielts-spelling-cache-v2");
    if (old) {
      try {
        const parsed = JSON.parse(old) as { words?: Word[]; categories?: Category[]; lists?: WordList[]; settings?: Settings; days?: DayStat[] };
        if (Array.isArray(parsed.words) && parsed.words.length) {
          const seed = makeSeed();
          return {
            words: parsed.words,
            categories: parsed.categories ?? seed.categories,
            lists: parsed.lists ?? seed.lists,
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
            days: parsed.days ?? [],
            mistakes: [],
            wordSeq: Math.max(...parsed.words.map((w) => w.id), 0) + 1,
            listSeq: Math.max(...(parsed.lists ?? []).map((l) => l.id), 1) + 1,
            catSeq: Math.max(...(parsed.categories ?? []).map((c) => c.id), 1) + 1,
            version: 2,
          };
        }
      } catch {
        /* ignore */
      }
    }
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.words)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let memory: Stored | null = null;
let saveTimer: number | null = null;

async function load(): Promise<Stored> {
  if (memory) return memory;
  // try IDB first, then LS
  const fromIdb = await idbGet();
  if (fromIdb) {
    try {
      const parsed = JSON.parse(fromIdb) as Stored;
      if (Array.isArray(parsed.words)) {
        memory = parsed;
        return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  const fromLs = readLs();
  if (fromLs) {
    memory = fromLs;
    void idbSet(JSON.stringify(fromLs));
    return fromLs;
  }
  const seed = makeSeed();
  memory = seed;
  persist();
  return seed;
}

function persist() {
  if (!memory || typeof window === "undefined") return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const json = JSON.stringify(memory);
    try {
      window.localStorage.setItem(LS_KEY, json);
    } catch {
      /* quota — best effort */
    }
    void idbSet(json);
  }, 180);
}

function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- public API (all async to match previous server API shape)

export const localDb = {
  async bootstrap(): Promise<{
    words: Word[];
    categories: Category[];
    lists: WordList[];
    settings: Settings;
    days: DayStat[];
    mistakes: Mistake[];
  }> {
    const s = await load();
    return {
      words: s.words,
      categories: s.categories,
      lists: s.lists,
      settings: s.settings,
      days: s.days,
      mistakes: s.mistakes.slice(0, 80),
    };
  },

  async getState(): Promise<Stored> {
    return load();
  },

  async importWords(rows: ImportRow[]): Promise<{ created: Word[]; skipped: number }> {
    const s = await load();
    const existing = new Set(s.words.map((w) => normalizeKey(w.word)));
    const created: Word[] = [];
    let skipped = 0;
    const catNames = new Set(s.categories.map((c) => c.name));
    for (const row of rows) {
      const wordText = String(row.word ?? "").trim();
      if (!wordText) {
        skipped++;
        continue;
      }
      const key = normalizeKey(wordText);
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      existing.add(key);
      const category = (row.category?.trim() || "General").trim();
      if (!catNames.has(category)) {
        s.categories.push({ id: s.catSeq++, name: category });
        catNames.add(category);
      }
      const w: Word = {
        id: s.wordSeq++,
        word: wordText,
        category,
        meaning: row.meaning?.trim() ?? "",
        translation: row.translation?.trim() ?? "",
        pronunciation: row.pronunciation?.trim() ?? "",
        difficulty: (["easy", "medium", "hard"].includes(String(row.difficulty ?? "").toLowerCase())
          ? String(row.difficulty).toLowerCase()
          : "medium") as Word["difficulty"],
        notes: row.notes?.trim() ?? "",
        tags: Array.isArray(row.tags) ? row.tags : typeof row.tags === "string" ? row.tags.split(/[|;]/).map((t) => t.trim()).filter(Boolean) : [],
        status: "new",
        bookmarked: false,
        correctCount: 0,
        wrongCount: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        reviewStage: 0,
        lastPracticed: null,
        nextReview: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        listIds: [],
      };
      s.words.push(w);
      created.push(w);
    }
    persist();
    return { created, skipped };
  },

  async updateWord(id: number, patch: Partial<Word>): Promise<Word | null> {
    const s = await load();
    const idx = s.words.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    const next = { ...s.words[idx], ...patch, updatedAt: nowIso() };
    // normalize word if changed
    if (patch.word) next.word = String(patch.word).trim();
    s.words[idx] = next;
    if (patch.category && !s.categories.some((c) => c.name === patch.category)) {
      s.categories.push({ id: s.catSeq++, name: patch.category as string });
    }
    persist();
    return next;
  },

  async deleteWords(ids: number[]): Promise<void> {
    const s = await load();
    const set = new Set(ids);
    s.words = s.words.filter((w) => !set.has(w.id));
    s.lists = s.lists.map((l) => ({ ...l, wordIds: l.wordIds.filter((wid) => !set.has(wid)) }));
    s.mistakes = s.mistakes.filter((m) => m.wordId === null || !set.has(m.wordId));
    persist();
  },

  async setStatus(ids: number[], status: Word["status"]): Promise<Word[]> {
    const s = await load();
    const set = new Set(ids);
    const out: Word[] = [];
    for (const w of s.words) {
      if (set.has(w.id)) {
        w.status = status;
        w.updatedAt = nowIso();
        out.push(w);
      }
    }
    persist();
    return out;
  },

  async setBookmarked(ids: number[], bookmarked: boolean): Promise<Word[]> {
    const s = await load();
    const set = new Set(ids);
    const out: Word[] = [];
    for (const w of s.words) {
      if (set.has(w.id)) {
        w.bookmarked = bookmarked;
        w.updatedAt = nowIso();
        out.push(w);
      }
    }
    persist();
    return out;
  },

  async moveCategory(ids: number[], category: string): Promise<Word[]> {
    const s = await load();
    const name = category.trim() || "General";
    if (!s.categories.some((c) => c.name === name)) s.categories.push({ id: s.catSeq++, name });
    const set = new Set(ids);
    const out: Word[] = [];
    for (const w of s.words) {
      if (set.has(w.id)) {
        w.category = name;
        w.updatedAt = nowIso();
        out.push(w);
      }
    }
    persist();
    return out;
  },

  async resetWords(ids: number[]): Promise<Word[]> {
    const s = await load();
    const set = new Set(ids);
    const out: Word[] = [];
    for (const w of s.words) {
      if (set.has(w.id)) {
        w.status = "new";
        w.correctCount = 0;
        w.wrongCount = 0;
        w.consecutiveCorrect = 0;
        w.consecutiveWrong = 0;
        w.reviewStage = 0;
        w.lastPracticed = null;
        w.nextReview = null;
        w.updatedAt = nowIso();
        out.push(w);
      }
    }
    persist();
    return out;
  },

  async listAdd(ids: number[], listId: number): Promise<void> {
    const s = await load();
    const list = s.lists.find((l) => l.id === listId);
    if (!list) return;
    const set = new Set(list.wordIds);
    for (const id of ids) set.add(id);
    list.wordIds = Array.from(set);
    for (const w of s.words) if (ids.includes(w.id) && !w.listIds.includes(listId)) w.listIds = [...w.listIds, listId];
    persist();
  },

  async listRemove(ids: number[], listId: number): Promise<void> {
    const s = await load();
    const list = s.lists.find((l) => l.id === listId);
    if (!list) return;
    const remove = new Set(ids);
    list.wordIds = list.wordIds.filter((id) => !remove.has(id));
    for (const w of s.words) if (remove.has(w.id)) w.listIds = w.listIds.filter((lid) => lid !== listId);
    persist();
  },

  async recordAnswers(payload: {
    mode: string;
    durationMs: number;
    config: SessionConfig;
    items: { wordId: number; answer: string; correct: boolean; attempts: number }[];
  }): Promise<{ words: Word[]; mastered: number; day: DayStat }> {
    const s = await load();
    const byId = new Map(s.words.map((w) => [w.id, w]));
    const changed: Word[] = [];
    let mastered = 0;
    const now = new Date();

    for (const item of payload.items) {
      const w = byId.get(item.wordId);
      if (!w) continue;
      const patch = applyAnswer(w, item.correct, now);
      if (patch.becameComplete) mastered++;
      Object.assign(w, patch);
      changed.push({ ...w });
      if (!item.correct) {
        s.mistakes.unshift({
          wordId: w.id,
          word: w.word,
          answer: item.answer,
          createdAt: now.toISOString(),
        });
      }
    }
    s.mistakes = s.mistakes.slice(0, 120);

    const dayKey = localDay(now);
    let day = s.days.find((d) => d.day === dayKey);
    if (!day) {
      day = { day: dayKey, practiced: 0, correct: 0, wrong: 0, mastered: 0, minutes: 0 };
      s.days.push(day);
    }
    const practiced = payload.items.length;
    const correct = payload.items.filter((i) => i.correct).length;
    day.practiced += practiced;
    day.correct += correct;
    day.wrong += practiced - correct;
    day.mastered += mastered;
    day.minutes += Math.max(0, Math.round(payload.durationMs / 60000));

    persist();
    return { words: changed, mastered, day };
  },

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const s = await load();
    s.settings = { ...s.settings, ...patch };
    persist();
    return s.settings;
  },

  async createCategory(name: string): Promise<Category[]> {
    const s = await load();
    const n = name.trim();
    if (!n) return s.categories;
    if (!s.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
      s.categories.push({ id: s.catSeq++, name: n });
      persist();
    }
    return s.categories;
  },

  async renameCategory(from: string, to: string): Promise<{ categories: Category[]; words: Word[] }> {
    const s = await load();
    const t = to.trim();
    if (!t) return { categories: s.categories, words: [] };
    const changed: Word[] = [];
    for (const w of s.words) if (w.category === from) { w.category = t; changed.push(w); }
    s.categories = s.categories.filter((c) => c.name !== from);
    if (!s.categories.some((c) => c.name === t)) s.categories.push({ id: s.catSeq++, name: t });
    persist();
    return { categories: s.categories, words: changed };
  },

  async deleteCategory(name: string): Promise<Category[]> {
    const s = await load();
    // only allow delete if no words use it — otherwise keep but remove from list
    if (s.words.some((w) => w.category === name)) {
      // move words to General
      for (const w of s.words) if (w.category === name) w.category = "General";
      if (!s.categories.some((c) => c.name === "General")) s.categories.push({ id: s.catSeq++, name: "General" });
    }
    s.categories = s.categories.filter((c) => c.name !== name);
    persist();
    return s.categories;
  },

  async createList(name: string): Promise<WordList[]> {
    const s = await load();
    const n = name.trim();
    if (!n) return s.lists;
    if (!s.lists.some((l) => l.name.toLowerCase() === n.toLowerCase())) {
      s.lists.push({ id: s.listSeq++, name: n, wordIds: [] });
      persist();
    }
    return s.lists;
  },

  async renameList(id: number, name: string): Promise<WordList[]> {
    const s = await load();
    const n = name.trim();
    if (!n) return s.lists;
    const list = s.lists.find((l) => l.id === id);
    if (list) { list.name = n; persist(); }
    return s.lists;
  },

  async deleteList(id: number): Promise<WordList[]> {
    const s = await load();
    s.lists = s.lists.filter((l) => l.id !== id);
    for (const w of s.words) w.listIds = w.listIds.filter((lid) => lid !== id);
    persist();
    return s.lists;
  },

  async toggleWordInList(wordId: number, listId: number): Promise<WordList[]> {
    const s = await load();
    const list = s.lists.find((l) => l.id === listId);
    const word = s.words.find((w) => w.id === wordId);
    if (!list || !word) return s.lists;
    const inList = list.wordIds.includes(wordId);
    if (inList) {
      list.wordIds = list.wordIds.filter((id) => id !== wordId);
      word.listIds = word.listIds.filter((lid) => lid !== listId);
    } else {
      list.wordIds.push(wordId);
      if (!word.listIds.includes(listId)) word.listIds.push(listId);
    }
    persist();
    return s.lists;
  },

  async reset(scope: "progress" | "words" | "everything"): Promise<void> {
    const s = await load();
    if (scope === "progress") {
      for (const w of s.words) {
        w.status = "new";
        w.bookmarked = false;
        w.correctCount = 0;
        w.wrongCount = 0;
        w.consecutiveCorrect = 0;
        w.consecutiveWrong = 0;
        w.reviewStage = 0;
        w.lastPracticed = null;
        w.nextReview = null;
      }
      s.days = [];
      s.mistakes = [];
    } else if (scope === "words") {
      s.words = [];
      s.lists = s.lists.map((l) => ({ ...l, wordIds: [] }));
      s.mistakes = [];
      s.days = [];
      s.wordSeq = 1;
    } else {
      const seed = makeSeed();
      memory = { ...seed, settings: s.settings };
      persist();
      return;
    }
    persist();
  },

  // utility for export
  async exportAll() {
    const s = await load();
    return s;
  },
};

export function clearAllLocal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
    window.localStorage.removeItem("ielts-spelling-cache-v2");
  } catch {}
  try {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    void req;
  } catch {}
  memory = null;
}
