// Procedural book cover. Rather than shipping cover images, each book renders a
// deterministic, aesthetically consistent cover generated from its title so the
// catalogue always looks complete. If a real coverUrl is present, it's used.

import { ImageWithFallback } from "../figma/ImageWithFallback";
import { cn } from "../ui/utils";

const PALETTES: [string, string][] = [
  ["#1f6f52", "#0f3d2c"],
  ["#2c4a6e", "#16273c"],
  ["#8a4b2f", "#4d2617"],
  ["#7a2e4a", "#43172a"],
  ["#b5852a", "#6e4f14"],
  ["#3a5a40", "#1e3123"],
  ["#4c3a6e", "#271d3c"],
  ["#a23b2e", "#5c1f18"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function BookCover({
  title,
  author,
  coverUrl,
  className,
}: {
  title: string;
  author?: string;
  coverUrl?: string;
  className?: string;
}) {
  if (coverUrl) {
    return (
      <ImageWithFallback
        src={coverUrl}
        alt={title}
        className={cn("h-full w-full", className)}
      />
    );
  }

  const [c1, c2] = PALETTES[hash(title) % PALETTES.length];
  return (
    <div
      className={cn("relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-white", className)}
      style={{ background: `linear-gradient(150deg, ${c1}, ${c2})` }}
      aria-label={title}
    >
      <div
        className="absolute inset-y-0 left-0 w-2 bg-black/25"
        aria-hidden
      />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #fff 0, transparent 45%)" }} aria-hidden />
      <div className="relative mt-3 pl-2">
        <p className="font-display text-lg font-semibold leading-tight line-clamp-4" style={{ textWrap: "balance" as never }}>
          {title}
        </p>
      </div>
      {author && (
        <div className="relative pl-2">
          <div className="mb-2 h-px w-10 bg-white/50" />
          <p className="text-xs uppercase tracking-wide text-white/80 line-clamp-2">{author}</p>
        </div>
      )}
    </div>
  );
}
