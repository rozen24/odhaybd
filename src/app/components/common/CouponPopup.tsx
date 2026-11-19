"use client";

import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import type { Coupon } from "../../../types";
import { formatTk, formatDate } from "../../../lib/format";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export function CouponPopup() {
  const coupons = useQuery(["coupons", "public"], () => services.coupons.all());
  const [selected, setSelected] = useState<Coupon | null>(null);

  const visibleCoupons = useMemo(() => {
    const now = Date.now();
    return (coupons.data ?? []).filter((coupon) => {
      if (!coupon.active || !coupon.displayText) return false;
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return false;
      if (coupon.displayStartsAt && new Date(coupon.displayStartsAt).getTime() > now) return false;
      if (coupon.displayEndsAt && new Date(coupon.displayEndsAt).getTime() < now) return false;
      return true;
    });
  }, [coupons.data]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Coupon code copied");
    } catch {
      toast.error("Could not copy the coupon code");
    }
  };

  if (visibleCoupons.length === 0) return null;

  return (
    <>
      {/* Assuming you have a state to hide the tab when closed, e.g. isDismissed */}
      <div className="fixed left-0 top-[55%] z-40 -translate-y-1/2">
        <div className="flex flex-col gap-3">
          {visibleCoupons.map((coupon) => (
            <div key={coupon.code} className="relative flex items-center">
              {/* Main Vertical Tab Button */}
              <button
                type="button"
                onClick={() => setSelected(coupon)}
                className="flex items-center justify-center rounded-r-md bg-[#8B0D1D] px-2.5 py-5 text-sm font-semibold tracking-wide text-white shadow-md transition hover:bg-[#700a17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="[writing-mode:vertical-rl]">
                  {coupon.displayText}
                </span>
              </button>

              {/* Floating Close Button on Top-Right */}
              <button
                type="button"
                aria-label="Dismiss coupon"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add your dismiss handler here, e.g., handleDismiss(coupon.code)
                }}
                className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-black"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Coupon offer</DialogTitle>
                <DialogDescription>{selected.displayText}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coupon code</p>
                  <button
                    type="button"
                    onClick={() => copyCode(selected.code)}
                    className="mt-2 inline-flex items-center gap-2 rounded-md font-mono text-xl font-bold text-primary"
                  >
                    {selected.code} <Copy size={16} />
                  </button>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-secondary/60 p-3">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="mt-1 font-semibold">{selected.type === "percent" ? `${selected.value}% off` : `${formatTk(selected.value)} off`}</dd>
                  </div>
                  <div className="rounded-md bg-secondary/60 p-3">
                    <dt className="text-muted-foreground">Minimum spend</dt>
                    <dd className="mt-1 font-semibold">{formatTk(selected.minSpend)}</dd>
                  </div>
                  {selected.expiresAt && (
                    <div className="col-span-2 rounded-md bg-secondary/60 p-3">
                      <dt className="text-muted-foreground">Valid until</dt>
                      <dd className="mt-1 font-semibold">{formatDate(selected.expiresAt)}</dd>
                    </div>
                  )}
                </dl>
                <Button type="button" className="w-full" onClick={() => copyCode(selected.code)}>Copy coupon code</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
