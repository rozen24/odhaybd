// Global slide-in cart drawer. Mounted once in RootLayout; opened automatically
// whenever addToCart is called via StoreContext.

import { Link, useNavigate } from "@/lib/navigation";
import { Trash2, Truck } from "lucide-react";
import { useStore } from "../../contexts/StoreContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { useStoreSettings } from "../product/useStoreSettings";
import { BookCover } from "../common/BookCover";
import { PriceTag } from "../common/PriceTag";
import { QuantityStepper } from "../common/QuantityStepper";
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { formatTk, discountPercent } from "../../../lib/format";
import { cn } from "../ui/utils";
import type { Book } from "../../../types";

const variantOf = (b: Book, variantId?: string) => b.variants?.find((variant) => variant.id === variantId) ?? b.variants?.[0];
const priceOf = (b: Book, variantId?: string) => variantOf(b, variantId)?.flashPrice ?? variantOf(b, variantId)?.price ?? b.flashSale?.price ?? b.price;

export function ShoppingCartDrawer() {
  const { cart, bookCache, cartDrawerOpen, closeCartDrawer, setQty, removeFromCart, recent } = useStore();
  const { authorById } = useCatalog();
  const settings = useStoreSettings();
  const navigate = useNavigate();

  const lines = cart
    .map((c) => ({ item: c, book: bookCache[c.bookId] }))
    .filter((l): l is { item: typeof l.item; book: Book } => !!l.book);

  const subtotal = lines.reduce((s, l) => s + priceOf(l.book, l.item.variantId) * l.item.qty, 0);
  const savings = lines.reduce((s, l) => s + Math.max(0, (variantOf(l.book, l.item.variantId)?.oldPrice || l.book.oldPrice) - priceOf(l.book, l.item.variantId)) * l.item.qty, 0);
  const toFree = Math.max(0, settings.freeShippingThreshold - subtotal);
  const freeProgress = settings.freeShippingThreshold > 0
    ? Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)
    : 100;

  // Recommendations: up to 4 recently-viewed books not already in cart
  const cartIds = new Set(cart.map((c) => c.bookId));
  const recommendations = recent
    .filter((id) => !cartIds.has(id) && bookCache[id])
    .slice(0, 4)
    .map((id) => bookCache[id]);

  const handleCheckout = () => {
    closeCartDrawer();
    navigate("/checkout");
  };

  const handleViewCart = () => {
    closeCartDrawer();
    navigate("/cart");
  };

  return (
    <Sheet open={cartDrawerOpen} onOpenChange={(open) => !open && closeCartDrawer()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
        aria-label="Shopping cart"
      >
        {/* Accessibility title (visually hidden — Sheet's built-in X provides the close affordance) */}
        <SheetTitle className="sr-only">Shopping Cart</SheetTitle>

        {/* Header */}
        <div className="flex items-center border-b border-border px-5 py-4 pr-12">
          <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground">
            Shopping Cart
            {cart.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {cart.reduce((n, c) => n + c.qty, 0)}
              </span>
            )}
          </h2>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Free shipping progress */}
          <div className="border-b border-border bg-secondary/40 px-5 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <Truck size={14} className={cn(toFree === 0 ? "text-accent" : "text-muted-foreground")} />
              {toFree === 0 ? (
                <span className="font-medium text-accent">You're eligible for free shipping!</span>
              ) : (
                <span className="text-muted-foreground">
                  Add <span className="font-semibold text-foreground tabular-nums">{formatTk(toFree)}</span> more for free shipping
                </span>
              )}
            </div>
            <Progress value={freeProgress} className="h-1.5" />
          </div>

          {/* Cart items */}
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="font-display text-lg font-semibold text-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Browse our catalogue and add some books.</p>
              <Button variant="outline" size="sm" onClick={() => { closeCartDrawer(); navigate("/books"); }}>
                Shop books
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map(({ item, book }) => {
                const effectivePrice = priceOf(book, item.variantId);
                const selectedVariant = variantOf(book, item.variantId);
                const pct = discountPercent(effectivePrice, selectedVariant?.oldPrice ?? book.oldPrice);
                const authorName = book.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ");
                return (
                  <li key={item.bookId} className="flex gap-3 px-5 py-4">
                    {/* Cover */}
                    <Link
                      to={`/book/${book.slug}`}
                      onClick={closeCartDrawer}
                      className="block h-[88px] w-[60px] shrink-0 overflow-hidden rounded-[3px] shadow-[inset_3px_0_5px_-3px_rgb(0_0_0/0.3)] ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <BookCover title={book.title} author={authorName} coverUrl={book.coverUrl} />
                    </Link>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        to={`/book/${book.slug}`}
                        onClick={closeCartDrawer}
                        className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {book.title}
                      </Link>
                      {authorName && (
                        <p className="truncate text-xs text-muted-foreground">{authorName}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">{variantOf(book, item.variantId)?.name ?? "Paperback (Premium)"}</p>
                      <PriceTag price={priceOf(book, item.variantId)} oldPrice={variantOf(book, item.variantId)?.oldPrice ?? book.oldPrice} size="sm" />
                      {pct > 0 && (
                        <p className="text-[11px] font-medium text-accent">
                          Save {formatTk((selectedVariant?.oldPrice ?? book.oldPrice) - effectivePrice)} ({pct}% off)
                        </p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                      <button
                        type="button"
                        aria-label={`Remove ${book.title} from cart`}
                        onClick={() => removeFromCart(item.bookId, item.variantId)}
                        className="text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <Trash2 size={14} />
                      </button>
                      <QuantityStepper
                        value={item.qty}
                        onChange={(v) => setQty(item.bookId, v, item.variantId)}
                        min={1}
                        max={99}
                      />
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatTk(priceOf(book, item.variantId) * item.qty)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                You may also like
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {recommendations.map((book) => {
                  const authorName = book.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ");
                  return (
                    <Link
                      key={book.id}
                      to={`/book/${book.slug}`}
                      onClick={closeCartDrawer}
                      className="group shrink-0 w-[72px] focus-visible:outline-none"
                    >
                      <div className="mb-1.5 h-[100px] w-[72px] overflow-hidden rounded-[3px] shadow-sm ring-1 ring-border transition-shadow group-hover:shadow">
                        <BookCover title={book.title} author={authorName} coverUrl={book.coverUrl} />
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-tight text-foreground group-hover:text-primary">
                        {book.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                        {formatTk(priceOf(book))}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Summary footer */}
        {lines.length > 0 && (
          <div className="border-t border-border bg-card px-5 py-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums text-foreground">{formatTk(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between">
                  <span className="text-accent">Total savings</span>
                  <span className="tabular-nums font-medium text-accent">−{formatTk(savings)}</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Taxes and shipping calculated at checkout
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs font-semibold uppercase tracking-wide"
                onClick={handleViewCart}
              >
                View Cart
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs font-semibold uppercase tracking-wide"
                onClick={handleCheckout}
              >
                Check Out
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
