import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { checkRefs, parseBookInput, pricing, uniqueProductSlug } from "@/lib/books-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, isUuid, ok, readJson } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

// Admins and editors can change any book. A seller can only change their own.
async function loadForEdit(id: string, userId: string, role: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sellerId: true, regularPrice: true, salePrice: true },
  });
  if (!product) return { error: fail("Book not found", 404) } as const;
  if (role === "SELLER") {
    const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller || product.sellerId !== seller.id) return { error: fail("Book not found", 404) } as const;
  }
  return { product } as const;
}

export const PUT = handle(async (request: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR", "SELLER");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Book not found", 404);
  const loaded = await loadForEdit(id, auth.user.id, auth.user.role);
  if (loaded.error) return loaded.error;
  const existing = loaded.product;

  const parsed = parseBookInput(await readJson(request), { partial: true, staff: auth.user.role !== "SELLER" });
  if ("error" in parsed) return fail(parsed.error, 400);
  const input = parsed.input;
  const refError = await checkRefs(input);
  if (refError) return fail(refError, 400);

  if (input.isbn) {
    const dup = await prisma.product.findFirst({ where: { isbn: input.isbn, id: { not: id } }, select: { id: true } });
    if (dup) return fail("A book with this ISBN already exists", 409);
  }

  const data: Prisma.ProductUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.slug !== undefined) data.slug = await uniqueProductSlug(input.slug, id);
  for (const key of ["translator", "edition", "language", "binding", "isbn", "pages", "weightGrams"] as const) {
    if (input[key] !== undefined) (data as Record<string, unknown>)[key] = input[key];
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.publisherId !== undefined) data.publisherId = input.publisherId;
  if (input.sellerId !== undefined) data.sellerId = input.sellerId;
  if (input.bestseller !== undefined) data.bestseller = input.bestseller;
  if (input.newRelease !== undefined) data.newRelease = input.newRelease;
  if (input.editorChoice !== undefined) data.editorChoice = input.editorChoice;
  if (input.awardWinner !== undefined) data.awardWinner = input.awardWinner;

  if (input.price !== undefined || input.oldPrice !== undefined) {
    const currentSelling = Number(existing.salePrice ?? existing.regularPrice);
    const currentList = Number(existing.regularPrice);
    const { regularPrice, salePrice } = pricing(input.price ?? currentSelling, input.oldPrice ?? currentList);
    data.regularPrice = regularPrice;
    data.salePrice = salePrice;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });
    if (input.authorIds) {
      await tx.productAuthor.deleteMany({ where: { productId: id } });
      await tx.productAuthor.createMany({ data: input.authorIds.map((authorId) => ({ productId: id, authorId })) });
    }
    if (input.categoryIds) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({ data: input.categoryIds.map((categoryId) => ({ productId: id, categoryId })) });
    }
    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.createMany({ data: input.images.map((url, sortOrder) => ({ productId: id, url, sortOrder })) });
    }
    if (input.stock !== undefined) {
      await tx.inventory.upsert({
        where: { productId: id },
        update: { quantity: input.stock },
        create: { productId: id, quantity: input.stock },
      });
    }
  });

  return ok(await prismaRepositories.books.getById(id));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requireRole("ADMIN", "EDITOR", "SELLER");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Book not found", 404);
  const loaded = await loadForEdit(id, auth.user.id, auth.user.role);
  if (loaded.error) return loaded.error;

  // A book that has been ordered must stay in the database so past orders keep
  // working. It is unpublished instead of deleted.
  const ordered = await prisma.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    await prisma.product.update({ where: { id }, data: { status: "UNPUBLISHED" } });
    return ok({ ok: true, unpublished: true });
  }

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { productId: id } }),
    prisma.wishlistItem.deleteMany({ where: { productId: id } }),
    prisma.compareItem.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }), // images, stock, links, reviews and deals are removed with it
  ]);
  return ok({ ok: true });
});
