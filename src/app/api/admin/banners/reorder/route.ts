import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { fail, handle, ok, readJson } from "@/lib/api-route";

export const PUT = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const { ids } = await readJson(request);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || !ids.every((id) => typeof id === "string" && id.trim().length > 0) || new Set(ids).size !== ids.length) {
    return fail("Invalid order", 400);
  }

  const banners = await prisma.banner.findMany({ select: { id: true } });
  if (banners.length !== ids.length || banners.some((banner) => !ids.includes(banner.id))) {
    return fail("Banner list changed. Refresh and try again.", 409);
  }

  await prisma.$transaction(
    (ids as string[]).map((id, index) => prisma.banner.update({ where: { id }, data: { sortOrder: index } })),
  );
  return ok({ ok: true });
});
