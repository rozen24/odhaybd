import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, toProfile, userInclude } from "@/lib/auth";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";

// Only these fields can be changed by the user. role, status, walletBalance and
// rewardPoints are never accepted from the browser.
export const PUT = handle(async (request: Request) => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in", 401);
  const body = await readJson(request);

  const data: Prisma.UserUpdateInput = {};
  const name = str(body.name, 100);
  if (name) data.name = name;
  if (typeof body.phone === "string") data.phone = str(body.phone, 30) || null;
  if (typeof body.avatarUrl === "string") data.avatarUrl = str(body.avatarUrl, 500) || null;

  const updated = await prisma.user.update({ where: { id: user.id }, data, include: userInclude });
  return ok(toProfile(updated));
});
