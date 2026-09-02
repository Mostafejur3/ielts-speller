import { Suspense } from "react";
import { SessionPage } from "@/features/session-page";

export const metadata = { title: "Test — Spelling Lab" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SessionPage mode="test" />
    </Suspense>
  );
}
