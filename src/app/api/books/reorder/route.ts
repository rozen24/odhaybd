import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { fail, handle, isUuid, ok, readJson } from "@/lib/api-route";

export const PUT = handle(async (request: Request) => {
  const auth = await requireRole("SELLER", "ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { ids } = await readJson(request);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 ||
      !ids.every((id) => typeof id === "string" && isUuid(id)) ||
      new Set(ids).size !== ids.length) {
    return fail("Invalid order", 400);
  }

  let sellerId: string | null = null;
  if (auth.user.role === "SELLER") {
    const seller = await prisma.seller.findUnique({ where: { userId: auth.user.id }, select: { id: true } });
    if (!seller) return fail("Your account has no seller profile yet", 403);
    sellerId = seller.id;
  }

  const products = await prisma.product.findMany({
    where: sellerId ? { sellerId } : undefined,
    select: { id: true },
  });
  if (products.length !== ids.length || products.some((product) => !ids.includes(product.id))) {
    return fail("Product list changed. Refresh and try again.", 409);
  }

  await prisma.$transaction(
    (ids as string[]).map((id, index) =>
      prisma.product.update({ where: { id }, data: { displayOrder: index } }),
    ),
  );
  return ok({ ok: true });
});
