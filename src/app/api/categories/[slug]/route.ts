// NOTE: Next.js needs one parameter name per path position, so for PUT and
// DELETE the "[slug]" segment carries the category's id.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { safeUrl, toCategory, uniqueSlug } from "@/lib/catalog-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { slug } = await params;
  const item = await prismaRepositories.catalog.categoryBySlug(slug);
  return item ? ok(item) : fail("Category not found", 404);
});

export const PUT = handle(async (request: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { slug: id } = await params;
  if (!isUuid(id)) return fail("Category not found", 404);
  const exists = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Category not found", 404);
  const b = await readJson(request);

  const data: Prisma.CategoryUncheckedUpdateInput = {};
  const name = str(b.name, 120);
  if (name) data.name = name;
  if (b.slug !== undefined && str(b.slug, 60)) data.slug = await uniqueSlug("category", str(b.slug, 60), id);
  if (b.icon !== undefined) data.icon = str(b.icon, 60) || null;
  if (b.imageUrl !== undefined) data.imageUrl = safeUrl(str(b.imageUrl, 500));

  if (b.parentId !== undefined) {
    const parentId = str(b.parentId, 40) || null;
    if (parentId) {
      if (!isUuid(parentId)) return fail("Parent category not found", 400);
      // A category can't sit under itself or under one of its own descendants.
      let cursor: string | null = parentId;
      for (let depth = 0; cursor && depth < 25; depth++) {
        if (cursor === id) return fail("A category can't be placed inside itself", 400);
        const up: { parentId: string | null } | null = await prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        if (!up) return fail("Parent category not found", 400);
        cursor = up.parentId;
      }
    }
    data.parentId = parentId;
  }

  const row = await prisma.category.update({ where: { id }, data });
  return ok(toCategory(row));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { slug: id } = await params;
  if (!isUuid(id)) return fail("Category not found", 404);
  const result = await prisma.category.deleteMany({ where: { id } }); // subcategories move to the top level
  return result.count ? ok({ ok: true }) : fail("Category not found", 404);
});
