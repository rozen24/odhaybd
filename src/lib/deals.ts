// Helpers for the admin deal-campaign endpoints.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DealCampaign, DealProduct } from "@/types";

export const DEAL_TYPES = ["TODAYS_DEAL", "BUY_ONE_GET_ONE", "FREE_SHIPPING", "BEST_PRICE", "CLEARANCE_SALE"] as const;
export type DealTypeValue = (typeof DEAL_TYPES)[number];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "campaign";

// Returns a slug that no other campaign uses (adds a short suffix on a clash).
export async function uniqueCampaignSlug(source: string, excludeId?: string): Promise<string> {
  const base = slugify(source);
  const clash = await prisma.dealCampaign.findFirst({
    where: { slug: base, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return clash ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

export function toDealCampaign(c: {
  id: string; name: string; slug: string; type: DealCampaign["type"]; description: string | null;
  banner: string | null; active: boolean; startAt: Date; endAt: Date | null; displayOrder: number;
  createdAt: Date; updatedAt: Date;
}): DealCampaign {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    description: c.description ?? undefined,
    banner: c.banner ?? undefined,
    is_active: c.active,
    start_at: c.startAt.toISOString(),
    end_at: c.endAt?.toISOString() ?? null,
    display_order: c.displayOrder,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export function toDealProduct(d: {
  id: string; campaignId: string; productId: string; originalPrice: Prisma.Decimal; dealPrice: Prisma.Decimal;
  stockLimit: number | null; soldCount: number; displayOrder: number; active: boolean;
}): DealProduct {
  const original = Number(d.originalPrice);
  const price = Number(d.dealPrice);
  return {
    id: d.id,
    campaign_id: d.campaignId,
    product_id: d.productId,
    original_price: original,
    deal_price: price,
    discount_percentage: original > 0 ? Math.round(((original - price) / original) * 100) : 0,
    stock_limit: d.stockLimit,
    sold_count: d.soldCount,
    display_order: d.displayOrder,
    is_active: d.active,
  };
}
