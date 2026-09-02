"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/app-store";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Badge, IconButton, Kbd, Modal } from "@/components/ui";
import {
  IconBookmark,
  IconChart,
  IconCommand,
  IconDashboard,
  IconFlame,
  IconHeadphones,
  IconKeyboard,
  IconLibrary,
  IconMoon,
  IconPen,
  IconSettings,
  IconSun,
  IconTarget,
  IconUpload,
  IconX,
} from "@/components/icons";

export const NAV = [
  { href: "/", label: "Dashboard", icon: IconDashboard, group: "Train" },
  { href: "/learn", label: "Learn", icon: IconHeadphones, group: "Train" },
  { href: "/practice", label: "Practice", icon: IconPen, group: "Train" },
  { href: "/test", label: "Test", icon: IconTarget, group: "Train" },
  { href: "/review", label: "Review", icon: IconFlame, group: "Train" },
  { href: "/library", label: "Word Library", icon: IconLibrary, group: "Manage" },
  { href: "/bookmarks", label: "Bookmarks", icon: IconBookmark, group: "Manage" },
  { href: "/stats", label: "Statistics", icon: IconChart, group: "Manage" },
  { href: "/import", label: "Import Words", icon: IconUpload, group: "Manage" },
  { href: "/settings", label: "Settings", icon: IconSettings, group: "Manage" },
] as const;

export const MOBILE_NAV = ["/", "/practice", "/test", "/library", "/review"] as const;

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["1"], label: "Hear word" },
  { keys: ["2"], label: "Focus typing" },
  { keys: ["3", "B"], label: "Bookmark" },
  { keys: ["4", "C"], label: "Mark Complete" },
  { keys: ["5", "N"], label: "Mark Need Review" },
  { keys: ["6", "W"], label: "Mark Weak" },
  { keys: ["R", "Space"], label: "Replay audio" },
  { keys: ["H"], label: "Hide / reveal word" },
  { keys: ["←"], label: "Previous word" },
  { keys: ["→"], label: "Next word" },
  { keys: ["Enter"], label: "Check answer / continue" },
  { keys: ["Esc"], label: "Unfocus / close" },
  { keys: ["Ctrl", "K"], label: "Command palette" },
];

function Toaster() {
  const { toasts, actions } = useStore();
  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-80 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex max-w-[92vw] animate-toast items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium shadow-[0_16px_40px_-20px_rgba(10,20,15,.7)]",
            t.kind === "success" && "border-transparent bg-ok-soft text-ok",
            t.kind === "error" && "border-transparent bg-danger-soft text-danger",
            t.kind === "warning" && "border-transparent bg-warn-soft text-warn",
            t.kind === "info" && "border-line bg-surface text-ink",
          )}
        >
          <span className="truncate">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => actions.dismissToast(t.id)}
            className="opacity-50 transition-opacity hover:opacity-100"
          >
            <IconX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { actions, words, settings } = useStore();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(
    () => [
      { id: "test", label: "Start Test", hint: "Hidden-word listening test", run: () => router.push("/test") },
      { id: "practice", label: "Start Practice", hint: "Active recall typing", run: () => router.push("/practice") },
      {
        id: "weak",
        label: "Practice Weak Words",
        hint: `${words.filter((w) => w.status === "weak").length} words`,
        run: () => router.push("/practice?source=weak"),
      },
      {
        id: "bookmarks",
        label: "Practice Bookmarks",
        hint: `${words.filter((w) => w.bookmarked).length} words`,
        run: () => router.push("/practice?source=bookmarked"),
      },
      { id: "review", label: "Review Today", hint: "Spaced repetition queue", run: () => router.push("/review") },
      { id: "library", label: "Go to Library", hint: "Search & manage words", run: () => router.push("/library") },
      { id: "import", label: "Import Words", hint: "JSON / CSV / TXT", run: () => router.push("/import") },
      { id: "stats", label: "Open Statistics", hint: "Progress & charts", run: () => router.push("/stats") },
      { id: "settings", label: "Open Settings", hint: "Voice, goal, theme", run: () => router.push("/settings") },
      {
        id: "theme",
        label: settings.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        hint: "Appearance",
        run: () => void actions.saveSettings({ darkMode: !settings.darkMode }),
      },
      { id: "shortcuts", label: "Show Keyboard Shortcuts", hint: "Reference card", run: () => setShortcutsOpen(true) },
    ],
    [actions, router, settings.darkMode, words],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useHotkeys(
    {
      escape: () => onClose(),
      arrowdown: () => setIndex((i) => Math.min(i + 1, filtered.length - 1)),
      arrowup: () => setIndex((i) => Math.max(i - 1, 0)),
      enter: () => {
        const cmd = filtered[index];
        if (cmd) {
          onClose();
          cmd.run();
        }
      },
    },
    { enabled: open },
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-90 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" aria-label="Close palette" className="absolute inset-0 bg-[rgba(9,14,13,.5)] backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-rise overflow-hidden rounded-panel border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <IconCommand size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Type a command…"
            aria-label="Command"
            className="h-13 w-full bg-transparent py-3.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {filtered.map((cmd, i) => (
            <li key={cmd.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => {
                  onClose();
                  cmd.run();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === index ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface-2",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{cmd.label}</span>
                  <span className="block truncate text-[12px] text-muted">{cmd.hint}</span>
                </span>
                {i === index && <Kbd>↵</Kbd>}
              </button>
            </li>
          ))}
          {!filtered.length && <li className="px-3 py-6 text-center text-[13px] text-muted">No matching command</li>}
        </ul>
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </div>
  );
}

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" description="Practice without touching the mouse." size="md">
      <ul className="divide-y divide-line">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[13.5px] text-ink">{s.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-surface-2 p-3 text-[12.5px] leading-relaxed text-muted">
        Shortcuts stay inert while you type in a field — only <Kbd>Enter</Kbd>, <Kbd>Esc</Kbd> and{" "}
        <Kbd>Ctrl/⌘</Kbd> combos fire, so typing “1” as part of an answer never plays audio.
      </p>
    </Modal>
  );
}

function Sidebar({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const pathname = usePathname();
  const { stats } = useStore();
  const groups = ["Train", "Manage"] as const;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface/70 px-3 py-4 lg:flex">
      <Link href="/" className="mb-5 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-contrast">
          <IconHeadphones size={19} />
        </span>
        <span className="min-w-0">
          <span className="font-display block text-[15px] leading-tight font-bold text-ink">Spelling Lab</span>
          <span className="block text-[11px] leading-tight text-muted">IELTS listening trainer</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto" aria-label="Main">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-2.5 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-muted/80 uppercase">{group}</p>
            <ul className="space-y-0.5">
              {NAV.filter((item) => item.group === group).map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150",
                        active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      <Icon size={17} className={active ? "text-brand" : "text-muted group-hover:text-ink"} />
                      {item.label}
                      {active && <span className="absolute top-1/2 right-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-2 space-y-2 border-t border-line pt-3">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.05em] text-muted uppercase">Today</span>
            <Badge tone={stats.todayPracticed >= 0 ? "brand" : "neutral"}>
              <IconFlame size={11} /> {stats.streak}d
            </Badge>
          </div>
          <p className="tabular font-display mt-1 text-lg font-bold text-ink">
            {stats.todayPracticed} <span className="text-[13px] font-medium text-muted">/ goal</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <IconKeyboard size={16} /> Keyboard shortcuts
        </button>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const onMore = MOBILE_NAV.every((href) => pathname !== href);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-60 flex items-stretch justify-around border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Mobile"
      >
        {MOBILE_NAV.map((href) => {
          const item = NAV.find((n) => n.href === href)!;
          const Icon = item.icon;
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold transition-colors",
                active ? "text-brand" : "text-muted",
              )}
            >
              <Icon size={20} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold transition-colors",
            onMore ? "text-brand" : "text-muted",
          )}
          aria-label="More sections"
        >
          <IconDashboard size={20} />
          <span>More</span>
        </button>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="More" size="sm">
        <div className="grid grid-cols-2 gap-2">
          {NAV.filter((n) => !MOBILE_NAV.includes(n.href as (typeof MOBILE_NAV)[number])).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMore(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-3 text-[13px] font-medium text-ink",
                  pathname === item.href && "border-brand bg-brand-soft text-brand",
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

function TopBar({
  onOpenShortcuts,
  onOpenPalette,
}: {
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const { settings, stats, actions } = useStore();
  const current = NAV.find((n) => n.href === pathname);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-5">
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-[15px] font-semibold text-ink">{current?.label ?? "Spelling Lab"}</h1>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-line-strong hover:text-ink md:flex"
        aria-label="Open command palette"
      >
        <IconCommand size={14} />
        Quick actions
        <Kbd className="ml-3">⌘K</Kbd>
      </button>

      <div className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 sm:flex">
        <IconFlame size={14} className="text-accent" />
        <span className="tabular text-[12.5px] font-semibold text-ink">{stats.streak}</span>
        <span className="text-[11.5px] text-muted">day streak</span>
      </div>

      <IconButton
        label={settings.darkMode ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => void actions.saveSettings({ darkMode: !settings.darkMode })}
      >
        {settings.darkMode ? <IconSun size={17} /> : <IconMoon size={17} />}
      </IconButton>
      <IconButton label="Keyboard shortcuts" onClick={onOpenShortcuts}>
        <IconKeyboard size={18} />
      </IconButton>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { ready, error, actions } = useStore();

  useHotkeys({
    "mod+k": () => setPaletteOpen((v) => !v),
    "?": () => setShortcutsOpen(true),
  });

  useEffect(() => {
    if (error) actions.toast(error, "error");
  }, [error, actions]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar onOpenShortcuts={() => setShortcutsOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenShortcuts={() => setShortcutsOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 pt-4 pb-36 sm:px-5 lg:pb-8">
          {ready ? children : <BootSkeleton />}
        </main>
      </div>
      <MobileNav />
      <Toaster />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your word library">
      <div className="h-28 animate-pulse rounded-panel border border-line bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card border border-line bg-surface-2" />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-panel border border-line bg-surface-2" />
    </div>
  );
}
