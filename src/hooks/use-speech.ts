"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getVoices,
  isSpeechSupported,
  onSpeakingChange,
  pickVoice,
  speak,
  stopSpeech,
  whenVoicesReady,
  type Accent,
} from "@/lib/speech";
import { useStore } from "@/store/app-store";

export interface SpeechController {
  supported: boolean;
  speaking: boolean;
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  /** Speaks the pronunciation for a word (falls back to the word itself). */
  say: (text: string, overrides?: { rate?: number; onEnd?: () => void }) => boolean;
  stop: () => void;
}

export function useSpeech(): SpeechController {
  const { settings, actions } = useStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const warned = useRef(false);

  useEffect(() => {
    // speechSynthesis only exists in the browser — sync it after mount to avoid hydration drift
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isSpeechSupported());
    setVoices(getVoices());
    let cancelled = false;
    void whenVoicesReady().then((list) => {
      if (!cancelled) setVoices(list);
    });
    const off = onSpeakingChange((state) => setSpeaking(state));
    return () => {
      cancelled = true;
      off();
      stopSpeech();
    };
  }, []);

  const accent = (settings.accent ?? "en-GB") as Accent;
  const voiceURI = settings.voiceURI;
  const rate = settings.rate ?? 0.9;

  const say = useCallback(
    (text: string, overrides?: { rate?: number; onEnd?: () => void }) => {
      if (!isSpeechSupported()) {
        if (!warned.current) {
          warned.current = true;
          actions.toast("Speech synthesis is not available in this browser", "error");
        }
        return false;
      }
      if (!text?.trim()) return false;
      return speak({
        text,
        accent,
        voiceURI,
        rate: overrides?.rate ?? rate,
        onEnd: overrides?.onEnd,
      });
    },
    [accent, actions, rate, voiceURI],
  );

  const voice = useMemo(() => pickVoice(voices, accent, voiceURI), [voices, accent, voiceURI]);

  return { supported, speaking, voices, voice, say, stop: stopSpeech };
}
