"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/app-store";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";
import type { Settings } from "@/lib/types";
import { Badge, Button, Card, Field, Modal, SectionTitle, Segmented, Select, TextInput, Toggle } from "@/components/ui";
import { IconAlert, IconDownload, IconPlay, IconSpeaker, IconTrash } from "@/components/icons";

const RATES = [0.7, 0.8, 0.9, 1.0];
const GOALS = [10, 20, 30, 50];

export function SettingsPage() {
  const { settings, words, actions, stats } = useStore();
  const { voices, say, supported, voice } = useSpeech();
  const [confirm, setConfirm] = useState<null | "progress" | "words" | "everything">(null);
  const goalValue = String(settings.dailyGoal ?? 20);
  const [goal, setGoal] = useState(goalValue);
  const [lastGoal, setLastGoal] = useState(goalValue);
  if (goalValue !== lastGoal) {
    setLastGoal(goalValue);
    setGoal(goalValue);
  }

  const update = (patch: Partial<Settings>) => void actions.saveSettings(patch);

  const exportJson = () => {
    const payload = words.map((w) => ({
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
      correctCount: w.correctCount,
      wrongCount: w.wrongCount,
      lastPracticed: w.lastPracticed,
      nextReview: w.nextReview,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spelling-lab-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    actions.toast(`Exported ${words.length} words`, "success");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="p-5">
        <SectionTitle title="Pronunciation" hint="Browser speech synthesis — British English is the IELTS default." />
        {!supported && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger">
            <IconAlert size={14} /> This browser does not expose speech synthesis. Audio buttons are disabled.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Accent">
            <Segmented
              value={settings.accent}
              onChange={(accent) => update({ accent })}
              options={[
                { value: "en-GB", label: "British" },
                { value: "en-US", label: "American" },
              ]}
            />
          </Field>
          <Field label="Speed">
            <Segmented
              value={String(settings.rate)}
              onChange={(rate) => update({ rate: Number(rate) })}
              options={RATES.map((r) => ({ value: String(r), label: `${r}×` }))}
            />
          </Field>
          <Field label="Voice" hint={voice ? `Active: ${voice.name}` : "No English voice detected"} className="sm:col-span-2">
            <div className="flex gap-2">
              <Select
                value={settings.voiceURI}
                onChange={(e) => update({ voiceURI: e.target.value })}
                disabled={!voices.length}
              >
                <option value="">Best available for {settings.accent === "en-GB" ? "British" : "American"} English</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                icon={<IconPlay size={14} />}
                onClick={() => say("accommodation", { rate: settings.rate })}
                disabled={!supported}
              >
                Test
              </Button>
            </div>
          </Field>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[12.5px] text-muted">
          <IconSpeaker size={14} />
          {voices.length} English voice{voices.length === 1 ? "" : "s"} available
          {settings.voiceURI === "" && voice && <Badge tone="neutral">auto: {voice.name}</Badge>}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Practice flow" hint="Tune the keyboard-first workflow." />
        <div className="mt-2 divide-y divide-line">
          <Toggle
            label="Auto play audio"
            description="Pronounce each word ~400 ms after it loads — pure listening practice."
            checked={settings.autoPlay}
            onChange={(v) => update({ autoPlay: v })}
          />
          <Toggle
            label="Auto focus typing field"
            description="Jump straight into the answer box so you never touch the mouse."
            checked={settings.autoFocus}
            onChange={(v) => update({ autoFocus: v })}
          />
          <Toggle
            label="Show shortcut hints"
            description="Display the small key chips next to actions (1, 2, 3…)."
            checked={settings.showShortcuts}
            onChange={(v) => update({ showShortcuts: v })}
          />
          <Toggle
            label="Strict answer mode"
            description="Require exact punctuation and hyphens. Off = case, spaces and punctuation are ignored."
            checked={settings.strictMode}
            onChange={(v) => update({ strictMode: v })}
          />
          <Toggle
            label="Shuffle mode"
            description="Randomise new sessions by default instead of alphabetical order."
            checked={settings.shuffleMode}
            onChange={(v) => update({ shuffleMode: v })}
          />
          <Toggle
            label="Show meaning in Learn mode"
            checked={settings.showMeaning}
            onChange={(v) => update({ showMeaning: v })}
          />
          <Toggle
            label="Show translation in Learn mode"
            checked={settings.showTranslation}
            onChange={(v) => update({ showTranslation: v })}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Daily goal" hint={`Today: ${stats.todayPracticed} / ${settings.dailyGoal}`} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update({ dailyGoal: g })}
                className={cn(
                  "h-10 min-w-[56px] rounded-xl border px-3 text-[13px] font-semibold transition-all",
                  settings.dailyGoal === g
                    ? "border-transparent bg-brand text-brand-contrast"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <Field label="Custom" className="mt-3">
            <div className="flex gap-2">
              <TextInput
                type="number"
                min={1}
                max={500}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                aria-label="Custom daily goal"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const n = Math.max(1, Math.min(500, Number(goal) || 20));
                  update({ dailyGoal: n });
                }}
              >
                Save
              </Button>
            </div>
          </Field>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Appearance" hint="Light by default, dark for night drills." />
          <div className="mt-3">
            <Segmented
              value={settings.darkMode ? "dark" : "light"}
              onChange={(mode) => update({ darkMode: mode === "dark" })}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
          <div className="mt-4">
            <Toggle
              label="Dark mode"
              description="Follows the toggle above instantly."
              checked={settings.darkMode}
              onChange={(v) => update({ darkMode: v })}
            />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Your data" hint="Progress is stored in the database and cached locally for instant loads." />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" icon={<IconDownload size={15} />} onClick={exportJson}>
            Export library ({words.length})
          </Button>
          <Button variant="warning" icon={<IconTrash size={15} />} onClick={() => setConfirm("progress")}>
            Reset progress
          </Button>
          <Button variant="danger" icon={<IconTrash size={15} />} onClick={() => setConfirm("words")}>
            Delete all words
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
          {[
            ["Words", stats.totalWords],
            ["Answers", stats.totalCorrect + stats.totalWrong],
            ["Bookmarks", stats.bookmarked],
            ["Streak", `${stats.streak}d`],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-line bg-surface-2 px-3 py-2">
              <dt className="text-muted">{label as string}</dt>
              <dd className="tabular font-display text-lg font-bold text-ink">{value as number}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "progress" ? "Reset all progress?" : confirm === "words" ? "Delete every word?" : "Factory reset?"}
        description="This cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const scope = confirm ?? "progress";
                setConfirm(null);
                try {
                  await actions.reset(scope);
                } catch {
                  actions.toast("Reset failed", "error");
                }
              }}
            >
              Yes, continue
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {confirm === "progress"
            ? "Every word keeps its spelling, meaning and category — statuses, streaks, accuracy and session history are cleared."
            : "Your whole word bank is removed. Export a backup first if you might need it."}
        </p>
      </Modal>
    </div>
  );
}
