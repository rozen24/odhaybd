// NOTE: Next.js needs one parameter name per path position, so for PUT and
// DELETE the "[slug]" segment carries the author's id.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { toAuthor, uniqueSlug } from "@/lib/catalog-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { slug } = await params;
  const item = await prismaRepositories.catalog.authorBySlug(slug);
  return item ? ok(item) : fail("Author not found", 404);
});

export const PUT = handle(async (request: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { slug: id } = await params;
  if (!isUuid(id)) return fail("Author not found", 404);
  const exists = await prisma.author.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Author not found", 404);
  const b = await readJson(request);

  const data: Prisma.AuthorUpdateInput = {};
  const name = str(b.name, 120);
  if (name) data.name = name;
  if (b.slug !== undefined && str(b.slug, 60)) data.slug = await uniqueSlug("author", str(b.slug, 60), id);
  if (b.bio !== undefined) data.bio = str(b.bio, 5000) || null;
  if (b.photoUrl !== undefined) data.photoUrl = str(b.photoUrl, 500) || null;

  const row = await prisma.author.update({ where: { id }, data, include: { _count: { select: { products: true } } } });
  return ok(toAuthor(row, row._count.products));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { slug: id } = await params;
  if (!isUuid(id)) return fail("Author not found", 404);
  const result = await prisma.author.deleteMany({ where: { id } }); // book links are removed with it
  return result.count ? ok({ ok: true }) : fail("Author not found", 404);
});
