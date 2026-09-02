"use client";

import { diffWords } from "@/lib/answers";
import { cn } from "@/lib/cn";

/**
 * Character level comparison between the expected spelling and the answer.
 * Missing characters are shown struck-through on the correct word, extra
 * characters are highlighted on the typed word.
 */
export function WordDifference({
  expected,
  typed,
  compact = false,
}: {
  expected: string;
  typed: string;
  compact?: boolean;
}) {
  const { expected: expTokens, typed: typedTokens } = diffWords(expected, typed);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <DiffRow
        label="You typed"
        tokens={typedTokens}
        fallback="(empty)"
        highlight="extra"
        size={compact ? "sm" : "md"}
      />
      <DiffRow
        label="Correct"
        tokens={expTokens}
        fallback=""
        highlight="missing"
        size={compact ? "sm" : "md"}
      />
    </div>
  );
}

function DiffRow({
  label,
  tokens,
  fallback,
  highlight,
  size,
}: {
  label: string;
  tokens: { char: string; kind: "ok" | "missing" | "extra" }[];
  fallback: string;
  highlight: "missing" | "extra";
  size: "sm" | "md";
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p
        className={cn(
          "font-mono break-words leading-tight font-semibold tracking-[0.06em]",
          size === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        {tokens.length === 0 && <span className="text-sm font-normal text-muted italic">{fallback}</span>}
        {tokens.map((t, i) => {
          const bad = t.kind === highlight;
          return (
            <span
              key={`${t.char}-${i}`}
              className={cn(
                "rounded-[3px] transition-colors",
                bad && highlight === "extra" && "bg-danger-soft text-danger underline decoration-danger decoration-2 underline-offset-4",
                bad && highlight === "missing" && "bg-ok-soft text-ok underline decoration-ok decoration-2 underline-offset-4",
                !bad && "text-ink",
                t.char === " " && "mx-[2px] inline-block w-2 border-b border-dashed border-line-strong",
              )}
            >
              {t.char === " " ? "\u00A0" : t.char}
            </span>
          );
        })}
      </p>
    </div>
  );
}
