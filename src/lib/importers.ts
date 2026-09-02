import type { ImportRow, ParsedImport } from "./types";

export function normalizeWordText(raw: string): string {
  return raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeKey(raw: string): string {
  return normalizeWordText(raw).toLowerCase().replace(/\.$/, "");
}

/** Normalises a capitalisation: keeps proper nouns, lowercases shouting rows. */
export function normalizeCapitalization(raw: string): string {
  const word = normalizeWordText(raw);
  if (!word) return word;
  const letters = word.replace(/[^A-Za-z]/g, "");
  if (letters.length > 1 && letters === letters.toUpperCase() && /[A-Z]/.test(letters)) {
    return word
      .toLowerCase()
      .replace(/(^|[\s-])([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  }
  return word;
}

function toRow(record: Record<string, unknown>, line: number): ImportRow | null {
  const raw = record.word ?? record.Word ?? record.WORD ?? record.spelling ?? record.term ?? "";
  const word = normalizeCapitalization(String(raw ?? ""));
  if (!word) return null;
  void line;
  const tags = record.tags ?? record.Tags;
  return {
    word,
    category: record.category ? normalizeWordText(String(record.category)) : undefined,
    meaning: record.meaning ? String(record.meaning).trim() : undefined,
    translation: record.translation ? String(record.translation).trim() : undefined,
    pronunciation: record.pronunciation ? String(record.pronunciation).trim() : undefined,
    difficulty: record.difficulty ? String(record.difficulty).trim().toLowerCase() : undefined,
    notes: record.notes ? String(record.notes).trim() : undefined,
    tags: Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : typeof tags === "string"
        ? tags
            .split(/[|;]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
  };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === "\t" || ch === ";") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim()));
}

const HEADER_ALIASES: Record<string, string> = {
  word: "word",
  spelling: "word",
  term: "word",
  english: "word",
  category: "category",
  topic: "category",
  group: "category",
  meaning: "meaning",
  definition: "meaning",
  translation: "translation",
  bangla: "translation",
  bn: "translation",
  pronunciation: "pronunciation",
  phonetic: "pronunciation",
  difficulty: "difficulty",
  level: "difficulty",
  notes: "notes",
  note: "notes",
  tags: "tags",
  tag: "tags",
};

function mapHeaders(header: string[]): (string | null)[] {
  return header.map((h) => HEADER_ALIASES[normalizeKey(h).replace(/\s+/g, "")] ?? null);
}

export function parseJson(text: string): ImportRow[] {
  const data = JSON.parse(text);
  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.words)
      ? data.words
      : Array.isArray(data?.data)
        ? data.data
        : [data];
  return items
    .map((item) =>
      typeof item === "string"
        ? toRow({ word: item }, 0)
        : toRow((item ?? {}) as Record<string, unknown>, 0),
    )
    .filter((r): r is ImportRow => Boolean(r));
}

export function parseCsvText(text: string): ImportRow[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.length > 0));
  if (!rows.length) return [];
  const first = rows[0].map((c) => normalizeKey(c).replace(/\s+/g, ""));
  const hasHeader = first.some((c) => HEADER_ALIASES[c] !== undefined);
  const keys = hasHeader ? mapHeaders(rows[0]) : ["word", "category", "meaning", "translation"];
  const body = hasHeader ? rows.slice(1) : rows;
  return body
    .map((r) => {
      const record: Record<string, unknown> = {};
      keys.forEach((key, idx) => {
        if (key && r[idx] !== undefined) record[key] = r[idx];
      });
      if (!record.word && r[0]) record.word = r[0];
      return toRow(record, 0);
    })
    .filter((r): r is ImportRow => Boolean(r));
}

export function parseTxt(text: string): ImportRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[|\t;]/);
      const record: Record<string, unknown> = { word: parts[0] };
      if (parts[1]) record.category = parts[1];
      if (parts[2]) record.meaning = parts[2];
      if (parts[3]) record.translation = parts[3];
      return toRow(record, 0);
    })
    .filter((r): r is ImportRow => Boolean(r));
}

export type ImportFormat = "json" | "csv" | "txt" | "auto";

export function detectFormat(filename: string, text: string): Exclude<ImportFormat, "auto"> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return "json";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "txt") return "txt";
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  if (trimmed.split(/\r?\n/)[0]?.includes(",")) return "csv";
  return "txt";
}

export function parseImport(
  text: string,
  format: ImportFormat = "auto",
  filename = "",
  existing: string[] = [],
): ParsedImport {
  const fmt = format === "auto" ? detectFormat(filename, text) : format;
  const invalid: ParsedImport["invalid"] = [];
  let rows: ImportRow[] = [];
  try {
    if (fmt === "json") rows = parseJson(text);
    else if (fmt === "csv") rows = parseCsvText(text);
    else rows = parseTxt(text);
  } catch (err) {
    invalid.push({
      line: 1,
      reason: err instanceof Error ? err.message : "Could not parse this file",
      raw: text.slice(0, 120),
    });
  }

  const existingKeys = new Set(existing.map(normalizeKey));
  const seen = new Set<string>();
  const clean: ImportRow[] = [];
  const duplicates: number[] = [];

  rows.forEach((row, index) => {
    const key = normalizeKey(row.word);
    if (!key || key.length > 120) {
      invalid.push({ line: index + 1, reason: "Empty or invalid word", raw: row.word });
      return;
    }
    if (existingKeys.has(key) || seen.has(key)) {
      duplicates.push(index);
      return;
    }
    seen.add(key);
    clean.push({ ...row, word: row.word });
  });

  return { rows: clean, invalid, duplicates, source: fmt };
}
