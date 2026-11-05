import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { toSection } from "@/lib/home-sections";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

export const PUT = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Section not found", 404);
  const b = await readJson(request);

  const data: Prisma.HomepageSectionUncheckedUpdateInput = {};
  const title = str(b.title, 120);
  if (title) data.title = title;
  if (typeof b.is_active === "boolean") data.active = b.is_active;
  if (Number.isInteger(b.display_order)) data.displayOrder = b.display_order as number;
  if (b.category_id !== undefined) {
    const categoryId = str(b.category_id, 40);
    if (!isUuid(categoryId)) return fail("Please choose a category", 400);
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) return fail("Category not found", 400);
    data.categoryId = categoryId;
  }

  const exists = await prisma.homepageSection.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Section not found", 404);
  const row = await prisma.homepageSection.update({ where: { id }, data });
  return ok(toSection(row));
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Section not found", 404);
  const exists = await prisma.homepageSection.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Section not found", 404);
  await prisma.homepageSection.delete({ where: { id } }); // its items cascade
  return ok({ ok: true });
});
