import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "@/lib/auth"; // use whatever your auth lib exports for hashing

import {
  seedAuthors,
  seedBanners,
  seedBooks,
  seedCategories,
  seedCoupons,
  seedPublishers,
  seedSettings,
} from "../src/services/seed";

// -----------------------------------------------------------------------------
// Database connection
// -----------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("[seed] DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });



const MIN_PASSWORD_LENGTH = 8;

async function upsertUser(
  email: string,
  name: string,
  role: UserRole,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("[seed] User email cannot be empty.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `[seed] Seed password for ${normalizedEmail} must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  // Same hashing as login, so the format can never drift apart again.
  // Re-running the seed resets this account's password to the env value.
  const passwordHash = await hashPassword(password);

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name, role, status: "ACTIVE", passwordHash },
    create: { email: normalizedEmail, name, role, status: "ACTIVE", passwordHash },
  });
}

function requireId(
  map: Map<string, string>,
  key: string,
  label: string,
): string {
  const id = map.get(key);

  if (!id) {
    throw new Error(`Seed data references unknown ${label} "${key}".`);
  }

  return id;
}

function lookupAll(
  map: Map<string, string>,
  keys: string[],
  label: string,
  context: string,
): string[] {
  const ids: string[] = [];

  for (const key of keys) {
    const id = map.get(key);

    if (id) {
      ids.push(id);
    } else {
      console.warn(
        `[seed] ${context}: unknown ${label} "${key}" skipped.`,
      );
    }
  }

  return ids;
}

// -----------------------------------------------------------------------------
// Main seed process
// -----------------------------------------------------------------------------

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  ) {
    throw new Error(
      "[seed] Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=true to override.",
    );
  }

  console.log("\n[seed] Starting Odhay BD database seed...\n");

  // ---------- Users ----------
  console.log("[seed] Creating/verifying user accounts...");

  const {
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    SEED_CUSTOMER_EMAIL,
    SEED_CUSTOMER_PASSWORD,
  } = process.env;


    // Admin creation is mandatory. Do not silently skip it.
  if (!SEED_ADMIN_EMAIL?.trim() || !SEED_ADMIN_PASSWORD) {
    throw new Error(
      "[seed] Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD. Configure both environment variables before running the seed.",
    );
  }

  // ❌ REMOVE the manual hashing line here

  // 2. Pass the RAW environment variable password string directly
  const admin = await upsertUser(
    SEED_ADMIN_EMAIL,
    "Store Admin",
    UserRole.ADMIN,
    SEED_ADMIN_PASSWORD, // 👈 PASS THE RAW PASSWORD STRING HERE
  );

  console.log(
    `[seed] ✓ Admin account created/verified: ${admin.email}`,
  );

  // Demo customer is optional.
  if (SEED_CUSTOMER_EMAIL?.trim() && SEED_CUSTOMER_PASSWORD) {
    const customer = await upsertUser(
      SEED_CUSTOMER_EMAIL,
      "Demo Customer",
      UserRole.CUSTOMER,
      SEED_CUSTOMER_PASSWORD,
    );

    console.log(
      `[seed] ✓ Demo customer created/verified: ${customer.email}`,
    );
  } else {
    console.log(
      "[seed] Demo customer skipped (SEED_CUSTOMER_EMAIL / SEED_CUSTOMER_PASSWORD not configured).",
    );
  }

  // ---------- Categories ----------
  const categoryIds = new Map<string, string>();

  for (const category of seedCategories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        parentId: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
      },
    });

    categoryIds.set(category.id, record.id);
  }

  for (const category of seedCategories.filter((item) => item.parentId)) {
    await prisma.category.update({
      where: {
        id: requireId(categoryIds, category.id, "category"),
      },
      data: {
        parentId: requireId(
          categoryIds,
          category.parentId!,
          "parent category",
        ),
      },
    });
  }

  console.log(`[seed] ✓ ${seedCategories.length} categories seeded.`);

  // ---------- Authors ----------
  const authorIds = new Map<string, string>();

  for (const author of seedAuthors) {
    const record = await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        name: author.name,
        bio: author.bio,
        photoUrl: author.photoUrl,
      },
      create: {
        name: author.name,
        slug: author.slug,
        bio: author.bio,
        photoUrl: author.photoUrl,
      },
    });

    authorIds.set(author.id, record.id);
  }

  console.log(`[seed] ✓ ${seedAuthors.length} authors seeded.`);

  // ---------- Publishers ----------
  const publisherIds = new Map<string, string>();

  for (const publisher of seedPublishers) {
    const record = await prisma.publisher.upsert({
      where: { slug: publisher.slug },
      update: { name: publisher.name },
      create: {
        name: publisher.name,
        slug: publisher.slug,
      },
    });

    publisherIds.set(publisher.id, record.id);
  }

  console.log(`[seed] ✓ ${seedPublishers.length} publishers seeded.`);

  // ---------- Products ----------
  for (const book of seedBooks) {
    const publisherId = publisherIds.get(book.publisherId);

    if (!publisherId) {
      console.warn(
        `[seed] ${book.slug}: unknown publisher "${book.publisherId}"; product has no publisher.`,
      );
    }

    // These catalog fields are intentionally refreshed on each seed run.
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
      salePrice:
        book.oldPrice && book.price < book.oldPrice
          ? book.price
          : null,
      status:
        book.status === "unpublished"
          ? ("UNPUBLISHED" as const)
          : ("PUBLISHED" as const),
      bestseller: book.isBestseller,
      newRelease: book.isNewArrival,
      editorChoice: book.isEditorsChoice,
      awardWinner: book.isAwardWinner,
      publisherId: publisherId ?? null,
    };

    const product = await prisma.product.upsert({
      where: { slug: book.slug },
      update: productData,
      create: {
        ...productData,
        sku: `seed-${book.id}`,
        slug: book.slug,
        // Ratings are initialized only on create, preserving real review aggregates.
        ratingAverage: book.ratingAvg,
        ratingCount: book.ratingCount,
      },
    });

    const productAuthorIds = lookupAll(
      authorIds,
      book.authorIds,
      "author",
      book.slug,
    );

    const productCategoryIds = lookupAll(
      categoryIds,
      book.categoryIds,
      "category",
      book.slug,
    );

    // Replace product links atomically.
    await prisma.$transaction(
      [
        prisma.productAuthor.deleteMany({
          where: { productId: product.id },
        }),
        prisma.productCategory.deleteMany({
          where: { productId: product.id },
        }),
        prisma.productAuthor.createMany({
          data: productAuthorIds.map((authorId) => ({
            productId: product.id,
            authorId,
          })),
          skipDuplicates: true,
        }),
        prisma.productCategory.createMany({
          data: productCategoryIds.map((categoryId) => ({
            productId: product.id,
            categoryId,
          })),
          skipDuplicates: true,
        }),
      ],
      { timeout: 30_000 },
    );

    // Do not reset live inventory on subsequent seed runs.
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: book.stock,
        reserved: 0,
      },
    });
  }

  console.log(`[seed] ✓ ${seedBooks.length} products seeded.`);

  // ---------- Coupons ----------
  for (const coupon of seedCoupons) {
    const data = {
      type:
        coupon.type === "percent"
          ? ("PERCENT" as const)
          : ("FLAT" as const),
      value: coupon.value,
      minSpend: coupon.minSpend,
      active: coupon.active,
      expiresAt: new Date(coupon.expiresAt),
    };

    if (Number.isNaN(data.expiresAt.getTime())) {
      throw new Error(
        `Coupon ${coupon.code} has an invalid expiresAt: ${coupon.expiresAt}`,
      );
    }

    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: data,
      create: {
        code: coupon.code,
        ...data,
      },
    });
  }

  console.log(`[seed] ✓ ${seedCoupons.length} coupons seeded.`);

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
      create: {
        id: banner.id,
        ...data,
      },
    });
  }

  console.log(`[seed] ✓ ${seedBanners.length} banners seeded.`);

  // ---------- Store settings ----------
  for (const [key, value] of Object.entries(seedSettings)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log(
    `[seed] ✓ ${Object.keys(seedSettings).length} store settings seeded.`,
  );

  console.log("\n========================================");
  console.log("       Odhay BD SEED COMPLETED");
  console.log("========================================");
  console.log(`✓ Admin: ${admin.email}`);
  console.log(`✓ Products: ${seedBooks.length}`);
  console.log(`✓ Authors: ${seedAuthors.length}`);
  console.log(`✓ Categories: ${seedCategories.length}`);
  console.log(`✓ Publishers: ${seedPublishers.length}`);
  console.log(`✓ Coupons: ${seedCoupons.length}`);
  console.log(`✓ Banners: ${seedBanners.length}`);
  console.log(`✓ Store settings: ${Object.keys(seedSettings).length}`);
  console.log("========================================\n");
}

main()
  .catch((error: unknown) => {
    console.error("\n[seed] Seed failed:");

    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
