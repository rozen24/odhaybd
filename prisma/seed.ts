import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  seedAuthors,
  seedBanners,
  seedBooks,
  seedCategories,
  seedCoupons,
  seedPublishers,
  seedSettings,
} from "../src/services/seed";

// 1. Set up the driver adapter using your environment variable
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// 2. Pass the adapter instance into PrismaClient
const prisma = new PrismaClient({ adapter });
const scrypt = promisify(scryptCallback);

const MIN_PASSWORD_LENGTH = 8;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function upsertUser(email: string, name: string, role: UserRole, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Seed password for ${email} must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return prisma.user.upsert({
    where: { email },
    // Existing users keep their current password hash.
    update: { name, role, status: "ACTIVE" },
    create: { email, name, role, passwordHash: await hashPassword(password) },
  });
}

function requireId(map: Map<string, string>, key: string, label: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`Seed data references unknown ${label} "${key}".`);
  return id;
}

function lookupAll(map: Map<string, string>, keys: string[], label: string, context: string): string[] {
  const ids: string[] = [];
  for (const key of keys) {
    const id = map.get(key);
    if (id) ids.push(id);
    else console.warn(`[seed] ${context}: unknown ${label} "${key}" skipped.`);
  }
  return ids;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=true to override.");
  }

  // ---------- Users ----------
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_CUSTOMER_EMAIL, SEED_CUSTOMER_PASSWORD } = process.env;

  if (SEED_ADMIN_EMAIL && SEED_ADMIN_PASSWORD) {
    await upsertUser(SEED_ADMIN_EMAIL, "Store Admin", UserRole.ADMIN, SEED_ADMIN_PASSWORD);
  } else {
    console.warn("[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; admin user skipped.");
  }

  if (SEED_CUSTOMER_EMAIL && SEED_CUSTOMER_PASSWORD) {
    await upsertUser(SEED_CUSTOMER_EMAIL, "Demo Customer", UserRole.CUSTOMER, SEED_CUSTOMER_PASSWORD);
  } else {
    console.warn("[seed] SEED_CUSTOMER_EMAIL / SEED_CUSTOMER_PASSWORD not set; demo customer skipped.");
  }

  // ---------- Categories ----------
  const categoryIds = new Map<string, string>();
  for (const category of seedCategories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, parentId: null },
      create: { name: category.name, slug: category.slug, icon: category.icon },
    });
    categoryIds.set(category.id, record.id);
  }
  for (const category of seedCategories.filter((item) => item.parentId)) {
    await prisma.category.update({
      where: { id: requireId(categoryIds, category.id, "category") },
      data: { parentId: requireId(categoryIds, category.parentId!, "parent category") },
    });
  }

  // ---------- Authors ----------
  const authorIds = new Map<string, string>();
  for (const author of seedAuthors) {
    const record = await prisma.author.upsert({
      where: { slug: author.slug },
      update: { name: author.name, bio: author.bio, photoUrl: author.photoUrl },
      create: { name: author.name, slug: author.slug, bio: author.bio, photoUrl: author.photoUrl },
    });
    authorIds.set(author.id, record.id);
  }

  // ---------- Publishers ----------
  const publisherIds = new Map<string, string>();
  for (const publisher of seedPublishers) {
    const record = await prisma.publisher.upsert({
      where: { slug: publisher.slug },
      update: { name: publisher.name },
      create: { name: publisher.name, slug: publisher.slug },
    });
    publisherIds.set(publisher.id, record.id);
  }

  // ---------- Products ----------
  for (const book of seedBooks) {
    const publisherId = publisherIds.get(book.publisherId);
    if (!publisherId) {
      console.warn(`[seed] ${book.slug}: unknown publisher "${book.publisherId}"; product has no publisher.`);
    }

    // Fields that are safe to overwrite on every seed run.
    const productData = {
      title: book.title,
      description: book.description,
      isbn: book.isbn || undefined,
      edition: book.edition,
      pages: book.pages,
      language: book.language,
      binding: book.binding,
      weightGrams: book.weightGrams,
      regularPrice: book.oldPrice || book.price,
      salePrice: book.oldPrice && book.price < book.oldPrice ? book.price : null,
      status: book.status === "unpublished" ? ("UNPUBLISHED" as const) : ("PUBLISHED" as const),
      bestseller: book.isBestseller,
      newRelease: book.isNewArrival,
      editorChoice: book.isEditorsChoice,
      awardWinner: book.isAwardWinner,
      publisherId,
    };

    const product = await prisma.product.upsert({
      where: { slug: book.slug },
      update: productData,
      create: {
        ...productData,
        sku: `seed-${book.id}`,
        slug: book.slug,
        // Rating aggregates only set on create so re-seeding never clobbers real reviews.
        ratingAverage: book.ratingAvg,
        ratingCount: book.ratingCount,
      },
    });

    const productAuthorIds = lookupAll(authorIds, book.authorIds, "author", book.slug);
    const productCategoryIds = lookupAll(categoryIds, book.categoryIds, "category", book.slug);

    // Relations are replaced atomically so a failure never leaves a product without links.
    await prisma.$transaction([
      prisma.productAuthor.deleteMany({ where: { productId: product.id } }),
      prisma.productCategory.deleteMany({ where: { productId: product.id } }),
      prisma.productAuthor.createMany({
        data: productAuthorIds.map((authorId) => ({ productId: product.id, authorId })),
        skipDuplicates: true,
      }),
      prisma.productCategory.createMany({
        data: productCategoryIds.map((categoryId) => ({ productId: product.id, categoryId })),
        skipDuplicates: true,
      }),
    ]);

    // Stock and reservations are only initialised on create; re-seeding must not reset live inventory.
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: { productId: product.id, quantity: book.stock, reserved: 0 },
    });
  }

  // ---------- Coupons ----------
  for (const coupon of seedCoupons) {
    const data = {
      type: coupon.type === "percent" ? ("PERCENT" as const) : ("FLAT" as const),
      value: coupon.value,
      minSpend: coupon.minSpend,
      active: coupon.active,
      expiresAt: new Date(coupon.expiresAt),
    };
    if (Number.isNaN(data.expiresAt.getTime())) {
      throw new Error(`Coupon ${coupon.code} has an invalid expiresAt: ${coupon.expiresAt}`);
    }
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: data,
      create: { code: coupon.code, ...data },
    });
  }

  // ---------- Banners ----------
  for (const [index, banner] of seedBanners.entries()) {
    const data = {
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaHref: banner.ctaHref,
      imageUrl: banner.imageUrl,
      background: banner.bg,
      active: banner.active !== false,
      placement: banner.placement,
      sortOrder: index,
    };
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: data,
      create: { id: banner.id, ...data },
    });
  }

  // ---------- Settings ----------
  for (const [key, value] of Object.entries(seedSettings)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log(
    `Seeded ${seedBooks.length} products, ${seedAuthors.length} authors, ${seedCategories.length} categories, and ${seedPublishers.length} publishers.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });