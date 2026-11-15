import { formatTk, discountPercent } from "../../../lib/format";
import { cn } from "../ui/utils";

export function PriceTag({
  price,
  oldPrice,
  className,
  size = "md",
  hideDiscount = false,
}: {
  price: number;
  oldPrice?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  hideDiscount?: boolean;
}) {
  const pct = oldPrice ? discountPercent(price, oldPrice) : 0;
  const priceCls = size === "lg" ? "font-display text-lg" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums", className)}>
      <span className={cn("font-semibold text-foreground", priceCls)}>{formatTk(price)}</span>
      {pct > 0 && (
        <>
          <span className={cn("text-muted-foreground line-through", size === "sm" ? "text-xs" : "text-sm")}>{formatTk(oldPrice!)}</span>
          {!hideDiscount && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[18px] font-semibold text-primary">-{pct}%</span>
          )}
        </>
      )}
    </div>
  );
}
