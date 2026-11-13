// Flash sale, top authors/publishers, recently sold, campaign collection,
// recommendations and the Explore tabs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/navigation";
import { Zap } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { timeLeft } from "../../../lib/format";
import { useCatalog } from "../../contexts/CatalogContext";
import { useStore } from "../../contexts/StoreContext";
import { useAuth } from "../../contexts/AuthContext";
import { SectionHeader } from "../common/SectionHeader";
import { BookCard } from "../common/BookCard";
import { BookRail } from "../common/BookRail";
import { BookGridSkeleton, SectionSkeleton } from "../common/Skeletons";
import { ErrorState } from "../common/EmptyState";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BooksRailSection, QueryRailSection, Section, hrefToQuery, useBooks } from "./shared";
import { CampaignBanner } from "./Hero";
import { CarouselArrows } from "./CarouselArrows";
import type { Banner, Book, BookQuery } from "../../../types";

/* ---------------- Flash sale ---------------- */

export function FlashSale() {
  const r = useBooks({ flag: "flash", pageSize: 10 });
  const books = r.data?.items ?? [];
  const endsAt = useMemo(() => {
    const now = Date.now();
    return books.map((b) => b.flashSale?.endsAt).filter((e): e is string => !!e && new Date(e).getTime() > now).sort()[0];
  }, [books]);
  const [t, setT] = useState(() => (endsAt ? timeLeft(endsAt) : null));
  useEffect(() => {
    if (!endsAt) { setT(null); return; }
    setT(timeLeft(endsAt));
    const id = setInterval(() => setT(timeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (r.loading) return <Section><SectionSkeleton /></Section>;
  if (r.error) return <Section><SectionHeader eyebrow="Limited time" title="Flash sale" /><ErrorState compact onRetry={r.refetch} /></Section>;
  if (books.length === 0) return null;

  return (
    <Section>
      <div className="rounded-lg border border-primary/25 bg-card p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Zap size={18} /></span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Limited time</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Flash sale</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {t && !t.done && (
              <div className="flex items-center gap-1.5" role="timer" aria-label="Time left">
                <span className="mr-1 text-xs text-muted-foreground">Ends in</span>
                {([["d", t.d], ["h", t.h], ["m", t.m], ["s", t.s]] as const).filter(([l, v]) => l !== "d" || v > 0).map(([label, v]) => (
                  <span key={label} className="flex min-w-[44px] flex-col items-center rounded-md bg-foreground px-2 py-1 text-background">
                    <span className="font-display text-lg font-semibold tabular-nums leading-none">{String(v).padStart(2, "0")}</span>
                    <span className="text-[10px] uppercase opacity-70">{label}</span>
                  </span>
                ))}
              </div>
            )}
            <Link to="/books?flag=flash" className="text-sm font-medium text-primary hover:underline">View all →</Link>
          </div>
        </div>
        <BookRail books={books} />
      </div>
    </Section>
  );
}

/* ---------------- Top authors / publishers ---------------- */

export function TopAuthors() {
  const { authors, loading } = useCatalog();
  const top = useMemo(() => [...authors].filter((a) => a.bookCount > 0).sort((a, b) => b.bookCount - a.bookCount).slice(0, 12), [authors]);
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

  useEffect(() => {
    if (!api || paused || !scrollable || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => api.scrollNext(), 3500);
    return () => window.clearInterval(id);
  }, [api, paused, scrollable]);

  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }, [next, prev]);

  if (loading && authors.length === 0) return <Section><SectionSkeleton /></Section>;
  if (top.length === 0) return null;
  return (
    <Section band>
      <SectionHeader
        eyebrow="Writers"
        title="Top authors"
        href="/authors"
        action={scrollable && <CarouselArrows canPrev canNext prev={prev} next={next} label="authors" />}
      />
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Top authors"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <div className="overflow-hidden py-2" ref={viewportRef}>
          <div className="-ml-3 flex touch-pan-y">
            {top.map((a, idx) => (
              <div key={a.id} role="group" aria-roledescription="slide" aria-label={`${idx + 1} of ${top.length}`} className="min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:basis-1/4 md:basis-1/6">
                <Link
                  to={`/author/${a.slug}`}
                  className="group relative block rounded-2xl border border-transparent bg-card/60 p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-card hover:shadow-[0_12px_30px_-14px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="mx-auto block aspect-square w-full max-w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary/40 group-hover:shadow-[0_0_0_6px_hsl(var(--primary)/0.08)] group-focus-visible:ring-2 group-focus-visible:ring-ring/40">
                    {a.photoUrl ? (
                      <ImageWithFallback src={a.photoUrl} alt={a.name} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-2xl font-semibold text-muted-foreground transition-colors group-hover:text-primary">{a.name.charAt(0)}</span>
                    )}
                  </span>
                  <span className="mt-2 block truncate text-sm font-medium transition-colors group-hover:text-primary">{a.name}</span>
                  <span className="block text-xs tabular-nums text-muted-foreground">{a.bookCount} {a.bookCount === 1 ? "book" : "books"}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function TopPublishers() {
  const { publishers, loading } = useCatalog();
  const top = useMemo(() => [...publishers].filter((p) => p.bookCount > 0).sort((a, b) => b.bookCount - a.bookCount).slice(0, 12), [publishers]);
  if (loading && publishers.length === 0) return null;
  if (top.length === 0) return null;
  return (
    <Section>
      <SectionHeader eyebrow="Imprints" title="Top publishers" href="/publishers" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {top.map((p) => (
          <Link key={p.id} to={`/publisher/${p.slug}`} className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <span className="block truncate font-display text-base font-semibold tracking-tight group-hover:text-primary">{p.name}</span>
            <span className="mt-1 block text-xs tabular-nums text-muted-foreground">{p.bookCount} {p.bookCount === 1 ? "title" : "titles"}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Recently sold ---------------- */

export function RecentlySold() {
  const r = useQuery(["books", "home", "recently-sold"], () => services.store.recentlySold());
  return (
    <BooksRailSection eyebrow="Live from the shop" title="Recently sold" subtitle="Books other readers just ordered" books={r.data} loading={r.loading} error={r.error} onRetry={r.refetch} />
  );
}

/* ---------------- Campaign collection ---------------- */

export function CampaignCollection({ banners }: { banners: Banner[] }) {
  const first = banners[0];
  const query: BookQuery = hrefToQuery(first?.ctaHref) ?? { flag: "editors" };
  return (
    <>
      {banners.length > 0 && (
        <Section>
          <div className={banners.length > 1 ? "grid gap-4 md:grid-cols-2" : ""}>
            {banners.slice(0, 2).map((b) => <CampaignBanner key={b.id} banner={b} />)}
          </div>
        </Section>
      )}
      <QueryRailSection
        eyebrow="Campaign"
        title={first ? `${first.title} collection` : "Editor's picks"}
        href={first?.ctaHref || "/books?flag=editors"}
        query={query}
      />
    </>
  );
}

/* ---------------- Recommendations ---------------- */

function dedupe(books: Book[], exclude: Set<string>): Book[] {
  const seen = new Set(exclude);
  return books.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
}

export function Recommendations() {
  const { recent } = useStore();
  const { user } = useAuth();
  const recentIds = recent.slice(0, 10);

  const browsing = useQuery(["books", "home", "rec-browsing", recentIds.join(",")], async () => {
    if (recentIds.length === 0) return [] as Book[];
    const viewed = await services.books.getMany(recentIds);
    const latest = viewed.find((b) => b.id === recentIds[0]) ?? viewed[0];
    const related = latest ? await services.books.related(latest).catch(() => [] as Book[]) : [];
    return dedupe([...related, ...viewed.filter((b) => b.id !== latest?.id)], new Set(latest ? [latest.id] : []));
  }, { enabled: recentIds.length > 0 });

  const purchases = useQuery(["books", "home", "rec-purchases", user?.id], async () => {
    const orders = await services.orders.listForUser();
    const bought = Array.from(new Set(orders.flatMap((o) => o.items.map((i) => i.bookId))));
    if (bought.length === 0) return [] as Book[];
    const seeds = (await services.books.getMany(bought.slice(0, 3)));
    const lists = await Promise.all(seeds.map((b) => services.books.related(b).catch(() => [] as Book[])));
    return dedupe(lists.flat(), new Set(bought));
  }, { enabled: !!user });

  const tabs = [
    { id: "browsing", label: "From your browsing", q: browsing, on: recentIds.length > 0 },
    { id: "purchases", label: "From your purchases", q: purchases, on: !!user },
  ].filter((t) => t.on);

  if (tabs.length === 0) return null;
  const anyLoading = tabs.some((t) => t.q.loading);
  const visible = tabs.filter((t) => t.q.loading || t.q.error || (t.q.data?.length ?? 0) > 0);
  if (!anyLoading && visible.length === 0) return null;

  return (
    <Section band>
      <SectionHeader eyebrow="Based on your activity" title="Recommended for you" subtitle="Picked from books you've viewed and ordered on this account." />
      <Tabs defaultValue={visible[0]?.id ?? tabs[0].id}>
        {visible.length > 1 && (
          <TabsList className="mb-5">
            {visible.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
          </TabsList>
        )}
        {(visible.length ? visible : tabs).map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <BookRail books={t.q.data} loading={t.q.loading} error={t.q.error} onRetry={t.q.refetch} />
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}

/* ---------------- Explore tabs ---------------- */

const EXPLORE: { id: string; label: string; query: BookQuery; href: string }[] = [
  { id: "favorites", label: "Reader favorites", query: { sort: "rating" }, href: "/books?sort=rating" },
  { id: "must", label: "100 must reads", query: { flag: "editors" }, href: "/books?flag=editors" },
  { id: "award", label: "Award winners", query: { flag: "award" }, href: "/books?flag=award" },
  { id: "reviewed", label: "Most reviewed", query: { sort: "popularity" }, href: "/books?sort=popularity" },
  { id: "new", label: "New releases", query: { flag: "new", sort: "newest" }, href: "/books?flag=new" },
];

export function ExploreTabs() {
  const [tab, setTab] = useState(EXPLORE[0].id);
  const current = EXPLORE.find((e) => e.id === tab)!;
  return (
    <Section>
      <SectionHeader eyebrow="Explore" title="Find your next read" href={current.href} />
      <Tabs value={tab} onValueChange={setTab}>
        <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-5 overflow-x-auto">
          <TabsList>
            {EXPLORE.map((e) => <TabsTrigger key={e.id} value={e.id}>{e.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {EXPLORE.map((e) => (
          <TabsContent key={e.id} value={e.id}>
            <ExploreGrid query={e.query} />
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}

function ExploreGrid({ query }: { query: BookQuery }) {
  const r = useBooks({ ...query, pageSize: 10 });
  if (r.loading) return <BookGridSkeleton count={5} />;
  if (r.error) return <ErrorState compact onRetry={r.refetch} />;
  const books = r.data?.items ?? [];
  if (books.length === 0) return <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No books in this collection yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((b) => <BookCard key={b.id} book={b} />)}
    </div>
  );
}
