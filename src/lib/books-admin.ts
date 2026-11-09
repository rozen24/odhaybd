// Validation and helpers shared by the book create / update / delete endpoints.
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isUuid, str } from "@/lib/api-route";
import { safeUrl } from "@/lib/catalog-admin";

export type BookInput = {
  title?: string;
  slug?: string;
  description?: string;
  translator?: string | null;
  edition?: string | null;
  language?: string | null;
  binding?: string | null;
  isbn?: string | null;
  pages?: number | null;
  weightGrams?: number | null;
  price?: number;     // selling price shown to customers
  oldPrice?: number;  // list price (shown struck through when higher than price)
  stock?: number;
  variants?: { name: string; price: number; oldPrice: number; flashPrice?: number; stock: number }[];
  flashSale?: { price: number; endsAt: string } | null;
  status?: "PUBLISHED" | "UNPUBLISHED";
  publisherId?: string | null;
  sellerId?: string | null;        // staff only
  bestseller?: boolean;            // staff only
  newRelease?: boolean;            // staff only
  editorChoice?: boolean;          // staff only
  awardWinner?: boolean;           // staff only
  images?: string[];               // first one is the cover
  authorIds?: string[];
  categoryIds?: string[];
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "book";

export async function uniqueProductSlug(source: string, excludeId?: string): Promise<string> {
  const base = slugify(source);
  const clash = await prisma.product.findFirst({
    where: { slug: base, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return clash ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

export const newSku = () => `BK-${randomBytes(5).toString("hex").toUpperCase()}`;

function intOrNull(v: unknown): number | null | "bad" {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : "bad";
}

function uuidList(v: unknown, max: number): string[] | "bad" {
  if (!Array.isArray(v) || v.length > max) return "bad";
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string" || !isUuid(x)) return "bad";
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

// partial = true for edits (only the fields that were sent are read).
// staff = true for admins and editors, who may also set flags and the seller.
export function parseBookInput(
  b: Record<string, unknown>,
  opts: { partial: boolean; staff: boolean },
): { error: string } | { input: BookInput } {
  const input: BookInput = {};

  if (b.title !== undefined || !opts.partial) {
    const title = str(b.title, 300);
    if (!title) return { error: "Please enter the book title" };
    input.title = title;
  }
  if (b.slug !== undefined && str(b.slug, 80)) input.slug = str(b.slug, 80);
  if (b.description !== undefined) input.description = str(b.description, 20000);
  else if (!opts.partial) input.description = "";

  for (const key of ["translator", "edition", "language", "binding"] as const) {
    if (b[key] !== undefined) input[key] = str(b[key], 100) || null;
  }
  if (b.isbn !== undefined) {
    const isbn = str(b.isbn, 20);
    if (isbn && !/^[0-9X-]{10,17}$/i.test(isbn)) return { error: "Enter a valid ISBN (10 or 13 digits)" };
    input.isbn = isbn || null;
  }
  for (const key of ["pages", "weightGrams"] as const) {
    if (b[key] !== undefined) {
      const n = intOrNull(b[key]);
      if (n === "bad") return { error: `Enter a valid number for ${key === "pages" ? "pages" : "weight"}` };
      input[key] = n;
    }
  }

  if (b.price !== undefined || !opts.partial) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return { error: "Enter a valid price" };
    input.price = price;
  }
  if (b.oldPrice !== undefined) {
    const old = Number(b.oldPrice);
    if (!Number.isFinite(old) || old < 0 || old > 10_000_000) return { error: "Enter a valid original price" };
    input.oldPrice = old;
  }
  if (b.stock !== undefined) {
    const n = intOrNull(b.stock);
    if (n === "bad" || n === null) return { error: "Enter a valid stock quantity" };
    input.stock = n;
  } else if (!opts.partial) {
    input.stock = 0;
  }

  if (b.variants !== undefined || !opts.partial) {
    if (!Array.isArray(b.variants) || b.variants.length !== 2) return { error: "Add both paperback and hardcover prices" };
    const variants: NonNullable<BookInput["variants"]> = [];
    for (const raw of b.variants as Record<string, unknown>[]) {
      const name = str(raw?.name, 80);
      const price = Number(raw?.price);
      const oldPrice = Number(raw?.oldPrice ?? 0);
      const flashPrice = raw?.flashPrice === undefined || raw?.flashPrice === "" ? 0 : Number(raw.flashPrice);
      const stock = intOrNull(raw?.stock);
      if (!name || !Number.isFinite(price) || price <= 0 || price > 10_000_000 ||
          !Number.isFinite(oldPrice) || oldPrice < 0 || oldPrice > 10_000_000 ||
          !Number.isFinite(flashPrice) || flashPrice < 0 || flashPrice >= price ||
          stock === "bad" || stock === null) {
        return { error: "Enter valid prices, flash sale prices, and stock" };
      }
      variants.push({ name, price, oldPrice, flashPrice: flashPrice || undefined, stock });
    }
    input.variants = variants;
  }

  if (b.status !== undefined) input.status = str(b.status, 20).toLowerCase() === "unpublished" ? "UNPUBLISHED" : "PUBLISHED";

  if (b.flashSale !== undefined) {
    if (b.flashSale === null) {
      input.flashSale = null;
    } else if (typeof b.flashSale === "object" && b.flashSale !== null) {
      const flash = b.flashSale as Record<string, unknown>;
      const price = Number(flash.price);
      const endsAt = str(flash.endsAt, 60);
      if (!Number.isFinite(price) || price <= 0 || !endsAt || Number.isNaN(new Date(endsAt).getTime())) return { error: "Enter a valid flash sale" };
      input.flashSale = { price, endsAt };
    } else {
      return { error: "Enter a valid flash sale" };
    }
  }

  if (b.publisherId !== undefined) {
    const id = str(b.publisherId, 40);
    if (id && !isUuid(id)) return { error: "Publisher not found" };
    input.publisherId = id || null;
  }

  if (opts.staff) {
    if (b.sellerId !== undefined) {
      const id = str(b.sellerId, 40);
      if (id && !isUuid(id)) return { error: "Seller not found" };
      input.sellerId = id || null;
    }
    if (typeof b.isBestseller === "boolean") input.bestseller = b.isBestseller;
    if (typeof b.isNewArrival === "boolean") input.newRelease = b.isNewArrival;
    if (typeof b.isEditorsChoice === "boolean") input.editorChoice = b.isEditorsChoice;
    if (typeof b.isAwardWinner === "boolean") input.awardWinner = b.isAwardWinner;
  }

  if (b.images !== undefined || b.coverUrl !== undefined) {
    const list = [b.coverUrl, ...(Array.isArray(b.images) ? b.images : [])]
      .map((u) => (typeof u === "string" ? safeUrl(u.trim().slice(0, 500)) : null))
      .filter((u): u is string => !!u);
    input.images = [...new Set(list)].slice(0, 10);
  }
  if (b.authorIds !== undefined) {
    const ids = uuidList(b.authorIds, 30);
    if (ids === "bad") return { error: "Invalid author selection" };
    input.authorIds = ids;
  }
  if (b.categoryIds !== undefined) {
    const ids = uuidList(b.categoryIds, 20);
    if (ids === "bad") return { error: "Invalid category selection" };
    input.categoryIds = ids;
  }
  return { input };
}

// Confirms every referenced author, category, publisher and seller exists.
export async function checkRefs(input: BookInput): Promise<string | null> {
  if (input.authorIds?.length) {
    const n = await prisma.author.count({ where: { id: { in: input.authorIds } } });
    if (n !== input.authorIds.length) return "One of the selected authors no longer exists";
  }
  if (input.categoryIds?.length) {
    const n = await prisma.category.count({ where: { id: { in: input.categoryIds } } });
    if (n !== input.categoryIds.length) return "One of the selected categories no longer exists";
  }
  if (input.publisherId) {
    const found = await prisma.publisher.findUnique({ where: { id: input.publisherId }, select: { id: true } });
    if (!found) return "The selected publisher no longer exists";
  }
  if (input.sellerId) {
    const found = await prisma.seller.findUnique({ where: { id: input.sellerId }, select: { id: true } });
    if (!found) return "The selected seller no longer exists";
  }
  return null;
}

// The list price is the higher of the two; a lower selling price becomes the sale price.
export function pricing(price: number, oldPrice: number) {
  const regularPrice = Math.max(oldPrice, price);
  return { regularPrice, salePrice: price < regularPrice ? price : null };
}
