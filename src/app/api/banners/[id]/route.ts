import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { safeUrl, toBanner } from "@/lib/catalog-admin";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";

const PLACEMENTS = ["hero", "secondary", "campaign"];
type Ctx = { params: Promise<{ id: string }> };

// Banner ids are cuid strings (not UUIDs), so they are only checked for shape.
const validId = (id: string) => /^[a-z0-9]{10,40}$/i.test(id);

export const PUT = handle(async (request: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!validId(id)) return fail("Banner not found", 404);
  const exists = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Banner not found", 404);
  const b = await readJson(request);

  const data: Prisma.BannerUpdateInput = {};
  const title = str(b.title, 150);
  if (title) data.title = title;
  if (b.subtitle !== undefined) data.subtitle = str(b.subtitle, 300) || null;
  if (b.ctaLabel !== undefined) data.ctaLabel = str(b.ctaLabel, 60) || null;
  if (b.ctaHref !== undefined) data.ctaHref = safeUrl(str(b.ctaHref, 500));
  if (b.imageUrl !== undefined) data.imageUrl = safeUrl(str(b.imageUrl, 500));
  if (b.bg !== undefined) data.background = str(b.bg, 200) || null;
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.placement !== undefined) {
    const placement = str(b.placement, 20);
    if (placement && !PLACEMENTS.includes(placement)) return fail("Invalid banner placement", 400);
    data.placement = placement || null;
  }

  const row = await prisma.banner.update({ where: { id }, data });
  return ok(toBanner(row));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!validId(id)) return fail("Banner not found", 404);
  const result = await prisma.banner.deleteMany({ where: { id } });
  return result.count ? ok({ ok: true }) : fail("Banner not found", 404);
});
