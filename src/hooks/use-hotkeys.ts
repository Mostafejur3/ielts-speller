import { useEffect, useRef } from "react";

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

const SAFE_IN_INPUT = new Set(["enter", "escape", "tab"]);

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return el.isContentEditable === true;
}

function normalizeKey(key: string): string {
  if (key === " ") return "space";
  if (key === "Spacebar") return "space";
  if (key === "Esc") return "escape";
  if (key.length === 1) return key.toLowerCase();
  return key.toLowerCase();
}

/**
 * Global keyboard shortcuts.
 *
 * Combos: "1", "r", "enter", "arrowright", "space", "mod+k", "shift+?"
 *
 * Shortcuts are ignored while the user types in an input / textarea / select /
 * contenteditable element — except Enter, Escape, Tab and mod-combos, so
 * typing "1" into the answer field types a "1" and never plays audio.
 */
export function useHotkeys(map: HotkeyMap, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const mapRef = useRef(map);

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented && event.key !== "Escape") return;
      const typing = isEditableTarget(event.target);
      const modPressed = event.metaKey || event.ctrlKey;

      for (const [combo, handler] of Object.entries(mapRef.current)) {
        const parts = combo.toLowerCase().split("+");
        const needsMod = parts.includes("mod");
        const needsShift = parts.includes("shift");
        const key = parts[parts.length - 1];
        if (needsMod !== modPressed) continue;
        // only enforce the shift modifier for alphanumeric keys: "?" already implies shift
        if (needsShift !== event.shiftKey && !needsMod && /^[a-z0-9]$/.test(key)) continue;
        if (!needsMod && event.altKey) continue;
        if (normalizeKey(event.key) !== key) continue;
        if (typing && !needsMod && !SAFE_IN_INPUT.has(key)) continue;

        event.preventDefault();
        event.stopPropagation();
        handler(event);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
