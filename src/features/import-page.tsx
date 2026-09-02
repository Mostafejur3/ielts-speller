"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/store/app-store";
import { cn } from "@/lib/cn";
import { detectFormat, parseImport, type ImportFormat } from "@/lib/importers";
import type { ImportRow } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, ProgressBar, SectionTitle, Segmented, Select, TextArea } from "@/components/ui";
import { IconAlert, IconCheck, IconDownload, IconUpload, IconX } from "@/components/icons";

const JSON_EXAMPLE = `[
  {
    "word": "accommodation",
    "category": "Travel & Places",
    "meaning": "a place where someone stays",
    "translation": "আবাসন",
    "difficulty": "hard",
    "tags": ["IELTS", "listening"]
  },
  {
    "word": "curriculum",
    "category": "Academic"
  }
]`;

const CSV_EXAMPLE = `word,category,meaning,translation
accommodation,Travel & Places,a place where someone stays,আবাসন
curriculum,Academic,the subjects in a course,পাঠ্যক্রম`;

const TXT_EXAMPLE = `accommodation | Travel & Places
curriculum | Academic
questionnaire
receipt`;

export function ImportPage() {
  const { words, actions } = useStore();
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState("General");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return parseImport(text, format, fileName, words.map((w) => w.word));
  }, [fileName, format, text, words]);

  const detected = useMemo(() => (text.trim() ? detectFormat(fileName, text) : null), [fileName, text]);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFormat("auto");
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.onerror = () => actions.toast("Could not read that file", "error");
    reader.readAsText(file);
  };

  const rows: ImportRow[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((r) => ({ ...r, category: r.category?.trim() ? r.category : defaultCategory }));
  }, [defaultCategory, parsed]);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const finalRows = rows.filter((_, i) => !excluded.has(i));

  const commit = async () => {
    if (!finalRows.length) return;
    setBusy(true);
    try {
      const res = await actions.importWords(finalRows);
      actions.toast(`${res.created} words imported${res.skipped ? ` · ${res.skipped} duplicates skipped` : ""}`, "success");
      setText("");
      setFileName("");
      setExcluded(new Set());
    } catch {
      actions.toast("Import failed — please check the format", "error");
    } finally {
      setBusy(false);
    }
  };

  const example = format === "csv" ? CSV_EXAMPLE : format === "txt" ? TXT_EXAMPLE : JSON_EXAMPLE;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle
          title="Import words"
          hint="Bulk-load your own vocabulary from JSON, CSV or TXT. Only the word itself is required."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "file", label: "Upload file", icon: <IconUpload size={14} /> },
                { value: "paste", label: "Paste text" },
              ]}
            />

            {tab === "file" ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
                  dragging ? "border-brand bg-brand-soft" : "border-line bg-surface-2",
                )}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-brand shadow-sm">
                  <IconUpload size={22} />
                </span>
                <p className="text-[14px] font-semibold text-ink">Drag &amp; drop your file here</p>
                <p className="mt-1 text-[12.5px] text-muted">JSON, CSV, TSV or TXT · up to 10,000 rows</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/plain"
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                  aria-label="Choose a file to import"
                />
                <Button variant="primary" className="mt-4" onClick={() => fileRef.current?.click()}>
                  Choose file
                </Button>
                {fileName && (
                  <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
                    <IconCheck size={13} /> {fileName}
                    {detected && <Badge tone="neutral">{detected.toUpperCase()}</Badge>}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <TextArea
                  rows={12}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFileName("");
                  }}
                  placeholder={example}
                  className="font-mono text-[12.5px] leading-relaxed"
                  aria-label="Paste words"
                />
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Format">
                <Select value={format} onChange={(e) => setFormat(e.target.value as ImportFormat)}>
                  <option value="auto">Auto-detect{detected ? ` (${detected.toUpperCase()})` : ""}</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="txt">TXT (one word per line)</option>
                </Select>
              </Field>
              <Field label="Default category" hint="Used when a row has no category.">
                <Select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
                  {Array.from(new Set(["General", ...words.map((w) => w.category)])).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <Card className="bg-surface-2 p-4">
              <p className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Example format</p>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-line bg-surface p-3 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                {example}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setTab("paste")}>
                  Try it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<IconDownload size={14} />}
                  onClick={() => {
                    const blob = new Blob([example], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `spelling-lab-example.${format === "auto" ? "json" : format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </Button>
              </div>
            </Card>
            <Card className="p-4 text-[12.5px] leading-relaxed text-muted">
              <p className="mb-1.5 font-semibold text-ink">Rules</p>
              <ul className="space-y-1">
                <li>· Only <code className="font-mono text-ink">word</code> is mandatory.</li>
                <li>· Spaces are trimmed, SHOUTING is normalised.</li>
                <li>· Duplicates already in your library are skipped.</li>
                <li>· TXT supports <code className="font-mono text-ink">word | category | meaning</code>.</li>
                <li>· Nothing is saved until you confirm the preview.</li>
              </ul>
            </Card>
          </div>
        </div>
      </Card>

      {parsed && (
        <Card className="animate-rise overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ink">Import preview</h3>
              <p className="text-[12.5px] text-muted">
                {parsed.rows.length} valid · {parsed.duplicates.length} duplicates skipped · {parsed.invalid.length} invalid
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={parsed.rows.length} max={Math.max(1, parsed.rows.length + parsed.invalid.length)} className="w-24" size="sm" />
              <Button variant="primary" disabled={!finalRows.length || busy} onClick={() => void commit()}>
                {busy ? "Importing…" : `Import ${finalRows.length} words`}
              </Button>
            </div>
          </div>

          {parsed.invalid.length > 0 && (
            <div className="border-b border-line bg-danger-soft/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-danger">
                <IconAlert size={14} /> {parsed.invalid.length} row(s) could not be read
              </p>
              <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-auto text-[12px] text-danger/90">
                {parsed.invalid.slice(0, 8).map((inv, i) => (
                  <li key={i} className="truncate">
                    Line {inv.line}: {inv.reason} {inv.raw ? `— "${inv.raw}"` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState icon={<IconX size={22} />} title="Nothing to import" description="Every row was a duplicate or invalid. Check the format and try again." />
          ) : (
            <div className="max-h-[52vh] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="sticky top-0 bg-surface-2 text-[11px] tracking-[0.06em] text-muted uppercase">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 font-semibold">Word</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Meaning</th>
                    <th className="px-3 py-2 font-semibold">Translation</th>
                    <th className="px-3 py-2 font-semibold">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.slice(0, 300).map((row, i) => {
                    const off = excluded.has(i);
                    return (
                      <tr key={`${row.word}-${i}`} className={cn("transition-colors", off ? "opacity-40" : "hover:bg-surface-2")}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!off}
                            onChange={() =>
                              setExcluded((prev) => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                return next;
                              })
                            }
                            aria-label={`Include ${row.word}`}
                            className="h-4 w-4 accent-[var(--brand)]"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-ink">{row.word}</td>
                        <td className="px-3 py-2 text-muted">{row.category || defaultCategory}</td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-muted">{row.meaning || "—"}</td>
                        <td className="max-w-[140px] truncate px-3 py-2 text-muted">{row.translation || "—"}</td>
                        <td className="px-3 py-2 text-muted">{row.difficulty || "medium"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 300 && (
                <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
                  Showing first 300 of {rows.length} rows — all of them will be imported.
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
