/**
 * Reliable browser SpeechSynthesis wrapper.
 * - cancels any in-flight utterance before speaking (never overlaps)
 * - picks the best quality voice for the requested accent (en-GB default)
 * - resolves voices asynchronously (Chrome fires voiceschanged late)
 */

export type Accent = "en-GB" | "en-US";

const PREFERRED = [
  "google uk english female",
  "google uk english male",
  "microsoft libby",
  "microsoft maisie",
  "microsoft ryan",
  "daniel",
  "kate",
  "serena",
  "google us english",
  "microsoft aria",
  "microsoft jenny",
  "samantha",
  "alex",
];

const AVOID = ["espeak", "whisper", "compact"];

function score(voice: SpeechSynthesisVoice, accent: Accent): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let s = 0;
  if (lang === accent.toLowerCase()) s += 100;
  else if (lang.startsWith("en")) s += 40;
  else return -1;
  if (accent === "en-GB" && (lang.startsWith("en-gb") || name.includes("uk"))) s += 30;
  if (accent === "en-US" && (lang.startsWith("en-us") || name.includes("us"))) s += 30;
  const pref = PREFERRED.indexOf(name);
  if (pref >= 0) s += 40 - pref;
  if (voice.localService) s += 6;
  if (AVOID.some((bad) => name.includes(bad))) s -= 50;
  return s;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export function pickVoice(voices: SpeechSynthesisVoice[], accent: Accent, uri?: string) {
  if (uri) {
    const exact = voices.find((v) => v.voiceURI === uri);
    if (exact) return exact;
  }
  const ranked = voices
    .map((v) => ({ v, s: score(v, accent) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.v ?? voices[0] ?? null;
}

let current: SpeechSynthesisUtterance | null = null;
let speaking = false;
const listeners = new Set<(state: boolean) => void>();

export function onSpeakingChange(cb: (state: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setSpeaking(value: boolean) {
  speaking = value;
  listeners.forEach((cb) => cb(value));
}

export function stopSpeech() {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
  current = null;
  setSpeaking(false);
}

export interface SpeakOptions {
  text: string;
  accent?: Accent;
  voiceURI?: string;
  rate?: number;
  onEnd?: () => void;
}

/** Speaks the given text. Any previous utterance is cancelled first. */
export function speak(opts: SpeakOptions): boolean {
  if (!isSpeechSupported()) return false;
  const text = (opts.text || "").trim();
  if (!text) return false;
  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(getVoices(), opts.accent ?? "en-GB", opts.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = opts.accent ?? "en-GB";
  }
  utterance.rate = opts.rate ?? 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = () => setSpeaking(true);
  utterance.onend = () => {
    setSpeaking(false);
    current = null;
    opts.onEnd?.();
  };
  utterance.onerror = () => {
    setSpeaking(false);
    current = null;
    opts.onEnd?.();
  };
  current = utterance;
  window.speechSynthesis.speak(utterance);
  // Safari occasionally needs a nudge; also guard against a stuck "speaking" flag.
  window.setTimeout(() => {
    if (current === utterance && !window.speechSynthesis.speaking) setSpeaking(false);
  }, 4000);
  return true;
}

/** Voices load asynchronously — resolves once at least one English voice exists. */
export function whenVoicesReady(timeout = 2500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([]);
    const existing = getVoices();
    if (existing.length) return resolve(existing);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener?.("voiceschanged", finish);
      resolve(getVoices());
    };
    window.speechSynthesis.onvoiceschanged = finish;
    window.setTimeout(finish, timeout);
  });
}
