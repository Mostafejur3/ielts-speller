import { Suspense } from "react";
import { SessionPage } from "@/features/session-page";

export const metadata = { title: "Practice — Spelling Lab" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SessionPage mode="practice" />
    </Suspense>
  );
}
