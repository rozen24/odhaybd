// Renders the quick-view preview modal driven by QuickViewContext.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { GitCompare, Heart, Minus, Plus, Share2, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { BookCover } from "./BookCover";
import { PriceTag } from "./PriceTag";
import { RatingStars } from "./RatingStars";
import { useQuickView } from "../../contexts/QuickViewContext";
import { useStore } from "../../contexts/StoreContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { discountPercent, formatDate, formatTk } from "../../../lib/format";
import { cn } from "../ui/utils";

export function QuickViewModal() {
  const { book, close } = useQuickView();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, inWishlist, toggleCompare, inCompare } = useStore();
  const { authorById, publisherById } = useCatalog();
  const [variantKey, setVariantKey] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (book) {
      const first = book.variants?.[0];
      setVariantKey(first?.id ?? first?.name ?? "");
      setQty(1);
    }
  }, [book]);

  if (!book) return null;
  const authorName = book.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ");
  const publisher = publisherById(book.publisherId)?.name;
  const variants = book.variants?.length
    ? book.variants
    : [{ name: "Paperback (Premium)", price: book.price, oldPrice: book.oldPrice, flashPrice: book.flashSale?.price, stock: book.stock }];
  const variant = variants.find((candidate) => (candidate.id ?? candidate.name) === variantKey) ?? variants[0];
  const price = variant.flashPrice ?? variant.price;
  const oldPrice = variant.oldPrice;
  const stock = variant.stock;
  const savings = oldPrice > price ? oldPrice - price : 0;
  const discount = discountPercent(price, oldPrice);
  const wished = inWishlist(book.id);
  const compared = inCompare(book.id);
  const outOfStock = stock <= 0;
  const buyNow = () => {
    addToCart(book, qty, variant);
    close();
    navigate("/checkout");
  };
  const share = async () => {
    const url = `${window.location.origin}/book/${book.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: book.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }
    } catch { /* cancelled */ }
  };

  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-2xl lg:min-w-5xl max-h-[90dvh] overflow-y-auto p-0">
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="aspect-[2/3] lg:aspect-[1/1] sm:aspect-auto">
            <BookCover title={book.title} author={authorName} coverUrl={book.coverUrl} />
          </div>
          <div className="flex flex-col p-6">
            <DialogTitle className="font-display text-2xl font-semibold tracking-tight">{book.title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {authorName}
              {publisher ? ` · ${publisher}` : ""}
            </DialogDescription>
            <div className="mt-3">
              <RatingStars value={book.ratingAvg} count={book.ratingCount} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {variants.map((candidate) => (
                <button
                  key={candidate.id ?? candidate.name}
                  type="button"
                  onClick={() => { setVariantKey(candidate.id ?? candidate.name); setQty(1); }}
                  className={cn("rounded-md border px-3 py-2 text-left", (candidate.id ?? candidate.name) === (variant.id ?? variant.name) && "border-primary bg-primary/5")}
                >
                  <p className="text-xs font-medium text-muted-foreground">{candidate.name}</p>
                  <PriceTag price={candidate.flashPrice ?? candidate.price} oldPrice={candidate.oldPrice} size="lg" />
                  <p className="mt-1 text-xs text-muted-foreground">{candidate.stock > 0 ? `${candidate.stock} in stock` : "Out of stock"}</p>
                </button>
              ))}
            </div>
            <div className="mt-4">
              {savings > 0 && <p className="mt-1 text-sm text-primary">You save {formatTk(savings)}{discount > 0 ? ` · ${discount}% off` : ""}</p>}
              {book.flashSale && variant.flashPrice && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Zap size={13} className="text-primary" /> Flash sale price until {formatDate(book.flashSale.endsAt)}</p>
              )}
            </div>
            <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">{book.description}</p>
            <div className="mt-auto space-y-3 pt-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="inline-flex items-center rounded-md border border-border">
                  <button aria-label="Decrease quantity" className="flex h-9 w-9 items-center justify-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((value) => value - 1)}><Minus size={14} /></button>
                  <span className="w-9 text-center text-sm tabular-nums">{qty}</span>
                  <button aria-label="Increase quantity" className="flex h-9 w-9 items-center justify-center disabled:opacity-40" disabled={outOfStock || qty >= stock} onClick={() => setQty((value) => value + 1)}><Plus size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="gap-2" disabled={outOfStock} onClick={() => { addToCart(book, qty, variant); close(); }}>
                  <ShoppingCart size={16} /> Add to cart
                </Button>
                <Button variant="outline" disabled={outOfStock} onClick={buyNow}>Buy now</Button>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <button onClick={() => toggleWishlist(book)} aria-pressed={wished} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Heart size={15} fill={wished ? "currentColor" : "none"} className={wished ? "text-primary" : ""} /> {wished ? "Saved" : "Wishlist"}
                </button>
                <button onClick={() => toggleCompare(book)} aria-pressed={compared} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <GitCompare size={15} className={compared ? "text-primary" : ""} /> {compared ? "Comparing" : "Compare"}
                </button>
                <button onClick={share} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Share2 size={15} /> Share
                </button>
              </div>
              <Button variant="outline" asChild onClick={close}>
                <Link to={`/book/${book.slug}`}>View details</Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
