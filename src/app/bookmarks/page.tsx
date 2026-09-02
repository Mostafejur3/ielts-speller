import { LibraryView } from "@/features/library-view";

export const metadata = { title: "Bookmarks — Spelling Lab" };

export default function Page() {
  return (
    <LibraryView
      preset={{ bookmarked: true }}
      title="Bookmarks"
      subtitle="Every word you saved with 3 or B — independent of its status."
    />
  );
}
