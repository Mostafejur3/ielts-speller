import { isDue, shuffle, smartSort, weightedShuffle } from "./srs";
import type { SessionConfig, Word } from "./types";

export function filterBySource(words: Word[], config: SessionConfig): Word[] {
  const byCategory = config.category && config.category !== "all"
    ? words.filter((w) => w.category === config.category)
    : words;

  switch (config.source) {
    case "new":
      return byCategory.filter((w) => w.status === "new");
    case "weak":
      return byCategory.filter((w) => w.status === "weak");
    case "review":
      return byCategory.filter((w) => w.status === "review");
    case "bookmarked":
      return byCategory.filter((w) => w.bookmarked);
    case "complete":
      return byCategory.filter((w) => w.status === "complete");
    case "due":
      return byCategory.filter((w) => isDue(w) && w.status !== "new");
    case "list":
      return byCategory.filter((w) => w.listIds.includes(config.listId ?? -1));
    default:
      return byCategory;
  }
}

export function buildQueue(words: Word[], config: SessionConfig): Word[] {
  let pool = filterBySource(words, config);

  // smart review always keeps due + weak words in the mix
  if (config.source === "all" && config.order !== "az") {
    const due = pool.filter((w) => isDue(w));
    if (due.length) pool = due;
  }

  let ordered: Word[];
  if (config.order === "az") {
    ordered = pool.slice().sort((a, b) => a.word.localeCompare(b.word));
  } else if (config.order === "smart") {
    ordered = smartSort(pool);
  } else {
    ordered = shuffle(pool);
  }

  const count = config.count === "all" ? ordered.length : Math.min(Number(config.count), ordered.length);
  return ordered.slice(0, count);
}

/** Random practice queue with weak words weighted higher. */
export function buildWeightedQueue(words: Word[], config: SessionConfig, limit: number): Word[] {
  const pool = filterBySource(words, config);
  const ordered =
    config.order === "az" ? pool.slice().sort((a, b) => a.word.localeCompare(b.word)) : weightedShuffle(pool);
  return ordered.slice(0, limit);
}
