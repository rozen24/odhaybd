import { Link } from "@/lib/navigation";
import { BookCover } from "../../common/BookCover";
import { PriceTag } from "../../common/PriceTag";
import { discountPercent, formatTk } from "../../../../lib/format";
import type { Book } from "../../../../types";

export function CategoryCollectionProduct({ book }: { book: Book }) {
  const defaultVariant = book.variants?.[0];
  const price = book.flashSale?.price ?? defaultVariant?.flashPrice ?? book.price;
  const oldPrice = defaultVariant?.oldPrice ?? book.oldPrice;
  const pct = discountPercent(price, oldPrice);
  const savingsAmt = oldPrice && pct > 0 ? oldPrice - price : 0;

  return (
    <Link to={`/book/${book.slug}`} className="group block min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      <div className="aspect-[2/3] overflow-hidden rounded-[3px] bg-muted shadow-[inset_4px_0_6px_-4px_rgb(0_0_0/0.35)] ring-1 ring-border">
        <BookCover title={book.title} coverUrl={book.coverUrl} className="transition-transform duration-300 group-hover:scale-[1.03]" />
      </div>
      <p className="mt-1.5 line-clamp-2 font-sans text-xs font-medium leading-snug group-hover:text-primary">{book.title}</p>
      <div className="mt-1">
        <PriceTag price={price} oldPrice={oldPrice} size="sm" hideDiscount />
      </div>
      {savingsAmt > 0 && (
        <p className="mt-0.5 text-[10px] font-medium text-accent">
          Save {formatTk(savingsAmt)} ({pct}% off)
        </p>
      )}
    </Link>
  );
}
