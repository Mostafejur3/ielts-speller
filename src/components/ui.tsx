"use client";

import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { IconX } from "@/components/icons";
import { STATUS_LABEL, type Difficulty, type WordStatus } from "@/lib/types";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-contrast hover:bg-brand-hover shadow-[0_1px_2px_rgba(0,0,0,.08)] border border-transparent",
  secondary: "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
  outline: "bg-transparent text-ink hover:bg-surface-2 border border-line-strong",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-surface-2 border border-transparent",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white border border-transparent",
  success: "bg-ok-soft text-ok hover:bg-ok hover:text-white border border-transparent",
  warning: "bg-warn-soft text-warn hover:bg-warn hover:text-white border border-transparent",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1 rounded-lg",
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-14 px-6 text-base gap-2.5 rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  flash?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  flash = false,
  icon,
  trailing,
  block,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex select-none items-center justify-center font-medium tracking-[-0.01em]",
        "transition-[transform,background-color,color,box-shadow,border-color] duration-150 active:scale-[.975]",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        flash && "animate-flash",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {trailing}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  variant = "ghost",
  size = "md",
  flash,
  ...props
}: ButtonProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10",
        flash && "animate-flash",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  as: Tag = "div",
  ...rest
}: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & Record<string, unknown>) {
  return (
    <Tag
      className={cn(
        "rounded-panel border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,20,.04),0_10px_30px_-24px_rgba(16,24,20,.35)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */

export type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "info" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-line",
  brand: "bg-brand-soft text-brand border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<WordStatus, Tone> = {
  new: "info",
  learning: "warn",
  complete: "ok",
  review: "brand",
  weak: "danger",
};

export function StatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone: Record<Difficulty, Tone> = { easy: "ok", medium: "neutral", hard: "accent" };
  return <Badge tone={tone[difficulty]}>{difficulty[0].toUpperCase() + difficulty.slice(1)}</Badge>;
}

/* ------------------------------------------------------------- ProgressBar */

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  className,
  showLabel = false,
  size = "md",
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bar: Record<Tone, string> = {
    neutral: "bg-muted",
    brand: "bg-brand",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    info: "bg-info",
    accent: "bg-accent",
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-surface-3",
          size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5",
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", bar[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="tabular w-10 shrink-0 text-right text-xs font-semibold text-muted">{pct}%</span>}
    </div>
  );
}

/* --------------------------------------------------------------------- Kbd */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line-strong",
        "bg-surface-2 px-1 font-mono text-[10px] font-semibold text-muted shadow-[0_1px_0_var(--border-strong)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------- Inputs */

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted/70",
        "transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70",
        "transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-line bg-surface bg-[length:16px] bg-[right_0.7rem_center] bg-no-repeat px-3.5 pr-9 text-sm text-ink",
        "transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2367736e' stroke-width='2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <label className={cn("block", className)} htmlFor={id}>
      <span className="mb-1.5 block text-[12px] font-semibold tracking-[0.02em] text-muted uppercase">{label}</span>
      <div id={id}>{children}</div>
      {hint && <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-transparent bg-brand" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-[3px]",
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full gap-1 rounded-xl border border-line bg-surface-2 p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150",
              size === "sm" ? "h-7 px-2 text-[12px]" : "h-9 px-3 text-[13px]",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,20,.10)]"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(9,14,13,.5)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full animate-rise overflow-hidden rounded-t-panel border border-line bg-surface shadow-2xl sm:rounded-panel",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <IconX size={16} />
          </IconButton>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  onClick,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-card border border-line bg-surface p-3.5 text-left transition-all duration-200",
        onClick && "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_28px_-20px_rgba(16,24,20,.6)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{label}</span>
        {icon && <span className={cn("opacity-70", tone === "neutral" ? "text-muted" : "")}>{icon}</span>}
      </div>
      <p className="tabular font-display mt-1.5 text-[26px] leading-none font-bold text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 opacity-70",
          tone === "ok" && "bg-ok",
          tone === "warn" && "bg-warn",
          tone === "danger" && "bg-danger",
          tone === "brand" && "bg-brand",
          tone === "info" && "bg-info",
          tone === "accent" && "bg-accent",
          tone === "neutral" && "bg-line-strong",
        )}
      />
    </Tag>
  );
}
