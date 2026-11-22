// Book detail page: gallery, sticky buy box (desktop) / sticky action bar
// (mobile), tabbed description/specs/reviews, frequently-bought-together
// bundle, related titles and recently viewed.

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/navigation";
import {
  BadgeCheck, GitCompare, Heart, Minus, Plus, RotateCcw, Share2, ShieldCheck, ShoppingCart, Truck, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { useCatalog } from "../../contexts/CatalogContext";
import { useStore } from "../../contexts/StoreContext";
import { RatingStars } from "../common/RatingStars";
import { BookRail } from "../common/BookRail";
import { RailSkeleton } from "../common/Skeletons";
import { ReviewsTab } from "./ReviewsTab";
import { ProductGallery } from "../product/ProductGallery";
import { BundleBox } from "../product/BundleBox";
import { useStoreSettings } from "../product/useStoreSettings";
import { CONTAINER, Breadcrumbs, ErrorState, Eyebrow } from "../catalog/states";
import { EmptyState } from "../common/EmptyState";
import { discountPercent, formatDate, formatTk } from "../../../lib/format";
import type { Book, ProductVariant } from "../../../types";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../ui/utils";

const MAX_QTY = 10;
const variantKey = (v: ProductVariant) => v.id ?? v.name;

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { authorById, publisherById, sellerById, categoryById } = useCatalog();
  const { addToCart, toggleWishlist, inWishlist, toggleCompare, inCompare, pushRecent, recent, bookCache } = useStore();
  const settings = useStoreSettings();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState("");
  const [tab, setTab] = useState("description");

  const bookQ = useQuery(["book", slug], () => services.books.getBySlug(slug!), { enabled: !!slug });
  const book = bookQ.data;

  // Record the visit once per book (not on every store re-render).
  useEffect(() => {
    if (book) pushRecent(book);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  // Reset quantity and pre-select the first in-stock format when the book changes.
  useEffect(() => {
    if (!book) return;
    setQty(1);
    const first = book.variants?.find((v) => v.stock > 0) ?? book.variants?.[0];
    setVariantId(first ? variantKey(first) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  const related = useQuery(["book", slug, "related"], () => services.books.related(book!), { enabled: !!book });
  const fbt = useQuery(["book", slug, "fbt"], () => services.books.frequentlyBoughtTogether(book!), { enabled: !!book });

  if (bookQ.loading) return <DetailsSkeleton />;
  if (bookQ.error) return <div className={cn(CONTAINER, "py-16")}><ErrorState error={bookQ.error} onRetry={bookQ.refetch} title="Couldn't load this book" /></div>;
  if (!book) {
    return (
      <div className={cn(CONTAINER, "py-16")}>
        <EmptyState title="Book not found" description="It may have been removed or the link is incorrect." action={<Button asChild><Link to="/books">Browse all books</Link></Button>} />
      </div>
    );
  }

  const authors = book.authorIds.map((id) => authorById(id)).filter((a): a is NonNullable<typeof a> => !!a);
  const authorNames = authors.map((a) => a.name).join(", ");
  const publisher = publisherById(book.publisherId);
  const seller = sellerById(book.sellerId);
  const category = book.categoryIds.map((id) => categoryById(id)).find(Boolean);

  const variants = book.variants ?? [];
  const variant = variants.find((v) => variantKey(v) === variantId) ?? variants[0];
  const price = variant?.flashPrice ?? variant?.price ?? book.flashSale?.price ?? book.price;
  // Never mix a variant's price with the base book's old price.
  const oldPrice = (variant ? variant.oldPrice : book.oldPrice) ?? 0;
  const stock = variant?.stock ?? book.stock;
  const pct = discountPercent(price, oldPrice);
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY));
  const safeQty = Math.min(qty, maxQty);
  const freeShip = price * safeQty >= settings.freeShippingThreshold;

  const flashEndsAt =
    book.flashSale && (variant ? variant.flashPrice != null : true) && new Date(book.flashSale.endsAt).getTime() > Date.now()
      ? book.flashSale.endsAt
      : undefined;

  const wished = inWishlist(book.id);
  const compared = inCompare(book.id);
  const recentBooks = recent.map((id) => bookCache[id]).filter((b): b is Book => !!b && b.id !== book.id).slice(0, 12);

  const scrollToTabs = (next: string) => {
    setTab(next);
    document.getElementById("details-tabs")?.scrollIntoView({ behavior: "smooth" });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: book.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }
    } catch { /* cancelled */ }
  };
  const add = () => addToCart(book, safeQty, variant);
  const buyNow = () => { addToCart(book, safeQty, variant); navigate("/checkout"); };
  const onCompare = () => { toggleCompare(book); toast(compared ? "Removed from compare" : "Added to compare", { action: compared ? undefined : { label: "View", onClick: () => navigate("/compare") } }); };

  const specs: [string, React.ReactNode][] = [
    ["Author", authors.length ? authors.map((a, i) => <span key={a.id}>{i > 0 && ", "}<Link to={`/author/${a.slug}`} className="text-primary hover:underline">{a.name}</Link></span>) : "—"],
    ...(book.translator ? [["Translator", book.translator] as [string, React.ReactNode]] : []),
    ["Publisher", publisher ? <Link to={`/publisher/${publisher.slug}`} className="text-primary hover:underline">{publisher.name}</Link> : "—"],
    ["ISBN", <span className="tabular-nums">{book.isbn || "—"}</span>],
    ["Edition", book.edition || "—"],
    ["Number of pages", book.pages ? <span className="tabular-nums">{book.pages}</span> : "—"],
    ["Language", book.language || "—"],
    ["Binding", book.binding || "—"],
    ["Weight", book.weightGrams ? <span className="tabular-nums">{book.weightGrams} g</span> : "—"],
    ...(category ? [["Category", <Link to={`/category/${category.slug}`} className="text-primary hover:underline">{category.name}</Link>] as [string, React.ReactNode]] : []),
  ];

  const quickFacts = ([
    ["Pages", book.pages],
    ["Language", book.language],
    ["Binding", variant?.name ?? book.binding],
    ["Edition", book.edition],
  ] as const).filter(([, v]) => !!v);

  const badges = [
    book.flashSale && "Flash sale",
    book.isBestseller && "Bestseller",
    book.isNewArrival && "New arrival",
    book.isEditorsChoice && "Editor's choice",
    book.isAwardWinner && "Award winner",
  ].filter(Boolean) as string[];

  const buyActionProps = {
    qty: safeQty, setQty, maxQty, outOfStock, wished, compared,
    onAdd: add, onBuy: buyNow, onWish: () => toggleWishlist(book), onCompare, onShare: share,
  };

  const sellerLine = seller && (
    <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
      Sold by <span className="font-medium text-foreground">{seller.name}</span> · {seller.rating}★ seller
    </p>
  );

  return (
    <div className="pb-28 lg:pb-0">
      <div className={cn(CONTAINER, "py-6 lg:py-8")}>
        <Breadcrumbs
          className="mb-6"
          items={[{ label: "Home", to: "/" }, { label: "Books", to: "/books" }, ...(category ? [{ label: category.name, to: `/category/${category.slug}` }] : []), { label: book.title }]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(300px,3fr)]">
          {/* Gallery */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery
              title={book.title}
              author={authorNames}
              coverUrl={book.coverUrl}
              images={book.images}
              badge={pct > 0 ? <span className="rounded bg-primary px-2 py-1 text-xs font-semibold tabular-nums text-primary-foreground">-{pct}%</span> : undefined}
            />
          </div>

          {/* Info */}
          <div className="min-w-0">
            {badges.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {badges.map((b) => <span key={b} className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{b}</span>)}
              </div>
            )}
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">{book.title}</h1>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {authors.length > 0 && (
                <p>by {authors.map((a, i) => <span key={a.id}>{i > 0 && ", "}<Link to={`/author/${a.slug}`} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">{a.name}</Link></span>)}</p>
              )}
              {book.translator && <p>Translated by <span className="text-foreground">{book.translator}</span></p>}
              {publisher && <p>Published by <Link to={`/publisher/${publisher.slug}`} className="text-foreground underline-offset-4 hover:text-primary hover:underline">{publisher.name}</Link></p>}
            </div>

            <button onClick={() => scrollToTabs("reviews")} className="mt-4 flex items-center gap-2 text-sm hover:text-primary">
              <RatingStars value={book.ratingAvg} size={16} />
              {book.ratingCount > 0 ? (
                <>
                  <span className="font-medium tabular-nums">{book.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted-foreground">· {book.ratingCount} {book.ratingCount === 1 ? "rating" : "ratings"}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No ratings yet · Be the first to review</span>
              )}
            </button>

            {/* Format + price for < xl (the xl buy box has its own) */}
            <div className="mt-6 border-y border-border py-5 xl:hidden">
              <VariantSelector variants={variants} value={variant ? variantKey(variant) : ""} onChange={setVariantId} />
              <PriceBlock price={price} oldPrice={oldPrice} stock={stock} pct={pct} flashEndsAt={flashEndsAt} />
            </div>

            <div className="mt-6">
              <Eyebrow className="mb-2">About this book</Eyebrow>
              {book.description ? (
                <>
                  <p className="line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{book.description}</p>
                  {book.description.length > 300 && (
                    <button className="mt-2 text-sm font-medium text-primary hover:underline" onClick={() => scrollToTabs("description")}>Read more</button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No description available yet.</p>
              )}
            </div>

            {quickFacts.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-secondary/60 p-4 text-sm sm:grid-cols-4">
                {quickFacts.map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></div>
                ))}
              </dl>
            )}

            {/* Delivery info (all screen sizes) */}
            <div className="mt-6 rounded-lg border border-border bg-card p-5 [&>ul]:mt-0 [&>ul]:border-t-0 [&>ul]:pt-0">
              <DeliveryInfo estimate={settings.deliveryEstimate} threshold={settings.freeShippingThreshold} fee={settings.shippingFee} freeShip={freeShip} />
              {sellerLine}
            </div>

            {/* Buy box for < xl screens */}
            <div className="mt-6 xl:hidden">
              <BuyActions {...buyActionProps} />
            </div>
          </div>

          {/* Sticky buy box (xl) */}
          <aside className="hidden xl:block">
            <div className="sticky top-28 rounded-lg border border-border bg-card p-5">
              <VariantSelector variants={variants} value={variant ? variantKey(variant) : ""} onChange={setVariantId} />
              <PriceBlock price={price} oldPrice={oldPrice} stock={stock} pct={pct} flashEndsAt={flashEndsAt} />
              <div className="mt-5">
                <BuyActions {...buyActionProps} />
              </div>
            </div>
          </aside>
        </div>

        {/* Frequently bought together */}
        {fbt.loading ? (
          <section className="mt-14"><div className="h-48 animate-pulse rounded-lg bg-muted" /></section>
        ) : fbt.data && fbt.data.filter((b) => b.id !== book.id).length > 0 && (
          <section className="mt-14">
            <SectionTitle eyebrow="Bundle & save" title="Frequently bought together" />
            <BundleBox book={book} companions={fbt.data} />
          </section>
        )}

        {/* Tabs */}
        <section id="details-tabs" className="mt-14 scroll-mt-28">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
              {[["description", "Description"], ["specs", "Specifications"], ["reviews", `Reviews (${book.ratingCount})`]].map(([v, l]) => (
                <TabsTrigger key={v} value={v} className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 font-display text-base shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="description" className="pt-6">
              <div className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">{book.description || "No description available yet."}</div>
            </TabsContent>
            <TabsContent value="specs" className="pt-6">
              <div className="max-w-3xl overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([k, v]) => (
                      <tr key={k} className="border-b border-border last:border-0 even:bg-secondary/40">
                        <th scope="row" className="w-36 px-4 py-3 text-left font-normal text-muted-foreground sm:w-44">{k}</th>
                        <td className="px-4 py-3">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Listed {formatDate(book.createdAt)}</p>
            </TabsContent>
            <TabsContent value="reviews" className="pt-6">
              <ReviewsTab book={book} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Related */}
        <section className="mt-16">
          <SectionTitle eyebrow="You may also like" title="Related books" />
          {related.loading ? <RailSkeleton /> : related.error ? (
            <ErrorState error={related.error} onRetry={related.refetch} />
          ) : related.data && related.data.length > 0 ? <BookRail books={related.data} /> : (
            <p className="text-sm text-muted-foreground">No related books yet.</p>
          )}
        </section>

        {recentBooks.length > 0 && (
          <section className="mt-16 mb-8">
            <SectionTitle eyebrow="Your history" title="Recently viewed" />
            <BookRail books={recentBooks} />
          </section>
        )}
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card px-4 py-3 md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold leading-none tabular-nums lining-nums">{formatTk(price)}</p>
            {pct > 0 && <p className="mt-1 text-xs tabular-nums text-muted-foreground"><span className="line-through">{formatTk(oldPrice)}</span> · -{pct}%</p>}
          </div>
          <Button variant="outline" size="icon" aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} onClick={() => toggleWishlist(book)}>
            <Heart size={17} fill={wished ? "currentColor" : "none"} className={wished ? "text-primary" : ""} />
          </Button>
          <Button variant="outline" size="icon" disabled={outOfStock} onClick={add} aria-label="Add to cart"><ShoppingCart size={16} /></Button>
          <Button disabled={outOfStock} onClick={buyNow}>{outOfStock ? "Out of stock" : "Buy now"}</Button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function VariantSelector({ variants, value, onChange }: { variants: ProductVariant[]; value: string; onChange: (key: string) => void }) {
  if (variants.length < 2) return null;
  return (
    <div className="mb-5" role="radiogroup" aria-label="Choose format">
      <p className="mb-2 text-sm font-medium">Choose format</p>
      <div className="grid gap-2">
        {variants.map((v) => {
          const key = variantKey(v);
          const selected = value === key;
          const soldOut = v.stock <= 0;
          const vPrice = v.flashPrice ?? v.price;
          const vPct = discountPercent(vPrice, v.oldPrice ?? 0);
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soldOut}
              onClick={() => onChange(key)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/30",
                soldOut && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="min-w-0">
                <span className="block font-medium leading-snug">{v.name}</span>
                <span className={cn("text-xs", soldOut ? "text-destructive" : v.stock <= 5 ? "text-amber-600" : "text-muted-foreground")}>
                  {soldOut ? "Out of stock" : v.stock <= 5 ? `Only ${v.stock} left` : "In stock"}
                </span>
              </span>
              <span className="shrink-0 text-right tabular-nums lining-nums">
                <span className="block font-semibold">{formatTk(vPrice)}</span>
                {vPct > 0 && (
                  <span className="text-xs text-muted-foreground">
                    <span className="line-through">{formatTk(v.oldPrice ?? 0)}</span> · -{vPct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FlashSaleBanner({ endsAt }: { endsAt: string }) {
  // Start null so server and client render the same markup, then tick on the client.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = now === null ? null : Math.max(0, new Date(endsAt).getTime() - now);
  if (left === 0) return null;

  const s = left === null ? 0 : Math.floor(left / 1000);
  const units: [string, number][] = [
    ["Days", Math.floor(s / 86400)],
    ["Hrs", Math.floor((s % 86400) / 3600)],
    ["Min", Math.floor((s % 3600) / 60)],
    ["Sec", s % 60],
  ];

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between gap-3 bg-primary px-3 py-1.5 text-primary-foreground">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Zap size={14} fill="currentColor" /> Flash sale
        </span>
        <span className="text-xs opacity-90">Ends {formatDate(endsAt)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">Special price ends in</span>
        <div className="flex gap-1.5" role="timer" aria-label="Time left on flash sale">
          {units.map(([label, value]) => (
            <div key={label} className="min-w-[2.75rem] rounded bg-card px-1.5 py-1 text-center shadow-sm ring-1 ring-border">
              <div className="text-sm font-semibold leading-none tabular-nums lining-nums text-primary">
                {left === null ? "--" : String(value).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceBlock({ price, oldPrice, stock, pct, flashEndsAt }: { price: number; oldPrice: number; stock: number; pct: number; flashEndsAt?: string }) {
  const outOfStock = stock <= 0;
  const low = !outOfStock && stock <= 5;
  return (
    <div>
      {flashEndsAt && <FlashSaleBanner endsAt={flashEndsAt} />}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-3xl font-semibold tabular-nums lining-nums">{formatTk(price)}</span>
        {pct > 0 && (
          <>
            <span className="text-base tabular-nums lining-nums text-muted-foreground line-through">{formatTk(oldPrice)}</span>
            <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">-{pct}%</span>
          </>
        )}
      </div>
      {pct > 0 && (
        <p className="mt-2 inline-block rounded bg-primary/10 px-2.5 py-1 text-sm font-semibold tabular-nums lining-nums text-primary">
          You save {formatTk(oldPrice - price)}
        </p>
      )}
      <p className={cn("mt-3 flex items-center gap-2 text-sm font-medium", outOfStock && "text-destructive", low && "text-amber-600")}>
        <span className={cn("h-2 w-2 rounded-full", outOfStock ? "bg-destructive" : low ? "bg-amber-500" : "bg-accent")} aria-hidden />
        <span className="font-normal text-muted-foreground">Availability:</span>
        {outOfStock ? "Out of stock" : low ? `Only ${stock} left in stock` : "In stock"}
      </p>
    </div>
  );
}

function BuyActions({
  qty, setQty, maxQty, outOfStock, wished, compared, onAdd, onBuy, onWish, onCompare, onShare,
}: {
  qty: number; setQty: (fn: (q: number) => number) => void; maxQty: number; outOfStock: boolean; wished: boolean; compared: boolean;
  onAdd: () => void; onBuy: () => void; onWish: () => void; onCompare: () => void; onShare: () => void;
}) {
  const ghost = "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <div className="inline-flex items-center rounded-md border border-border bg-card">
          <button aria-label="Decrease quantity" className="flex h-9 w-9 items-center justify-center disabled:opacity-40" disabled={outOfStock || qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
          <span className="w-9 text-center text-sm tabular-nums" aria-live="polite">{outOfStock ? 0 : qty}</span>
          <button aria-label="Increase quantity" className="flex h-9 w-9 items-center justify-center disabled:opacity-40" disabled={outOfStock || qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}><Plus size={14} /></button>
        </div>
        {!outOfStock && qty >= maxQty && <span className="text-xs text-muted-foreground">Max {maxQty}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" className="gap-2" disabled={outOfStock} onClick={onAdd}><ShoppingCart size={16} /> Add to cart</Button>
        <Button size="lg" variant="outline" disabled={outOfStock} onClick={onBuy}>Buy now</Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button onClick={onWish} aria-pressed={wished} className={ghost}>
          <Heart size={15} fill={wished ? "currentColor" : "none"} className={wished ? "text-primary" : ""} /> {wished ? "Saved" : "Wishlist"}
        </button>
        <button onClick={onCompare} aria-pressed={compared} className={ghost}>
          <GitCompare size={15} className={compared ? "text-primary" : ""} /> {compared ? "Comparing" : "Compare"}
        </button>
        <button onClick={onShare} className={ghost}>
          <Share2 size={15} /> Share
        </button>
      </div>
    </div>
  );
}

function DeliveryInfo({ estimate, threshold, fee, freeShip }: { estimate: string; threshold: number; fee: number; freeShip: boolean }) {
  return (
    <ul className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
      <li className="flex gap-3"><Truck size={17} className="mt-0.5 shrink-0 text-accent" /><span>{estimate}</span></li>
      <li className="flex gap-3">
        <BadgeCheck size={17} className="mt-0.5 shrink-0 text-accent" />
        <span>{freeShip ? "This order qualifies for free delivery" : <>Free delivery on orders over <span className="tabular-nums">{formatTk(threshold)}</span>, otherwise from <span className="tabular-nums">{formatTk(fee)}</span></>}</span>
      </li>
      <li className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" /><span>100% authentic books</span></li>
      <li className="flex gap-3"><RotateCcw size={17} className="mt-0.5 shrink-0 text-accent" /><span>Easy 7-day returns on damaged items</span></li>
    </ul>
  );
}

function DetailsSkeleton() {
  return (
    <div className={cn(CONTAINER, "py-8")} aria-busy>
      <div className="mb-6 h-3 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[5fr_7fr] xl:grid-cols-[5fr_4fr_3fr]">
        <div className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden h-80 animate-pulse rounded-lg bg-muted xl:block" />
      </div>
    </div>
  );
}