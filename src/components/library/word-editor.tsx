"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/app-store";
import type { Difficulty, Word, WordStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Badge, Button, Field, Modal, Select, TextArea, TextInput } from "@/components/ui";
import { IconPlus, IconX } from "@/components/icons";

export interface WordDraft {
  id?: number;
  word: string;
  category: string;
  meaning: string;
  translation: string;
  pronunciation: string;
  difficulty: Difficulty;
  notes: string;
  tags: string[];
  status: WordStatus;
  bookmarked: boolean;
}

export const emptyDraft = (category = "General"): WordDraft => ({
  word: "",
  category,
  meaning: "",
  translation: "",
  pronunciation: "",
  difficulty: "medium",
  notes: "",
  tags: [],
  status: "new",
  bookmarked: false,
});

export function WordEditor({
  open,
  draft,
  onClose,
  onChange,
}: {
  open: boolean;
  draft: WordDraft;
  onClose: () => void;
  onChange: (next: WordDraft) => void;
}) {
  const { categories, lists, actions, words } = useStore();
  const [tagInput, setTagInput] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (open) {
      // reset transient field state whenever the editor is re-opened
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagInput("");
      setNewCategory("");
    }
  }, [open, draft.id]);

  const set = <K extends keyof WordDraft>(key: K, value: WordDraft[K]) => onChange({ ...draft, [key]: value });

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag) return;
    if (!draft.tags.includes(tag)) set("tags", [...draft.tags, tag]);
    setTagInput("");
  };

  const save = async () => {
    if (!draft.word.trim()) {
      actions.toast("Word cannot be empty", "error");
      return;
    }
    if (draft.id) {
      const { id, ...patch } = draft;
      await actions.patchWord(id, patch as Partial<Word>);
      actions.toast(`${draft.word} updated`, "success");
    } else {
      const res = await actions.importWords([
        {
          word: draft.word,
          category: draft.category,
          meaning: draft.meaning,
          translation: draft.translation,
          pronunciation: draft.pronunciation,
          difficulty: draft.difficulty,
          notes: draft.notes,
          tags: draft.tags,
        },
      ]);
      if (res.created === 0) {
        actions.toast("That word already exists in your library", "warning");
        onClose();
        return;
      }
      actions.toast(`${draft.word} added`, "success");
    }
    onClose();
  };

  const existing = draft.id ? words.find((w) => w.id === draft.id) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={draft.id ? "Edit word" : "Add word"}
      description="Only the spelling is required — everything else is optional."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            {draft.id ? "Save changes" : "Add word"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Word / spelling">
          <TextInput
            autoFocus
            value={draft.word}
            onChange={(e) => set("word", e.target.value)}
            placeholder="accommodation"
            className="font-mono text-[15px] tracking-wide"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={draft.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {!categories.some((c) => c.name === draft.category) && <option value={draft.category}>{draft.category}</option>}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={draft.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
        </div>

        <div className="flex items-end gap-2">
          <Field label="New category" className="flex-1">
            <TextInput value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Health" />
          </Field>
          <Button
            variant="secondary"
            className="mb-0.5"
            icon={<IconPlus size={15} />}
            onClick={() => {
              const name = newCategory.trim();
              if (!name) return;
              void actions.createCategory(name);
              set("category", name);
              setNewCategory("");
            }}
          >
            Create
          </Button>
        </div>

        <Field label="Meaning (English)">
          <TextInput value={draft.meaning} onChange={(e) => set("meaning", e.target.value)} placeholder="a place where someone stays" />
        </Field>

        <Field label="Translation (Bangla / other)">
          <TextInput value={draft.translation} onChange={(e) => set("translation", e.target.value)} placeholder="আবাসন" />
        </Field>

        <Field label="Pronunciation text" hint="Spoken instead of the word when set (useful for homographs).">
          <TextInput value={draft.pronunciation} onChange={(e) => set("pronunciation", e.target.value)} placeholder="uh-kom-uh-DAY-shun" />
        </Field>

        <Field label="Notes">
          <TextArea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Double m, double c — the classic IELTS trap." />
        </Field>

        <Field label="Tags">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-2">
            {draft.tags.map((tag) => (
              <Badge key={tag} tone="info" className="gap-1 py-1">
                #{tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => set("tags", draft.tags.filter((t) => t !== tag))}>
                  <IconX size={11} />
                </button>
              </Badge>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="Add tag + Enter"
              className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[13px] text-ink placeholder:text-muted/70 focus:outline-none"
              aria-label="Add tag"
            />
          </div>
        </Field>

        {draft.id && (
          <div className="grid gap-4 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-2">
            <Field label="Status">
              <Select value={draft.status} onChange={(e) => set("status", e.target.value as WordStatus)}>
                {(Object.keys(STATUS_LABEL) as WordStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                variant={draft.bookmarked ? "primary" : "secondary"}
                block
                onClick={() => set("bookmarked", !draft.bookmarked)}
              >
                {draft.bookmarked ? "Bookmarked" : "Bookmark"}
              </Button>
            </div>
            {existing && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Lists</p>
                <div className="flex flex-wrap gap-1.5">
                  {lists.length === 0 && <span className="text-[12.5px] text-muted">No custom lists yet.</span>}
                  {lists.map((l) => {
                    const inList = existing.listIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => void actions.toggleWordInList(existing.id, l.id)}
                        className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          inList ? "border-transparent bg-brand text-brand-contrast" : "border-line bg-surface text-muted hover:text-ink"
                        }`}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
