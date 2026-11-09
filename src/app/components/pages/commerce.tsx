// Cart, wishlist and compare pages — all driven by the client-side store.

import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { GitCompare, Heart, ShieldCheck, ShoppingCart, Tag, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../contexts/StoreContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { services } from "../../../services";
import { BookCover } from "../common/BookCover";
import { PriceTag } from "../common/PriceTag";
import { RatingStars } from "../common/RatingStars";
import { QuantityStepper } from "../common/QuantityStepper";
import { EmptyState } from "../common/EmptyState";
import { CONTAINER, PageHeader, PanelSkeleton } from "../catalog/states";
import { useStoreSettings } from "../product/useStoreSettings";
import { formatTk } from "../../../lib/format";
import type { Book } from "../../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { cn } from "../ui/utils";

export const COUPON_KEY = "bp.coupon";
const variantOf = (b: Book, variantId?: string) => b.variants?.find((variant) => variant.id === variantId) ?? b.variants?.[0];
const priceOf = (b: Book, variantId?: string) => variantOf(b, variantId)?.flashPrice ?? variantOf(b, variantId)?.price ?? b.flashSale?.price ?? b.price;

  export function CartPage() {
  const { cart, bookCache, setQty, removeFromCart, toggleWishlist, inWishlist } = useStore();
  const { authorById } = useCatalog();
  const settings = useStoreSettings();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setCoupon(sessionStorage.getItem(COUPON_KEY) ?? "");
  }, []);

  const lines = cart.map((c) => ({ item: c, book: bookCache[c.bookId] })).filter((l): l is { item: typeof l.item; book: Book } => !!l.book);
  const resolving = cart.length > 0 && lines.length < cart.length;
  const subtotal = lines.reduce((s, l) => s + priceOf(l.book) * l.item.qty, 0);
  const savings = lines.reduce((s, l) => s + Math.max(0, (variantOf(l.book, l.item.variantId)?.oldPrice || l.book.oldPrice) - priceOf(l.book, l.item.variantId)) * l.item.qty, 0);
  const shipping = subtotal >= settings.freeShippingThreshold || subtotal === 0 ? 0 : settings.shippingFee;
  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;
  const toFree = Math.max(0, settings.freeShippingThreshold - subtotal);
  

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setChecking(true);
    try {
      const res = await services.coupons.validate(coupon.trim(), subtotal);
      if (res.ok) {
        const code = coupon.trim().toUpperCase();
        setApplied({ code, discount: res.discount });
        sessionStorage.setItem(COUPON_KEY, code);
        toast.success(res.message);
      } else { setApplied(null); sessionStorage.removeItem(COUPON_KEY); toast.error(res.message); }
    } catch (err) {
      toast.error(`Coupon check failed: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  };
  const removeCoupon = () => { setApplied(null); setCoupon(""); sessionStorage.removeItem(COUPON_KEY); };

  if (cart.length === 0) {
    return (
      <div className={cn(CONTAINER, "py-16")}>
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Browse our catalogue and add some books." action={<Button asChild><Link to="/books">Shop books</Link></Button>} />
      </div>
    );
  }

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader crumbs={[{ label: "Home", to: "/" }, { label: "Cart" }]} eyebrow="Your basket" title="Shopping cart" description={`${cart.reduce((n, c) => n + c.qty, 0)} items`} />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            {toFree > 0 ? (
              <p className="flex items-center gap-2 text-sm"><Truck size={16} className="text-accent" /> Add <span className="font-semibold tabular-nums">{formatTk(toFree)}</span> more for free delivery</p>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-accent"><Truck size={16} /> You've unlocked free delivery</p>
            )}
            <Progress value={Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)} className="mt-3 h-1.5" aria-label="Progress to free delivery" />
          </div>

          {resolving && lines.length === 0 ? <PanelSkeleton rows={cart.length} /> : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {lines.map(({ item, book }) => {
                const author = book.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ");
                return (
                  <li key={item.bookId} className="flex gap-4 p-4 sm:p-5">
                    <Link to={`/book/${book.slug}`} className="h-32 w-[86px] shrink-0 overflow-hidden rounded-[3px] shadow-sm">
                      <BookCover title={book.title} author={author} coverUrl={book.coverUrl} />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/book/${book.slug}`}><h3 className="font-display font-semibold leading-snug hover:text-primary">{book.title}</h3></Link>
                          {author && <p className="text-xs text-muted-foreground">{author}</p>}
                          <p className={cn("mt-1 text-xs", (variantOf(book, item.variantId)?.stock ?? book.stock) > 0 ? "text-accent" : "text-destructive")}>{(variantOf(book, item.variantId)?.stock ?? book.stock) > 0 ? "In stock" : "Out of stock"}</p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">{formatTk(priceOf(book, item.variantId) * item.qty)}</p>
                      </div>
                      <div className="mt-1"><p className="text-xs text-muted-foreground">{variantOf(book, item.variantId)?.name ?? "Paperback (Premium)"}</p><PriceTag price={priceOf(book, item.variantId)} oldPrice={variantOf(book, item.variantId)?.oldPrice ?? book.oldPrice} size="sm" /></div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                        <QuantityStepper value={item.qty} onChange={(v) => setQty(item.bookId, v, item.variantId)} max={variantOf(book, item.variantId)?.stock ?? book.stock} />
                        <div className="flex items-center gap-3 text-xs">
                          <button onClick={() => { if (!inWishlist(book.id)) toggleWishlist(book); removeFromCart(item.bookId, item.variantId); }} className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><Heart size={13} /> Save for later</button>
                          <button onClick={() => removeFromCart(item.bookId, item.variantId)} className="flex items-center gap-1 text-muted-foreground hover:text-destructive"><Trash2 size={13} /> Remove</button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              {resolving && <li className="p-4"><div className="h-24 animate-pulse rounded bg-muted" /></li>}
            </ul>
          )}
          <Link to="/books" className="mt-4 inline-block text-sm text-primary hover:underline">← Continue shopping</Link>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Order summary</h2>
            {applied ? (
              <div className="mt-4 flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-accent"><Tag size={14} /> {applied.code} applied</span>
                <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="Coupon code" onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} />
                <Button variant="outline" onClick={applyCoupon} disabled={checking}>{checking ? "…" : "Apply"}</Button>
              </div>
            )}
            <dl className="mt-5 space-y-2 text-sm">
              <Row label="Subtotal" value={formatTk(subtotal)} />
              {savings > 0 && <Row label="You save" value={formatTk(savings)} tone="accent" />}
              {applied && <Row label={`Coupon (${applied.code})`} value={`- ${formatTk(discount)}`} tone="primary" />}
              <Row label="Delivery" value={shipping === 0 ? "Free" : formatTk(shipping)} />
              <div className="border-t border-border pt-3"><Row label="Total" value={formatTk(total)} bold /></div>
            </dl>
            <p className="mt-1 text-[11px] text-muted-foreground">Final delivery fee is confirmed at checkout based on your district.</p>
            <Button size="lg" className="mt-5 w-full" disabled={lines.length === 0} onClick={() => navigate("/checkout")}>Proceed to checkout</Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck size={13} className="text-accent" /> Secure checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "primary" | "accent" }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={cn("tabular-nums", bold && "font-display text-xl font-semibold", tone === "primary" && "text-primary", tone === "accent" && "text-accent")}>{value}</dd>
    </div>
  );
}

export function WishlistPage() {
  const { wishlist, bookCache, toggleWishlist, addToCart } = useStore();
  const { authorById } = useCatalog();
  const books = wishlist.map((id) => bookCache[id]).filter((b): b is Book => !!b);
  const resolving = books.length < wishlist.length;

  if (wishlist.length === 0) {
    return (
      <div className={cn(CONTAINER, "py-16")}>
        <EmptyState icon={Heart} title="Your wishlist is empty" description="Save books you love to find them here later." action={<Button asChild><Link to="/books">Discover books</Link></Button>} />
      </div>
    );
  }

  const inStock = books.filter((b) => b.stock > 0);

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader
        eyebrow="Saved for later"
        title="Wishlist"
        description={`${wishlist.length} ${wishlist.length === 1 ? "book" : "books"}`}
        actions={inStock.length > 1 ? <Button variant="outline" className="gap-2" onClick={() => inStock.forEach((b) => addToCart(b))}><ShoppingCart size={15} /> Add all in stock</Button> : undefined}
      />
      {resolving && books.length === 0 ? <PanelSkeleton rows={Math.min(wishlist.length, 4)} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((b) => (
            <div key={b.id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
              <Link to={`/book/${b.slug}`} className="h-28 w-[75px] shrink-0 overflow-hidden rounded-[3px] shadow-sm"><BookCover title={b.title} coverUrl={b.coverUrl} /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/book/${b.slug}`} className="min-w-0"><h3 className="line-clamp-2 font-display font-semibold leading-snug hover:text-primary">{b.title}</h3></Link>
                  <button onClick={() => toggleWishlist(b)} aria-label={`Remove ${b.title} from wishlist`} className="text-muted-foreground hover:text-destructive"><X size={16} /></button>
                </div>
                <p className="text-xs text-muted-foreground">{b.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ")}</p>
                <div className="mt-1"><PriceTag price={priceOf(b)} oldPrice={b.oldPrice} size="sm" /></div>
                <Button size="sm" className="mt-auto gap-2 self-start" disabled={b.stock <= 0} onClick={() => addToCart(b)}><ShoppingCart size={14} /> {b.stock > 0 ? "Add to cart" : "Out of stock"}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparePage() {
  const { compare, bookCache, removeCompare, addToCart } = useStore();
  const { authorById, publisherById } = useCatalog();
  const books = compare.map((id) => bookCache[id]).filter((b): b is Book => !!b);

  if (compare.length === 0) {
    return (
      <div className={cn(CONTAINER, "py-16")}>
        <EmptyState icon={GitCompare} title="Nothing to compare" description="Add books to compare their details side by side." action={<Button asChild><Link to="/books">Browse books</Link></Button>} />
      </div>
    );
  }

  const rows: [string, (b: Book) => React.ReactNode][] = [
    ["Price", (b) => <PriceTag price={priceOf(b)} oldPrice={b.oldPrice} size="sm" />],
    ["Rating", (b) => <RatingStars value={b.ratingAvg} count={b.ratingCount} />],
    ["Author", (b) => b.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ") || "—"],
    ["Translator", (b) => b.translator || "—"],
    ["Publisher", (b) => publisherById(b.publisherId)?.name ?? "—"],
    ["Language", (b) => b.language],
    ["Binding", (b) => b.binding],
    ["Pages", (b) => <span className="tabular-nums">{b.pages || "—"}</span>],
    ["Edition", (b) => b.edition || "—"],
    ["ISBN", (b) => <span className="tabular-nums">{b.isbn || "—"}</span>],
    ["Availability", (b) => <span className={b.stock > 0 ? "text-accent" : "text-destructive"}>{b.stock > 0 ? "In stock" : "Out of stock"}</span>],
  ];

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader eyebrow="Side by side" title="Compare books" description={`${compare.length} selected`} />
      {books.length < compare.length && books.length === 0 ? <PanelSkeleton rows={2} /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 w-36 bg-card" />
                {books.map((b) => (
                  <th key={b.id} className="p-4 align-top font-normal">
                    <div className="relative mx-auto mb-3 h-40 w-28 overflow-hidden rounded-[3px] shadow-sm"><BookCover title={b.title} coverUrl={b.coverUrl} /></div>
                    <Link to={`/book/${b.slug}`}><p className="line-clamp-2 font-display font-semibold leading-snug hover:text-primary">{b.title}</p></Link>
                    <button onClick={() => removeCompare(b.id)} className="mt-1 text-xs text-muted-foreground hover:text-destructive" aria-label={`Remove ${b.title} from compare`}>Remove</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label} className="border-t border-border even:bg-secondary/40">
                  <th scope="row" className="sticky left-0 bg-inherit p-3 text-left font-medium text-muted-foreground">{label}</th>
                  {books.map((b) => <td key={b.id} className="p-3 text-center">{render(b)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-border">
                <td />
                {books.map((b) => (
                  <td key={b.id} className="p-3"><Button size="sm" className="w-full" disabled={b.stock <= 0} onClick={() => addToCart(b)}>Add to cart</Button></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
