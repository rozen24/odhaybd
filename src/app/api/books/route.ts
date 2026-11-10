import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { requireRole } from "@/lib/guards";
import { checkRefs, newSku, parseBookInput, pricing, uniqueProductSlug } from "@/lib/books-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, ok, readJson } from "@/lib/api-route";
import type { BookQuery } from "@/types";

export const GET = handle(async (request: Request) => {
  const sp = new URL(request.url).searchParams;
  const str = (k: string) => sp.get(k) || undefined;
  const num = (k: string) => {
    const v = sp.get(k);
    if (v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // Drafts are only visible to staff, and to a seller for their own books.
  let includeUnpublished = false;
  let forcedSellerId: string | undefined;
  if (sp.get("includeUnpublished") === "true") {
    const user = await getSessionUser();
    if (user && (user.role === "ADMIN" || user.role === "EDITOR")) {
      includeUnpublished = true;
    } else if (user?.role === "SELLER") {
      const seller = await prisma.seller.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (seller) {
        includeUnpublished = true;
        forcedSellerId = seller.id;
      }
    }
  }

  const query = {
    page: num("page"),
    pageSize: num("pageSize"),
    search: str("search"),
    categoryId: str("categoryId"),
    authorId: str("authorId"),
    publisherId: str("publisherId"),
    sellerId: forcedSellerId ?? str("sellerId"),
    language: str("language"),
    binding: str("binding"),
    flag: str("flag"),
    sort: str("sort"),
    inStock: sp.get("inStock") === "true" ? true : undefined,
    minRating: num("minRating"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    includeUnpublished: includeUnpublished || undefined,
  } as unknown as BookQuery;
  return ok(await prismaRepositories.books.list(query));
});

// Create a book. Admins and editors can set everything; a seller can only
// create books under their own seller profile and can't set promotion flags.
export const POST = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR", "SELLER");
  if (auth.error) return auth.error;
  const user = auth.user;
  const staff = user.role !== "SELLER";

  const parsed = parseBookInput(await readJson(request), { partial: false, staff });
  if ("error" in parsed) return fail(parsed.error, 400);
  const input = parsed.input;

  if (!staff) {
    const seller = await prisma.seller.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!seller) return fail("Your account has no seller profile yet", 403);
    input.sellerId = seller.id;
  }
  const refError = await checkRefs(input);
  if (refError) return fail(refError, 400);

  if (input.isbn) {
    const dup = await prisma.product.findUnique({ where: { isbn: input.isbn }, select: { id: true } });
    if (dup) return fail("A book with this ISBN already exists", 409);
  }

  const paperback = input.variants?.[0];
  if (!paperback) return fail("Paperback pricing is required", 400);
  const { regularPrice, salePrice } = pricing(paperback.price, paperback.oldPrice);
  const images = input.images ?? [];
  const lastOrder = await prisma.product.aggregate({
    where: { sellerId: input.sellerId ?? null },
    _max: { displayOrder: true },
  });
  const created = await prisma.product.create({
    data: {
      slug: await uniqueProductSlug(input.slug ?? (input.title as string)),
      sku: newSku(),
      isbn: input.isbn ?? null,
      title: input.title as string,
      description: input.description ?? "",
      translator: input.translator ?? null,
      edition: input.edition ?? null,
      pages: input.pages ?? null,
      language: input.language ?? null,
      binding: input.binding ?? null,
      weightGrams: input.weightGrams ?? null,
      regularPrice,
      salePrice,
      flashSaleEndsAt: input.flashSale ? new Date(input.flashSale.endsAt) : null,
      status: input.status ?? "PUBLISHED",
      bestseller: input.bestseller ?? false,
      newRelease: input.newRelease ?? false,
      editorChoice: input.editorChoice ?? false,
      awardWinner: input.awardWinner ?? false,
      displayOrder: (lastOrder._max.displayOrder ?? -1) + 1,
      sellerId: input.sellerId ?? null,
      publisherId: input.publisherId ?? null,
      images: { create: images.map((url, sortOrder) => ({ url, sortOrder })) },
      inventory: { create: { quantity: paperback.stock } },
      variants: {
        create: (input.variants ?? []).map((variant) => {
          const priced = pricing(variant.price, variant.oldPrice);
          return {
            sku: `${newSku()}-${variant.name.toLowerCase().includes("hard") ? "HC" : "PB"}`,
            name: variant.name,
            basePrice: variant.price,
            regularPrice: priced.regularPrice,
            salePrice: variant.flashPrice ?? null,
            inventory: { create: { quantity: variant.stock } },
          };
        }),
      },
      authors: { create: (input.authorIds ?? []).map((authorId) => ({ authorId })) },
      categories: { create: (input.categoryIds ?? []).map((categoryId) => ({ categoryId })) },
    },
    select: { id: true },
  });

  const book = await prismaRepositories.books.getById(created.id);
  return ok(book, { status: 201 });
});
