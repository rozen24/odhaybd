import { Skeleton } from "../ui/skeleton";
import { cn } from "../ui/utils";

export function BookCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="aspect-[2/3] w-full rounded-[3px] bg-muted" />
      <Skeleton className="h-4 w-3/4 bg-muted" />
      <Skeleton className="h-3 w-1/2 bg-muted" />
      <Skeleton className="h-4 w-1/3 bg-muted" />
    </div>
  );
}

export function BookGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 shrink-0 sm:w-44">
          <BookCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Section placeholder: eyebrow + heading + rail. */
export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5", className)} aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 bg-muted" />
        <Skeleton className="h-7 w-56 bg-muted" />
      </div>
      <RailSkeleton />
    </div>
  );
}

export function TileGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg bg-muted" />
      ))}
    </div>
  );
}