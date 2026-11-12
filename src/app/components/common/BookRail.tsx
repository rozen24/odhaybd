// Horizontal scroll-snap rail of book cards with arrow controls.

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCard } from "./BookCard";
import { RailSkeleton } from "./Skeletons";
import { ErrorState } from "./EmptyState";
import type { Book } from "../../../types";

export function BookRail({
  books,
  loading,
  error,
  onRetry,
  emptyText,
}: {
  books?: Book[];
  loading?: boolean;
  /** When set, an error state with retry is shown instead of the rail. */
  error?: Error | null;
  onRetry?: () => void;
  /** When set, an empty message is shown instead of rendering nothing. */
  emptyText?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (loading) return <RailSkeleton />;
  if (error) return <ErrorState compact onRetry={onRetry} />;
  if (!books || books.length === 0) {
    return emptyText ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</p> : null;
  }

  const arrow =
    "absolute top-[30%] hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:flex";

  return (
    <div className="relative">
      <div ref={ref} className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2">
        {books.map((book) => (
          <div key={book.id} className="w-[50%] shrink-0 snap-start sm:w-54">
            <BookCard book={book} compact />
          </div>
        ))}
      </div>
      <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} -left-3`}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className={`${arrow} -right-3`}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
