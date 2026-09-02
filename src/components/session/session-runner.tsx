"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/app-store";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useSpeech } from "@/hooks/use-speech";
import { isAnswerCorrect } from "@/lib/answers";
import { formatDuration, relativeTime } from "@/lib/stats";
import { accuracyOf } from "@/lib/srs";
import type { SessionConfig, SessionMode, Word, WordStatus } from "@/lib/types";
import { Badge, Button, Card, DifficultyBadge, EmptyState, IconButton, Kbd, ProgressBar, StatusBadge } from "@/components/ui";
import { IconBookmark, IconChevronLeft, IconChevronRight, IconEye, IconEyeOff, IconLibrary, IconX } from "@/components/icons";
import { AnswerInput, AudioButton, BookmarkButton, ShortcutChip, StatusButtons } from "./controls";
import { WordDifference } from "./word-difference";
import { SessionSummary, type SummaryData } from "./session-summary";

interface ResultEntry {
  wordId: number;
  word: string;
  answer: string;
  correct: boolean;
  attempts: number;
}

type Phase = "answer" | "checked";
type FlashKey = "hear" | "bookmark" | "input" | WordStatus | null;

export function SessionRunner({
  queue,
  mode,
  config,
  onExit,
  onPracticeMistakes,
}: {
  queue: Word[];
  mode: SessionMode;
  config: SessionConfig;
  onExit: () => void;
  onPracticeMistakes: (wordIds: number[]) => void;
}) {
  const { words, settings, actions } = useStore();
  const { say, speaking, supported } = useSpeech();

  const wordById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answer");
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [flash, setFlash] = useState<FlashKey>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [marked, setMarked] = useState({ complete: 0, review: 0, weak: 0 });
  const [finished, setFinished] = useState(false);
  const [lastResult, setLastResult] = useState<ResultEntry | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const pendingRef = useRef<Omit<ResultEntry, "word">[]>([]);
  const flashTimer = useRef<number | null>(null);
  const autoTimer = useRef<number | null>(null);

  const snapshot = queue[index];
  const word: Word | undefined = snapshot ? (wordById.get(snapshot.id) ?? snapshot) : undefined;

  const doFlash = useCallback((key: FlashKey) => {
    setFlash(key);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 280);
  }, []);

  const flush = useCallback(() => {
    const items = pendingRef.current;
    if (!items.length) return;
    pendingRef.current = [];
    void actions.recordAnswers({
      items,
      mode,
      durationMs: Date.now() - startedAt.current,
      config,
    });
  }, [actions, config, mode]);

  useEffect(() => () => flush(), [flush]);

  const hear = useCallback(
    (target?: Word) => {
      const w = target ?? word;
      if (!w) return;
      const ok = say(w.pronunciation?.trim() || w.word);
      if (!ok && supported) actions.toast("Audio is unavailable right now", "warning");
      doFlash("hear");
    },
    [actions, doFlash, say, supported, word],
  );

  const focusInput = useCallback(() => {
    if (mode === "learn") return;
    if (document.activeElement === inputRef.current) return;
    inputRef.current?.focus();
    doFlash("input");
  }, [doFlash, mode]);

  const goTo = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(queue.length - 1, nextIndex));
      setIndex(clamped);
      setPhase("answer");
      setTyped("");
      setAttempts(1);
      setLastResult(null);
      setHidden(false);
    },
    [queue.length],
  );

  const finish = useCallback(() => {
    flush();
    setFinished(true);
  }, [flush]);

  const next = useCallback(() => {
    if (index + 1 >= queue.length) {
      finish();
      return;
    }
    if (pendingRef.current.length >= 6) flush();
    goTo(index + 1);
  }, [finish, flush, goTo, index, queue.length]);

  const prev = useCallback(() => {
    if (index === 0) return;
    goTo(index - 1);
  }, [goTo, index]);

  const check = useCallback(() => {
    if (mode === "learn") {
      if (hidden) setHidden(false);
      else next();
      return;
    }
    if (phase === "checked") {
      next();
      return;
    }
    if (!word) return;
    if (!typed.trim()) {
      actions.toast("Type your answer first", "warning");
      hear(word);
      focusInput();
      return;
    }
    const correct = isAnswerCorrect(typed, word.word, Boolean(settings.strictMode));
    const entry: ResultEntry = { wordId: word.id, word: word.word, answer: typed.trim(), correct, attempts };
    setLastResult(entry);
    setPhase("checked");
    setResults((prevResults) => [...prevResults.filter((r) => r.wordId !== word.id), entry]);
    pendingRef.current.push({ wordId: entry.wordId, answer: entry.answer, correct: entry.correct, attempts: entry.attempts });
    if (pendingRef.current.length >= 6) flush();
  }, [actions, attempts, flush, focusInput, hear, hidden, mode, next, phase, settings.strictMode, typed, word]);

  const tryAgain = useCallback(() => {
    setPhase("answer");
    setTyped("");
    setAttempts((a) => a + 1);
    setLastResult(null);
    focusInput();
  }, [focusInput]);

  const setStatus = useCallback(
    (status: WordStatus) => {
      if (!word) return;
      void actions.setStatus([word.id], status);
      doFlash(status);
      setMarked((m) => ({
        complete: m.complete + (status === "complete" ? 1 : 0),
        review: m.review + (status === "review" ? 1 : 0),
        weak: m.weak + (status === "weak" ? 1 : 0),
      }));
    },
    [actions, doFlash, word],
  );

  const toggleBookmark = useCallback(() => {
    if (!word) return;
    void actions.toggleBookmark(word.id);
    doFlash("bookmark");
  }, [actions, doFlash, word]);

  // auto-play + auto-focus when a new word loads
  useEffect(() => {
    if (finished || !word) return;
    const shouldAuto = config.audio === "auto" || settings.autoPlay;
    if (!shouldAuto) return;
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(
      () => {
        hear(word);
        if (settings.autoFocus && mode !== "learn") {
          window.setTimeout(() => inputRef.current?.focus(), 60);
        }
      },
      mode === "learn" ? 250 : 400,
    );
    return () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finished, config.audio, settings.autoPlay]);

  useHotkeys({
    "1": () => hear(),
    "2": () => focusInput(),
    "3": () => toggleBookmark(),
    b: () => toggleBookmark(),
    "4": () => setStatus("complete"),
    c: () => setStatus("complete"),
    "5": () => setStatus("review"),
    n: () => setStatus("review"),
    "6": () => setStatus("weak"),
    w: () => setStatus("weak"),
    r: () => hear(),
    space: () => hear(),
    h: () => {
      if (mode !== "learn") return;
      setHidden((v) => !v);
      doFlash("hear");
    },
    enter: () => check(),
    arrowright: () => next(),
    arrowleft: () => prev(),
    escape: () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
  });

  const summary: SummaryData = useMemo(() => {
    const correct = results.filter((r) => r.correct).length;
    const wrong = results.length - correct;
    return {
      mode,
      total: queue.length,
      answered: results.length,
      correct,
      wrong,
      accuracy: accuracyOf(correct, wrong),
      durationMs: Date.now() - startedAt.current,
      marked,
      mistakes: results.filter((r) => !r.correct),
    };
  }, [marked, mode, queue.length, results]);

  if (!queue.length) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={<IconLibrary size={22} />}
          title="No words in this queue"
          description="Adjust the filters or import words first — every session needs at least one word."
          action={
            <Button variant="primary" onClick={onExit}>
              Back
            </Button>
          }
        />
      </Card>
    );
  }

  if (finished && word) {
    return (
      <SessionSummary
        data={summary}
        onExit={onExit}
        onRestart={() => {
          startedAt.current = Date.now();
          pendingRef.current = [];
          setResults([]);
          setMarked({ complete: 0, review: 0, weak: 0 });
          setFinished(false);
          goTo(0);
        }}
        onPracticeMistakes={() => onPracticeMistakes(summary.mistakes.map((m) => m.wordId))}
      />
    );
  }

  if (!word) return null;

  const answered = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const wordAccuracy = accuracyOf(word.correctCount, word.wrongCount);
  const showHints = settings.showShortcuts !== false;
  const isLearn = mode === "learn";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ------------------------------------------------------- main stage */}
      <div className="min-w-0 space-y-3">
        <Card className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <IconButton label="Exit session" size="sm" onClick={onExit}>
            <IconX size={16} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="tabular text-[12.5px] font-semibold text-ink">
                {index + 1} <span className="text-muted">/ {queue.length}</span>
              </p>
              <p className="truncate text-[12px] text-muted">
                {word.category} · {answered} answered · {correctCount} correct
              </p>
            </div>
            <ProgressBar value={index + (phase === "checked" ? 1 : 0)} max={queue.length} className="mt-1.5" size="sm" />
          </div>
          <StatusBadge status={word.status} />
        </Card>

        <Card className="relative overflow-hidden px-4 py-6 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.35]" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-5">
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              <Badge tone="neutral">{word.category}</Badge>
              {mode !== "test" && <DifficultyBadge difficulty={word.difficulty} />}
              {mode !== "test" &&
                word.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} tone="info">
                    #{tag}
                  </Badge>
                ))}
              <BookmarkButton active={word.bookmarked} onToggle={toggleBookmark} flash={flash === "bookmark"} showHint={showHints} size="sm" />
            </div>

            {isLearn ? (
              <div className="flex w-full flex-col items-center gap-5">
                <div
                  className={cn(
                    "font-display min-h-[70px] w-full text-center text-[clamp(2rem,9vw,3.75rem)] leading-tight font-bold tracking-[-0.02em] text-ink transition-all duration-200",
                    hidden && "select-none blur-[14px] opacity-25",
                  )}
                  aria-live="polite"
                >
                  {hidden ? word.word.replace(/[^\s]/g, "•") : word.word}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setHidden((v) => !v)}
                    icon={hidden ? <IconEye size={17} /> : <IconEyeOff size={17} />}
                  >
                    {hidden ? "Show word" : "Hide word"}
                    <ShortcutChip show={showHints}>H</ShortcutChip>
                  </Button>
                  <AudioButton onPlay={() => hear()} speaking={speaking} flash={flash === "hear"} supported={supported} size="md" showHint={false} />
                </div>
                {(settings.showMeaning || settings.showTranslation) && (word.meaning || word.translation) && (
                  <div className="max-w-xl text-center">
                    {settings.showMeaning && word.meaning && <p className="text-[14.5px] text-ink-soft">{word.meaning}</p>}
                    {settings.showTranslation && word.translation && (
                      <p className="mt-1 text-[14px] font-medium text-accent">{word.translation}</p>
                    )}
                  </div>
                )}
                {word.notes && <p className="max-w-xl text-center text-[13px] text-muted italic">{word.notes}</p>}
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-5">
                <AudioButton
                  onPlay={() => hear()}
                  speaking={speaking}
                  flash={flash === "hear"}
                  supported={supported}
                  hint={showHints ? "1" : ""}
                  showHint={showHints}
                />

                {!supported && (
                  <p className="rounded-xl bg-warn-soft px-3 py-2 text-center text-[12.5px] font-medium text-warn">
                    This browser has no speech synthesis. Pronunciation is disabled.
                  </p>
                )}

                <div className="w-full max-w-xl">
                  <AnswerInput
                    ref={inputRef}
                    value={typed}
                    onChange={setTyped}
                    state={phase === "checked" ? (lastResult?.correct ? "correct" : "wrong") : "idle"}
                    disabled={phase === "checked"}
                    placeholder={mode === "test" ? "Listen and type the spelling…" : "Type the spelling…"}
                  />
                  <p className="mt-2 text-center text-[12px] text-muted">
                    {phase === "checked" ? (
                      <span className="font-semibold">
                        Press <Kbd>Enter</Kbd> or <Kbd>→</Kbd> to continue
                      </span>
                    ) : (
                      <>
                        Attempt {attempts} · press <Kbd>Enter</Kbd> to check
                        {showHints && (
                          <>
                            {" · "}
                            <Kbd>2</Kbd> refocus
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>

                {phase === "checked" && lastResult && (
                  <div
                    className={cn(
                      "w-full max-w-xl animate-rise rounded-2xl border p-4",
                      lastResult.correct ? "border-ok/30 bg-ok-soft/60" : "border-danger/30 bg-danger-soft/40",
                    )}
                    role="status"
                  >
                    {lastResult.correct ? (
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok text-white">✓</span>
                        <div>
                          <p className="font-display text-lg font-bold text-ink">{word.word}</p>
                          <p className="text-[12.5px] text-ok">Correct spelling</p>
                        </div>
                      </div>
                    ) : (
                      <WordDifference expected={word.word} typed={lastResult.answer} />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {phase === "answer" ? (
                    <>
                      <Button variant="primary" size="lg" onClick={check}>
                        Check
                        <ShortcutChip show={showHints}>↵</ShortcutChip>
                      </Button>
                      <Button variant="secondary" size="lg" onClick={() => hear()}>
                        Hear again
                        <ShortcutChip show={showHints}>R</ShortcutChip>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="primary" size="lg" onClick={next}>
                        Next word
                        <ShortcutChip show={showHints}>→</ShortcutChip>
                      </Button>
                      {!lastResult?.correct && mode === "practice" && (
                        <Button variant="secondary" size="lg" onClick={tryAgain}>
                          Try again
                        </Button>
                      )}
                      <Button variant="ghost" size="lg" onClick={() => hear()}>
                        Hear again
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* navigation + classification */}
        <Card className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={prev} disabled={index === 0} icon={<IconChevronLeft size={15} />}>
              Previous
            </Button>
            <Button variant="secondary" onClick={next} trailing={<IconChevronRight size={15} />}>
              {index + 1 >= queue.length ? "Finish" : "Next"}
            </Button>
          </div>
          <StatusButtons
            onSet={setStatus}
            flash={flash as WordStatus | null}
            showHints={showHints}
            className="w-full sm:w-auto"
          />
        </Card>
      </div>

      {/* ------------------------------------------------------ side panel */}
      <aside className="hidden space-y-3 lg:block">
        <Card className="p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">This session</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Correct" value={correctCount} tone="text-ok" />
            <MiniStat label="Wrong" value={answered - correctCount} tone="text-danger" />
            <MiniStat label="Accuracy" value={`${accuracyOf(correctCount, answered - correctCount)}%`} tone="text-ink" />
          </div>
          <p className="mt-3 text-[12px] text-muted">Elapsed {formatDuration(Date.now() - startedAt.current)}</p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Word</p>
          <p className="font-display mt-1 truncate text-lg font-bold text-ink">
            {isLearn ? (hidden ? "Hidden — recall it" : word.word) : phase === "checked" ? word.word : "Hidden until you check"}
          </p>
          <dl className="mt-3 space-y-1.5 text-[12.5px]">
            <Row label="Attempts" value={`${word.correctCount + word.wrongCount}`} />
            <Row label="Correct" value={`${word.correctCount}`} />
            <Row label="Wrong" value={`${word.wrongCount}`} />
            <Row label="Accuracy" value={`${wordAccuracy}%`} />
            <Row label="Last practiced" value={relativeTime(word.lastPracticed)} />
            <Row
              label="Next review"
              value={word.nextReview ? new Date(word.nextReview).toLocaleDateString() : "—"}
            />
          </dl>
        </Card>

        {showHints && (
          <Card className="p-4">
            <p className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Shortcuts</p>
            <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-soft">
              {[
                ["1", "Hear word"],
                ["2", "Focus input"],
                ["Enter", "Check / next"],
                ["← →", "Prev / next"],
                ["3 B", "Bookmark"],
                ["4 C", "Complete"],
                ["5 N", "Need review"],
                ["6 W", "Weak"],
                ...(isLearn ? ([["H", "Hide / reveal"]] as [string, string][]) : []),
              ].map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <span className="flex gap-1">
                    {key.split(" ").map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </aside>

      {/* --------------------------------------------------- mobile actions */}
      <div className="fixed inset-x-0 bottom-[57px] z-40 border-t border-line bg-surface/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <IconButton label="Hear word" onClick={() => hear()} flash={flash === "hear"} className="bg-brand text-brand-contrast">
              <AudioGlyph speaking={speaking} />
            </IconButton>
            <IconButton
              label="Bookmark"
              onClick={toggleBookmark}
              flash={flash === "bookmark"}
              className={cn("border border-line", word.bookmarked ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted")}
            >
              <IconBookmark size={17} className={word.bookmarked ? "fill-current" : undefined} />
            </IconButton>
          </div>
          <StatusButtons onSet={setStatus} flash={flash as WordStatus | null} showHints={false} size="sm" />
        </div>
      </div>
    </div>
  );
}

function AudioGlyph({ speaking }: { speaking: boolean }) {
  return (
    <span className={cn("flex items-center gap-0.5", speaking && "animate-pulse")}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z" />
        <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
        <path d="M18 6.4a8 8 0 0 1 0 11.2" />
      </svg>
    </span>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <p className={cn("tabular font-display text-xl font-bold", tone)}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular truncate font-medium text-ink">{value}</dd>
    </div>
  );
}
