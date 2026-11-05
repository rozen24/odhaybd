import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { DEAL_TYPES, type DealTypeValue, toDealCampaign, uniqueCampaignSlug } from "@/lib/deals";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

export const PUT = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Campaign not found", 404);
  const existing = await prisma.dealCampaign.findUnique({ where: { id } });
  if (!existing) return fail("Campaign not found", 404);
  const b = await readJson(request);

  const data: Prisma.DealCampaignUpdateInput = {};
  const name = str(b.name, 120);
  if (name) data.name = name;
  if (b.type !== undefined) {
    const type = str(b.type, 30).toUpperCase() as DealTypeValue;
    if (!DEAL_TYPES.includes(type)) return fail("Invalid campaign type", 400);
    data.type = type;
  }
  if (b.slug !== undefined && str(b.slug, 60)) data.slug = await uniqueCampaignSlug(str(b.slug, 60), id);
  if (b.description !== undefined) data.description = str(b.description, 1000) || null;
  if (b.banner !== undefined) data.banner = str(b.banner, 500) || null;
  if (typeof b.is_active === "boolean") data.active = b.is_active;
  if (Number.isInteger(b.display_order)) data.displayOrder = b.display_order as number;

  const startAt = b.start_at !== undefined ? new Date(String(b.start_at)) : existing.startAt;
  const endAt = b.end_at !== undefined ? (b.end_at ? new Date(String(b.end_at)) : null) : existing.endAt;
  if (Number.isNaN(startAt.getTime())) return fail("Enter a valid start date", 400);
  if (endAt && (Number.isNaN(endAt.getTime()) || endAt <= startAt)) return fail("The end date must be after the start date", 400);
  if (b.start_at !== undefined) data.startAt = startAt;
  if (b.end_at !== undefined) data.endAt = endAt;

  const row = await prisma.dealCampaign.update({ where: { id }, data });
  return ok(toDealCampaign(row));
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Campaign not found", 404);
  const existing = await prisma.dealCampaign.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return fail("Campaign not found", 404);
  await prisma.dealCampaign.delete({ where: { id } }); // its deal products cascade
  return ok({ ok: true });
});
