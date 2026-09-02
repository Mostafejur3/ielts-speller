"use client";

import { cn } from "@/lib/cn";

export interface Point {
  label: string;
  value: number;
  secondary?: number;
}

export function ActivityBars({
  data,
  tone = "brand",
  height = 92,
  emptyHint = "No practice yet",
}: {
  data: Point[];
  tone?: "brand" | "ok" | "accent";
  height?: number;
  emptyHint?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const color = tone === "ok" ? "bg-ok" : tone === "accent" ? "bg-accent" : "bg-brand";
  const soft = tone === "ok" ? "bg-ok/25" : tone === "accent" ? "bg-accent/25" : "bg-brand/25";

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * 100);
          const s = Math.round(((d.secondary ?? 0) / max) * 100);
          return (
            <div
              key={`${d.label}-${i}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${d.label}: ${d.value}${d.secondary !== undefined ? ` · ${d.secondary}` : ""}`}
            >
              {d.secondary !== undefined && s > 0 && (
                <div className={cn("w-full rounded-t-[3px]", soft)} style={{ height: `${s}%` }} />
              )}
              <div
                className={cn("w-full rounded-t-[3px] transition-all duration-500", color, d.value === 0 && "bg-surface-3")}
                style={{ height: `${Math.max(d.value === 0 ? 2 : 4, h)}%` }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-bg opacity-0 transition-opacity group-hover:opacity-100">
                {d.value}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((d, i) => (
          <span key={`${d.label}-l-${i}`} className="flex-1 truncate text-center text-[9.5px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
      {data.every((d) => d.value === 0) && (
        <p className="mt-2 text-center text-[12px] text-muted">{emptyHint}</p>
      )}
    </div>
  );
}

export function TrendLine({
  data,
  tone = "brand",
  height = 110,
  suffix = "",
}: {
  data: Point[];
  tone?: "brand" | "ok" | "accent" | "danger";
  height?: number;
  suffix?: string;
}) {
  const w = 300;
  const h = 90;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((d, i) => [i * step, h - (d.value / max) * (h - 8) - 4] as const);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const stroke =
    tone === "ok" ? "var(--ok)" : tone === "accent" ? "var(--accent)" : tone === "danger" ? "var(--danger)" : "var(--brand)";

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ height }} className="w-full" preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`grad-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#grad-${tone})`} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.4" fill={stroke} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-muted">
        <span>{data[0]?.label}</span>
        <span className="tabular font-semibold text-ink">
          peak {max}
          {suffix}
        </span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
