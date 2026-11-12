// The primary catalogue card. Used in grids and (compact) in rails. Wires up
// add-to-cart, wishlist, compare and quick-view against the store context.
//
// Hover animations are plain CSS, injected once into <head> by this file:
//  - card lifts 4px
//  - cover image scales down
//  - the 4 action icons fade in from the right
//  - cover shadow grows

import { Link } from "@/lib/navigation";
import { Eye, Heart, GitCompare, Minus, Plus, ShoppingCart } from "lucide-react";
import { BookCover } from "./BookCover";
import { PriceTag } from "./PriceTag";
import { RatingStars } from "./RatingStars";
import { useStore } from "../../contexts/StoreContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { useQuickView } from "../../contexts/QuickViewContext";
import { discountPercent, formatTk } from "../../../lib/format";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../ui/utils";
import type { Book } from "../../../types";
import { useState } from "react";



const BOOK_CARD_CSS = `
/* Card lift */
.book-card {
  transition: transform 2.4s ease;
}
.book-card:hover {
  transform: translateY(-4px);
}

/* Cover frame */
.book-card .book-card__cover {
  box-shadow:
    inset 4px 0 6px -4px rgb(0 0 0 / 0.35),
    0 0 0 1px rgb(0 0 0 / 0.1);
  transition: box-shadow 0.4s ease;
}
.book-card:hover .book-card__cover {
  box-shadow:
    inset 4px 0 6px -4px rgb(0 0 0 / 0.35),
    0 12px 24px -12px rgb(0 0 0 / 0.45),
    0 0 0 1px rgb(0 0 0 / 0.1);
}

/* Cover image scales DOWN on hover */
.book-card .book-card__img {
  display: block;
  width: 100%;
  height: 100%;
  transform: scale(1);
  transform-origin: center;
  transition: transform 2.5s ease;
}
.book-card:hover .book-card__img {
  transform: scale(1.30);
}

/* Action icons: fade in + slide from the right on hover */
.book-card .book-card__actions {
  pointer-events: none;
}
.book-card:hover .book-card__actions,
.book-card:focus-within .book-card__actions {
  pointer-events: auto;
}

.book-card .book-card__icon-btn {
  opacity: 0;
  transform: translateX(12px);
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    box-shadow 0.2s ease;
}
.book-card:hover .book-card__icon-btn,
.book-card:focus-within .book-card__icon-btn {
  opacity: 1;
  transform: translateX(0);
}

/* small stagger, only while revealing */
.book-card:hover .book-card__actions > :nth-child(1) .book-card__icon-btn { transition-delay: 0ms; }
.book-card:hover .book-card__actions > :nth-child(2) .book-card__icon-btn { transition-delay: 60ms; }
.book-card:hover .book-card__actions > :nth-child(3) .book-card__icon-btn { transition-delay: 120ms; }
.book-card:hover .book-card__actions > :nth-child(4) .book-card__icon-btn { transition-delay: 180ms; }

/* each button's own hover / press feedback */
.book-card:hover .book-card__icon-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px -2px rgb(0 0 0 / 0.25);
  transition-delay: 0ms;
}
.book-card:hover .book-card__icon-btn:active {
  transform: scale(0.95);
}

/* Touch screens: icons always visible */
@media (hover: none) {
  .book-card .book-card__icon-btn {
    opacity: 1;
    transform: none;
  }
  .book-card .book-card__actions {
    pointer-events: auto;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .book-card,
  .book-card .book-card__cover,
  .book-card .book-card__img,
  .book-card .book-card__icon-btn {
    transition: none !important;
  }
  .book-card:hover { transform: none; }
  .book-card:hover .book-card__img { transform: none; }
}

   .book-card__actions,
   .book-card__cta { opacity: 0; transition: opacity 2.2s ease; }

   .book-card:hover .book-card__actions,
   .book-card:hover .book-card__cta,
   .book-card:focus-within .book-card__actions,
   .book-card:focus-within .book-card__cta { opacity: 1; }

   .book-card__quick-view {
     position: relative;
     overflow: hidden;
   }

   .book-card__quick-view-label,
   .book-card__quick-view-icon {
     transition:
       opacity 1.5s ease,
       transform 1.5s ease;
   }

   .book-card__quick-view-label {
     transform: translateY(0);
   }

   .book-card__quick-view-icon {
     position: absolute;
     top: 50%;
     left: 50%;
     opacity: 0;
     transform: translate(-50%, 100%);
   }

   .book-card__quick-view:hover .book-card__quick-view-label,
   .book-card__quick-view:focus-visible .book-card__quick-view-label {
     opacity: 0;
     transform: translateY(-100%);
   }

   .book-card__quick-view:hover .book-card__quick-view-icon,
   .book-card__quick-view:focus-visible .book-card__quick-view-icon {
     opacity: 1;
     transform: translate(-50%, -50%);
   }

     .book-card__add-to-cart {
       position: relative;
       overflow: hidden;
   }

     .book-card__add-to-cart-label,
     .book-card__add-to-cart-icon {
       transition:
         opacity 1.5s ease,
         transform 1.5s ease;
   }

     .book-card__add-to-cart-label {
       transform: translateY(0);
     }

     .book-card__add-to-cart-icon {
       position: absolute;
       top: 50%;
       left: 50%;
       opacity: 0;
       transform: translate(-50%, 100%);
     }

     .book-card__add-to-cart:hover .book-card__add-to-cart-label,
     .book-card__add-to-cart:focus-visible .book-card__add-to-cart-label {
       opacity: 0;
       transform: translateY(-100%);
     }

     .book-card__add-to-cart:hover .book-card__add-to-cart-icon,
     .book-card__add-to-cart:focus-visible .book-card__add-to-cart-icon {
       opacity: 1;
       transform: translate(-50%, -50%);
     }

     @media (hover: none) {
       .book-card__actions,
       .book-card__cta { opacity: 1; }

       .book-card__add-to-cart-label {
         opacity: 0;
         transform: translateY(-100%);
       }

       .book-card__add-to-cart-icon {
         opacity: 1;
         transform: translate(-50%, -50%);
       }
     }

     @media (prefers-reduced-motion: reduce) {
     .book-card__quick-view-label,
     .book-card__quick-view-icon {
         transition: none;
       }

       .book-card__add-to-cart-label,
       .book-card__add-to-cart-icon {
         transition: none;
       }
     }

`;

// Inject once (and refresh on hot reload) so no separate CSS file is needed.
if (typeof document !== "undefined") {
  let styleEl = document.getElementById("book-card-styles") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "book-card-styles";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = BOOK_CARD_CSS;
}

export function BookCard({
  book, compact = false, className, priceOverride, badge, stockNote, disableAdd = false, showDetails = false,
}: {
  book: Book;
  compact?: boolean;
  className?: string;
  /** Replace the displayed price (e.g. a Quick Deal price). */
  priceOverride?: { price: number; oldPrice: number };
  /** Extra ribbon label (e.g. "Buy 1 Get 1"). */
  badge?: string;
  /** Small stock line under the price (e.g. "Only 3 left"). */
  stockNote?: string;
  /** Force the add-to-cart button disabled. */
  disableAdd?: boolean;
  /** Show a "View details" link under the add button. */
  showDetails?: boolean;
}) {
  const { addToCart, toggleWishlist, inWishlist, toggleCompare, inCompare } = useStore();
  const { authorById } = useCatalog();
  const quickView = useQuickView();

  const authorName = book.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ");
  const defaultVariant = book.variants?.[0];
  const price = priceOverride?.price ?? book.flashSale?.price ?? defaultVariant?.flashPrice ?? book.price;
  const oldPrice = priceOverride?.oldPrice ?? defaultVariant?.oldPrice ?? book.oldPrice;
  const pct = discountPercent(price, oldPrice);
  const savingsAmt = oldPrice && pct > 0 ? oldPrice - price : 0;
  const wished = inWishlist(book.id);
  const compared = inCompare(book.id);
  const outOfStock = book.stock <= 0;
  const addDisabled = outOfStock || disableAdd;

  // 1. Add near the top of your card component
  const [qty, setQty] = useState(1);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("book-card group flex h-full flex-col", className)}>
        <div className="book-card__cover relative mb-3 aspect-[2/3] overflow-hidden rounded-[3px] bg-muted">
          <Link
            to={`/book/${book.slug}`}
            className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={book.title}
          >
            <div className="book-card__img">
              <BookCover title={book.title} author={authorName} coverUrl={book.coverUrl} />
            </div>
          </Link>

          <div className="pointer-events-none absolute left-0 top-2 flex flex-col items-start gap-1">
            {pct > 0 && <span className="rounded-r bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground">-{pct}%</span>}
            {badge && <span className="rounded-r bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">{badge}</span>}
            {(book.flashSale || defaultVariant?.flashPrice) && !priceOverride && <span className="rounded-r bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">Flash</span>}
            {book.isBestseller && <span className="rounded-r bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">Bestseller</span>}
            {book.isNewArrival && !book.isBestseller && <span className="rounded-r bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">New</span>}
          </div>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="rounded bg-foreground/85 px-3 py-1 text-xs font-medium text-background">Out of stock</span>
            </div>
          )}

          {/* Action buttons: hidden until the card is hovered or focused
              (fade handled by the injected CSS). Always shown on touch screens. */}
          // 2. Replace your actions block with this
          {/* Icon buttons (wishlist + compare), top-right */}
          <div className="book-card__actions absolute right-2 top-2 flex flex-col gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconBtn
                  className="bg-[#fff] text-[#8f0a0a] hover:bg-[#0c0101] hover:text-white"
                  label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  active={wished}
                  onClick={() => toggleWishlist(book)}
                >
                  <Heart size={15} fill={wished ? "currentColor" : "none"} />
                </IconBtn>
              </TooltipTrigger>
              <TooltipContent side="left">
                {wished ? "Remove from wishlist" : "Add to wishlist"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconBtn label="Compare" className="bg-[#fff]  text-[#8f0a0a] hover:bg-[#0c0101] hover:text-white" active={compared} onClick={() => toggleCompare(book)}>
                  <GitCompare size={15} />
                </IconBtn>
              </TooltipTrigger>
              <TooltipContent side="left">Compare</TooltipContent>
            </Tooltip>
          </div>

          {/* Pill CTA group: Quick view + qty stepper + Add to cart */}
          <div className="book-card__cta absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 px-1">
            {/* Quick view */}
            <button
              type="button"
              aria-label="Quick view"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                quickView.open(book);
              }}
              className="book-card__quick-view rounded-full bg-[#8f0a0a] px-2 md:px-6 py-2.5 text-sm font-semibold text-white shadow-lg
                        transition-colors hover:bg-[#0c0101] focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <span className="book-card__quick-view-label hidden md:block">Quick view</span>
              <span className="book-card__quick-view-label md:hidden"><Eye className="text-white" size={18} /></span>
              <Eye className="book-card__quick-view-icon" size={18} />
            </button>

            {/* Qty stepper + Add to cart */}
            {!outOfStock && (
              <div
                className="flex w-full max-w-[230px] items-center gap-1 rounded-full bg-[#8f0a0a] p-1 text-white shadow-lg"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-7 w-5 items-center justify-center rounded-full transition-colors
                            hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Minus size={14} />
                </button>

                <span className="min-w-4 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {qty}
                </span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-7 w-5 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                >
                  <Plus size={14} />
                </button>

                <button
                  type="button"
                  aria-label="Add to cart"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(book, qty);   // see note below
                    setQty(1);
                  }}
                  className="book-card__add-to-cart flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold
                            transition-colors hover:bg-[#000000]"
                >
                  <span className="book-card__add-to-cart-label">Add to cart</span>
                  <ShoppingCart className="book-card__add-to-cart-icon" size={17} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <Link to={`/book/${book.slug}`} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <h3
              className={cn(
                "font-sans font-medium leading-snug line-clamp-2 transition-colors duration-300 ease-out group-hover:text-primary",
                compact ? "text-sm" : "text-[15px]",
              )}
            >
              {book.title}
            </h3>
          </Link>
          {authorName && <p className="mt-0.5 truncate text-xs text-muted-foreground">{authorName}</p>}
          {book.ratingCount > 0 && (
            <div className="mt-1.5">
              <RatingStars value={book.ratingAvg} count={compact ? undefined : book.ratingCount} size={12} />
            </div>
          )}
          <div className="mt-1.5">
            <PriceTag price={price} oldPrice={oldPrice} size={compact ? "sm" : "md"} hideDiscount />
          </div>
          {savingsAmt > 0 && (
            <p className={cn("mt-0.5 font-medium text-accent", compact ? "text-[10px]" : "text-xs")}>
              Save {formatTk(savingsAmt)} ({pct}% off)
            </p>
          )}
          {stockNote && <p className={cn("mt-1 text-xs", outOfStock ? "text-destructive" : "text-accent")}>{stockNote}</p>}

          {!compact && (
            <div className="mt-auto pt-3">
              <Button size="sm" className="w-full gap-2 transition-colors duration-200 ease-out active:scale-[0.98]" disabled={addDisabled} onClick={() => addToCart(book)}>
                <ShoppingCart size={15} />
                {addDisabled ? "Out of stock" : "Add to cart"}
              </Button>
              {showDetails && (
                <Button asChild size="sm" variant="ghost" className="mt-1 w-full transition-colors duration-200 ease-out">
                  <Link to={`/book/${book.slug}`}>View details</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// One round action button. It spreads the remaining props onto the <button> so
// the Tooltip (which injects its own handlers and ref through `asChild`) can
// actually attach to it. Hover/fade animation lives in the injected CSS.
function IconBtn({
  children, label, active, onClick, className, ...rest
}: Omit<React.ComponentProps<"button">, "onClick"> & {
  label: string;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "book-card__icon-btn flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active && "text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}