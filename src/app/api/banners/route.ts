import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { requireRole } from "@/lib/guards";
import { safeUrl, toBanner } from "@/lib/catalog-admin";
import { prismaRepositories } from "@/services/prisma-repositories";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";

const PLACEMENTS = ["hero", "secondary", "campaign"];

// Empty on your PC; "/odhaybd" in the sub-folder deployment.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// The storefront gets only active banners. When a signed-in admin or editor
// loads the list from an /admin page, inactive banners are included too so they
// can be re-activated.
export const GET = handle(async (request: Request) => {
  let fromAdminPage = false;
  try {
    fromAdminPage = new URL(request.headers.get("referer") ?? "").pathname.startsWith(`${BASE_PATH}/admin`);
  } catch {
    /* no referer */
  }
  if (fromAdminPage) {
    const user = await getSessionUser();
    if (user && (user.role === "ADMIN" || user.role === "EDITOR")) {
      const rows = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      return ok(rows.map(toBanner));
    }
  }
  return ok(await prismaRepositories.catalog.banners());
});

export const POST = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const b = await readJson(request);

  const title = str(b.title, 150);
  if (!title) return fail("Please enter a banner title", 400);
  const placement = str(b.placement, 20);
  if (placement && !PLACEMENTS.includes(placement)) return fail("Invalid banner placement", 400);

  const last = await prisma.banner.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.banner.create({
    data: {
      title,
      subtitle: str(b.subtitle, 300) || null,
      ctaLabel: str(b.ctaLabel, 60) || null,
      ctaHref: safeUrl(str(b.ctaHref, 500)),
      imageUrl: safeUrl(str(b.imageUrl, 500)),
      background: str(b.bg, 200) || null,
      placement: placement || null,
      active: b.active !== false,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
  return ok(toBanner(row), { status: 201 });
});