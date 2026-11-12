// Shop-by-category tiles and the settings-driven category sections.

import { Link } from "@/lib/navigation";
import * as Icons from "lucide-react";
import { useCatalog } from "../../contexts/CatalogContext";
import { useStoreSettings } from "../common/useStoreSettings";
import { SectionHeader } from "../common/SectionHeader";
import { TileGridSkeleton } from "../common/Skeletons";
import { LazySection } from "../common/LazySection";
import { BookCard } from "../common/BookCard";
import { ACADEMIC_KEYS, ISLAMIC_KEYS } from "../common/catalogHelpers";
import { QueryRailSection, Section, useBooks } from "./shared";
import type { Category, HomeSection } from "../../../types";
import { cn } from "../ui/utils";
import { CarouselArrows } from "./CarouselArrows";
// import { useEmblaControls } from "./useEmblaControls";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";


function iconFor(c: Category) {
  return (c.icon && (Icons as unknown as Record<string, Icons.LucideIcon>)[c.icon]) || Icons.BookOpen;
}

const AUTOPLAY_MS = 3500;
// 2 per row on mobile, 4 on tablet, 6 on desktop
const TILE_BASIS = "min-w-0 shrink-0 grow-0 basis-1/2 pl-3 md:basis-1/4 lg:basis-1/6";

function useCategoryCarousel() {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });
  const [paused, setPaused] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => setScrollable(api.canScrollNext() || api.canScrollPrev());
    update();
    api.on("reInit", update);
    return () => { api.off("reInit", update); };
  }, [api]);

  // Auto-slide: pauses on hover/focus/touch, skipped for reduced-motion users.
  useEffect(() => {
    if (!api || paused || !scrollable) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, paused, scrollable]);

  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }, [prev, next]);

  const hoverProps = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
    onTouchStart: () => setPaused(true),
    onTouchEnd: () => setPaused(false),
  };

  return { viewportRef, scrollable, prev, next, onKeyDown, hoverProps };
}

export function CategoryTiles() {
  const { topCategories, loading } = useCatalog();
  const { viewportRef, scrollable, prev, next, onKeyDown, hoverProps } = useCategoryCarousel();

  if (loading && topCategories.length === 0) {
    return <Section><SectionHeader eyebrow="Browse" title="Shop by category" /><TileGridSkeleton /></Section>;
  }
  if (topCategories.length === 0) return null;

  return (
    <Section>
      <SectionHeader
        className="hidden md:flex"
        eyebrow="Browse"
        title="Shop by category"
        href="/books"
        hrefLabel="All books"
        action={scrollable && <CarouselArrows canPrev canNext prev={prev} next={next} label="categories" />}
      />
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Shop by category"
        tabIndex={0}
        onKeyDown={onKeyDown}
        {...hoverProps}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <div className="overflow-hidden py-2" ref={viewportRef}>
          <div className="-ml-3 flex touch-pan-y">
            {topCategories.map((c, idx) => {
              const Icon = iconFor(c);
              return (
                <div key={c.id} role="group" aria-roledescription="slide" aria-label={`${idx + 1} of ${topCategories.length}`} className={TILE_BASIS}>
                  <Link
                    to={`/category/${c.slug}`}
                    draggable={false}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent to-accent/60 text-accent-foreground">
                        <Icon size={40} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <span className="line-clamp-2 block font-display text-base font-semibold leading-tight text-white sm:text-lg">{c.name}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/80 transition-all duration-300 group-hover:gap-2 group-hover:text-white">
                        Explore <Icons.ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** Resolve the configured sections (or fall back to top-level categories). */
function useResolvedSections(): { title: string; category: Category; layout: "rail" | "tiles" }[] {
  const { categories, topCategories } = useCatalog();
  const settings = useStoreSettings();
  const configured: HomeSection[] | undefined = settings.data?.homeSections?.filter((s) => s.categorySlug);
  if (configured && configured.length > 0) {
    return configured
      .map((s) => {
        const category = categories.find((c) => c.slug === s.categorySlug);
        return category ? { title: s.title || category.name, category, layout: s.layout ?? "rail" } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }
  if (settings.loading) return [];
  return topCategories.map((c) => ({ title: c.name, category: c, layout: "rail" as const }));
}

const chipKeys = [...ACADEMIC_KEYS, ...ISLAMIC_KEYS];

export function CategorySections() {
  const sections = useResolvedSections();
  const { childrenOf } = useCatalog();
  return (
    <>
      {sections.map((s, idx) => {
        const subs = childrenOf(s.category.id);
        const showChips = subs.length > 0 && (s.layout === "tiles" || chipKeys.some((k) => s.category.slug.includes(k) || s.category.name.toLowerCase().includes(k)));
        return (
          <LazySection key={`${s.category.id}-${idx}`} minHeight={360}>
            {s.layout === "tiles" ? (
              <CategoryTilesSection title={s.title} category={s.category} subs={subs} />
            ) : (
              <QueryRailSection
                eyebrow="Category"
                title={s.title}
                href={`/category/${s.category.slug}`}
                query={{ categoryId: s.category.id, sort: "popularity" }}
                band={idx % 4 === 1}
              >
                {showChips && <SubcategoryChips subs={subs} />}
              </QueryRailSection>
            )}
          </LazySection>
        );
      })}
    </>
  );
}

function SubcategoryChips({ subs }: { subs: Category[] }) {
  return (
    <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mt-1 mb-5 flex gap-2 overflow-x-auto">
      {subs.map((s) => (
        <Link key={s.id} to={`/category/${s.slug}`} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          {s.name}
        </Link>
      ))}
    </div>
  );
}

function CategoryTilesSection({ title, category, subs }: { title: string; category: Category; subs: Category[] }) {
  const r = useBooks({ categoryId: category.id, sort: "popularity", pageSize: 6 });
  const books = r.data?.items ?? [];
  if (r.loading) return <Section><TileGridSkeleton count={6} /></Section>;
  if (r.error || books.length === 0) return null;
  return (
    <Section>
      <SectionHeader eyebrow="Category" title={title} href={`/category/${category.slug}`} />
      {subs.length > 0 && <SubcategoryChips subs={subs} />}
      <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-3">
        {books.map((b) => <BookCard key={b.id} book={b} compact />)}
      </div>
    </Section>
  );
}
