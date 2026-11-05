import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { seedSettings } from "@/services/seed";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";
import { getSessionUser } from "@/lib/auth";

// Settings live in the StoreSetting key/value table under the key "store".
// Anything not stored yet falls back to the defaults in services/seed.
const KEY = "store";

async function readSettings() {
  const row = await prisma.storeSetting.findUnique({ where: { key: KEY } });
  const stored =
    row && typeof row.value === "object" && row.value !== null && !Array.isArray(row.value)
      ? (row.value as Record<string, unknown>)
      : {};
  return { ...seedSettings, ...stored };
}

export const GET = handle(async () => {
  return ok(await readSettings());
});

export const PUT = handle(async (request: Request) => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in", 401);
  if (user.role !== "ADMIN") return fail("Admins only", 403);

  const body = await readJson(request);

  if (body.homeSections !== undefined && !Array.isArray(body.homeSections)) {
    return fail("homeSections must be a list", 400);
  }

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const popularSearches = Array.isArray(body.popularSearches)
    ? body.popularSearches.map((t: unknown) => str(t, 60)).filter(Boolean)
    : [];

  const homeSections = Array.isArray(body.homeSections)
    ? body.homeSections
        .map((s: any) => ({
          title: str(s?.title, 80),
          categorySlug: str(s?.categorySlug, 120),
          layout: s?.layout === "tiles" ? "tiles" : "rail",
        }))
        .filter((s: { title: string; categorySlug: string }) => s.title && s.categorySlug)
    : [];

  // Merge over what is already stored so keys this form doesn't edit are kept.
  const current = await readSettings();
  const next = {
    ...current,
    storeName: str(body.storeName, 120),
    supportPhone: str(body.supportPhone, 40),
    supportEmail: str(body.supportEmail, 254),
    announcement: str(body.announcement, 300),
    deliveryEstimate: str(body.deliveryEstimate, 120),
    shippingFee: num(body.shippingFee),
    freeShippingThreshold: num(body.freeShippingThreshold),
    popularSearches,
    homeSections,
  };

  await prisma.storeSetting.upsert({
    where: { key: KEY },
    update: { value: next as Prisma.InputJsonValue },
    create: { key: KEY, value: next as Prisma.InputJsonValue },
  });

  return ok(next);
});