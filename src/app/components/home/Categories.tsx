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
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

function iconFor(c: Category) {
  return (c.icon && (Icons as unknown as Record<string, Icons.LucideIcon>)[c.icon]) || Icons.BookOpen;
}

const AUTOPLAY_MS = 3500;
const DESKTOP_QUERY = "(min-width: 768px)";

/** True when the viewport is at or above the `md` breakpoint. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function useCategoryCarousel() {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });
  const isDesktop = useIsDesktop();
  const [paused, setPaused] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => setScrollable(api.canScrollNext() || api.canScrollPrev());
    update();
    api.on("reInit", update);
    return () => { api.off("reInit", update); };
  }, [api]);

  // The carousel is display:none on mobile, so re-measure when it becomes visible.
  useEffect(() => {
    if (api && isDesktop) api.reInit();
  }, [api, isDesktop]);

  // Auto-slide: desktop only, pauses on hover/focus/touch, skipped for reduced-motion users.
  useEffect(() => {
    if (!api || !isDesktop || paused || !scrollable) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, isDesktop, paused, scrollable]);

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

function CategoryTile({ c }: { c: Category }) {
  const Icon = iconFor(c);
  return (
    <Link
      to={`/category/${c.slug}`}
      draggable={false}
      className="group flex flex-col items-center gap-2 focus-visible:outline-none sm:gap-3"
    >
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring/60">
        {c.imageUrl ? (
          <img
            src={c.imageUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Icon size={36} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-center text-[13px] font-medium leading-tight text-foreground/80 transition-colors group-hover:text-foreground sm:text-sm">
        {c.name}
      </span>
    </Link>
  );
}

export function CategoryTiles() {
  const { topCategories, loading } = useCatalog();
  const { viewportRef, scrollable, prev, next, onKeyDown, hoverProps } = useCategoryCarousel();

  if (loading && topCategories.length === 0) {
    return <Section><TileGridSkeleton /></Section>;
  }
  if (topCategories.length === 0) return null;

  return (
    <Section>
      <div className="relative rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-foreground">
          Shop By Category
        </h2>

        {/* Mobile: two rows, horizontal scroll */}
        <div
          className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <div className="grid auto-cols-[88px] grid-flow-col grid-rows-2 gap-x-3 gap-y-4 sm:auto-cols-[110px]">
            {topCategories.map((c) => (
              <div key={c.id} className="min-w-0" style={{ scrollSnapAlign: "start" }}>
                <CategoryTile c={c} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: single-row carousel */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Shop by category"
          tabIndex={0}
          onKeyDown={onKeyDown}
          {...hoverProps}
          className="hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:block"
        >
          <div className="overflow-hidden py-1" ref={viewportRef}>
            <div className="-ml-6 flex touch-pan-y">
              {topCategories.map((c, idx) => (
                <div
                  key={c.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${topCategories.length}`}
                  className="min-w-0 shrink-0 grow-0 basis-[146px] pl-6"
                >
                  <CategoryTile c={c} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {scrollable && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous categories"
              className="absolute left-0 top-1/2 hidden h-10 w-8 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-border bg-white text-foreground shadow-md transition hover:bg-muted md:grid"
            >
              <Icons.ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next categories"
              className="absolute right-0 top-1/2 hidden h-10 w-8 -translate-y-1/2 place-items-center rounded-l-lg border border-r-0 border-border bg-white text-foreground shadow-md transition hover:bg-muted md:grid"
            >
              <Icons.ChevronRight size={18} />
            </button>
          </>
        )}
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