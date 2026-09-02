"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/app-store";
import { buildQueue } from "@/lib/queue";
import type { SessionConfig, SessionMode, Word } from "@/lib/types";
import { SessionSetup } from "@/components/session/session-setup";
import { SessionRunner } from "@/components/session/session-runner";
import { Button, Card, EmptyState } from "@/components/ui";
import { IconLibrary } from "@/components/icons";
import Link from "next/link";

export function SessionPage({ mode }: { mode: SessionMode }) {
  const { words, ready, settings } = useStore();
  const params = useSearchParams();
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [queue, setQueue] = useState<Word[]>([]);
  const [sessionKey, setSessionKey] = useState(0);

  const initial = useMemo<Partial<SessionConfig>>(() => {
    const source = params.get("source") as SessionConfig["source"] | null;
    const category = params.get("category");
    const count = params.get("count");
    const listId = params.get("listId");
    const order = params.get("order") as SessionConfig["order"] | null;
    const out: Partial<SessionConfig> = {};
    if (source) out.source = source;
    if (category) out.category = category;
    if (count) out.count = count === "all" ? "all" : Number(count);
    if (listId) out.listId = Number(listId);
    if (order) out.order = order;
    return out;
  }, [params]);

  const start = useCallback(
    (next: SessionConfig) => {
      const built = buildQueue(words, next);
      setQueue(built);
      setConfig(next);
      setSessionKey((k) => k + 1);
    },
    [words],
  );

  // deep link: /practice?ids=1,2,3 starts a session with exactly those words
  const idsParam = params.get("ids");
  const [appliedIds, setAppliedIds] = useState<string | null>(null);
  if (idsParam && idsParam !== appliedIds && ready && words.length > 0) {
    const byId = new Map(words.map((w) => [w.id, w]));
    const picked = idsParam
      .split(",")
      .map((raw) => byId.get(Number(raw)))
      .filter((w): w is Word => Boolean(w));
    setAppliedIds(idsParam);
    if (picked.length) {
      setQueue(picked);
      setConfig({
        mode,
        category: "all",
        count: "all",
        source: "all",
        order: "random",
        audio: settings.autoPlay ? "auto" : "manual",
      });
      setSessionKey((k) => k + 1);
    }
  }

  const practiceMistakes = useCallback(
    (wordIds: number[]) => {
      const byId = new Map(words.map((w) => [w.id, w]));
      const picked = wordIds.map((id) => byId.get(id)).filter((w): w is Word => Boolean(w));
      if (!picked.length || !config) return;
      setQueue(picked);
      setConfig({ ...config, count: "all", order: "random" });
      setSessionKey((k) => k + 1);
    },
    [config, words],
  );

  if (!ready) return null;

  if (words.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconLibrary size={22} />}
          title="Your library is empty"
          description="Import words from JSON, CSV or TXT first — then start a session."
          action={
            <Link href="/import">
              <Button variant="primary">Import words</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  if (!config) return <SessionSetup mode={mode} initial={initial} onStart={start} />;

  return (
    <SessionRunner
      key={sessionKey}
      queue={queue}
      mode={mode}
      config={config}
      onExit={() => setConfig(null)}
      onPracticeMistakes={practiceMistakes}
    />
  );
}
