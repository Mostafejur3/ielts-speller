"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, IconButton, Kbd } from "@/components/ui";
import { IconBookmark, IconCheck, IconAlert, IconRepeat, IconSpeaker, IconSpeakerOff } from "@/components/icons";
import type { WordStatus } from "@/lib/types";

export function ShortcutChip({ children, show = true }: { children: ReactNode; show?: boolean }) {
  if (!show) return null;
  return <Kbd className="ml-1.5">{children}</Kbd>;
}

interface AudioButtonProps {
  onPlay: () => void;
  speaking?: boolean;
  flash?: boolean;
  supported?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  showHint?: boolean;
  hint?: string;
  className?: string;
}

export const AudioButton = forwardRef<HTMLButtonElement, AudioButtonProps>(function AudioButton(
  {
    onPlay,
    speaking = false,
    flash = false,
    supported = true,
    size = "lg",
    label = "Hear word",
    showHint = true,
    hint = "1",
    className,
  },
  ref,
) {
  const dims = size === "lg" ? "h-20 w-20 sm:h-24 sm:w-24" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPlay}
      aria-label={label}
      title={supported ? `${label}${showHint ? ` (${hint})` : ""}` : "Speech synthesis unavailable"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full border transition-all duration-150 active:scale-95",
        "border-transparent bg-brand text-brand-contrast shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)]",
        "hover:bg-brand-hover",
        dims,
        speaking && "animate-pulse-ring",
        flash && "animate-flash",
        !supported && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {supported ? <IconSpeaker size={size === "lg" ? 34 : size === "md" ? 20 : 17} /> : <IconSpeakerOff size={size === "lg" ? 30 : 18} />}
      {size === "lg" && (
        <span className="absolute -right-1 -bottom-1 rounded-lg border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted shadow-sm">
          {hint}
        </span>
      )}
    </button>
  );
});

interface AnswerInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (next: string) => void;
  state?: "idle" | "correct" | "wrong";
}

export const AnswerInput = forwardRef<HTMLInputElement, AnswerInputProps>(function AnswerInput(
  { value, onChange, state = "idle", placeholder = "Type the spelling…", className, disabled, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Your spelling"
      aria-invalid={state === "wrong"}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="go"
      className={cn(
        "font-mono h-16 w-full rounded-2xl border-2 bg-surface px-4 text-center text-2xl font-semibold tracking-[0.12em] text-ink",
        "transition-all duration-200 placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/60",
        "focus:outline-none focus:ring-4 sm:h-[70px] sm:text-[28px]",
        state === "idle" && "border-line focus:border-brand focus:ring-brand/15",
        state === "correct" && "border-ok bg-ok-soft/50 focus:ring-ok/15",
        state === "wrong" && "animate-shake border-danger bg-danger-soft/40 focus:ring-danger/15",
        disabled && "opacity-60",
        className,
      )}
      {...props}
    />
  );
});

export const STATUS_ACTIONS: { status: WordStatus; label: string; key: string; short: string; icon: ReactNode; variant: "success" | "warning" | "danger" }[] = [
  { status: "complete", label: "Complete", key: "4", short: "✓", icon: <IconCheck size={16} />, variant: "success" },
  { status: "review", label: "Need Review", key: "5", short: "↻", icon: <IconRepeat size={16} />, variant: "warning" },
  { status: "weak", label: "Weak", key: "6", short: "⚠", icon: <IconAlert size={16} />, variant: "danger" },
];

export function StatusButtons({
  onSet,
  flash,
  showHints = true,
  size = "md",
  className,
}: {
  onSet: (status: WordStatus) => void;
  flash?: WordStatus | null;
  showHints?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {STATUS_ACTIONS.map((action) => (
        <Button
          key={action.status}
          variant={action.variant}
          size={size}
          flash={flash === action.status}
          onClick={() => onSet(action.status)}
          icon={action.icon}
          aria-label={`Mark ${action.label}`}
          title={`Mark ${action.label} (${action.key})`}
          className={cn(size === "sm" && "px-2", "flex-1 sm:flex-none")}
        >
          <span className="hidden sm:inline">{action.label}</span>
          <span className="sm:hidden">{action.short}</span>
          <ShortcutChip show={showHints}>{action.key}</ShortcutChip>
        </Button>
      ))}
    </div>
  );
}

export function BookmarkButton({
  active,
  onToggle,
  flash = false,
  showHint = true,
  size = "md",
  compact = false,
}: {
  active: boolean;
  onToggle: () => void;
  flash?: boolean;
  showHint?: boolean;
  size?: "sm" | "md";
  compact?: boolean;
}) {
  if (compact) {
    return (
      <IconButton
        label={active ? "Remove bookmark" : "Bookmark word"}
        onClick={onToggle}
        size={size}
        flash={flash}
        className={cn(active ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted", "border border-line")}
      >
        <IconBookmark size={17} className={active ? "fill-current" : undefined} />
      </IconButton>
    );
  }
  return (
    <Button
      variant={active ? "secondary" : "secondary"}
      size={size}
      onClick={onToggle}
      flash={flash}
      aria-pressed={active}
      icon={<IconBookmark size={16} className={active ? "fill-current text-accent" : undefined} />}
      className={cn(active && "border-accent/40 text-accent")}
    >
      {active ? "Bookmarked" : "Bookmark"}
      <ShortcutChip show={showHint}>3</ShortcutChip>
    </Button>
  );
}
