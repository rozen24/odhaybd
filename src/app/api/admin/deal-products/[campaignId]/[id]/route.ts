import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { toDealProduct } from "@/lib/deals";
import { fail, handle, isUuid, ok, readJson } from "@/lib/api-route";

type Ctx = { params: Promise<{ campaignId: string; id: string }> };

export const PUT = handle(async (request: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { campaignId, id } = await params;
  if (!isUuid(campaignId) || !isUuid(id)) return fail("Deal not found", 404);
  const existing = await prisma.dealProduct.findFirst({ where: { id, campaignId } });
  if (!existing) return fail("Deal not found", 404);
  const b = await readJson(request);

  const data: Prisma.DealProductUpdateInput = {};
  if (b.deal_price !== undefined) {
    const price = Number(b.deal_price);
    if (!Number.isFinite(price) || price <= 0 || price > Number(existing.originalPrice)) {
      return fail("Enter a valid deal price (not above the book's price)", 400);
    }
    data.dealPrice = price;
  }
  if (b.stock_limit !== undefined) {
    const limit = b.stock_limit === null || b.stock_limit === "" ? null : Number(b.stock_limit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 0)) return fail("Enter a valid stock limit", 400);
    data.stockLimit = limit;
  }
  if (typeof b.is_active === "boolean") data.active = b.is_active;
  if (Number.isInteger(b.display_order)) data.displayOrder = b.display_order as number;

  const row = await prisma.dealProduct.update({ where: { id }, data });
  return ok(toDealProduct(row));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { campaignId, id } = await params;
  if (!isUuid(campaignId) || !isUuid(id)) return fail("Deal not found", 404);
  const result = await prisma.dealProduct.deleteMany({ where: { id, campaignId } });
  return result.count ? ok({ ok: true }) : fail("Deal not found", 404);
});
