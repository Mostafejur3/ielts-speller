import { Suspense } from "react";
import { SessionPage } from "@/features/session-page";

export const metadata = { title: "Learn — Spelling Lab" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SessionPage mode="learn" />
    </Suspense>
  );
}
