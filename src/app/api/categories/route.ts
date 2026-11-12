import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { safeUrl, toCategory, uniqueSlug } from "@/lib/catalog-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

export const GET = handle(async () => ok(await prismaRepositories.catalog.categories()));

export const POST = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const b = await readJson(request);
  const name = str(b.name, 120);
  if (!name) return fail("Please enter the category name", 400);

  const parentId = str(b.parentId, 40) || null;
  if (parentId) {
    if (!isUuid(parentId)) return fail("Parent category not found", 400);
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) return fail("Parent category not found", 400);
  }
  const row = await prisma.category.create({
    data: {
      name,
      slug: await uniqueSlug("category", str(b.slug, 60) || name),
      icon: str(b.icon, 60) || null,
      imageUrl: safeUrl(str(b.imageUrl, 500)),
      parentId,
    },
  });
  return ok(toCategory(row), { status: 201 });
});
