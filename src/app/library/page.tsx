"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LibraryView } from "@/features/library-view";

function LibraryRoute() {
  const params = useSearchParams();
  return <LibraryView initialCategory={params.get("category") ?? "all"} initialQuery={params.get("q") ?? ""} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LibraryRoute />
    </Suspense>
  );
}
