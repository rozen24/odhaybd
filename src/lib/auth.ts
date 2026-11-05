// Server-only authentication helpers: password hashing (Node's built-in scrypt,
// no extra package), cookie sessions stored in the Session table, and the
// mapping from a User row to the app's Profile type.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Profile } from "@/types";

export const SESSION_COOKIE = "bp_session";
const SESSION_DAYS = 30;

// When the site lives in a sub-folder (https://example.com/odhaybd) the cookie
// is limited to that folder, so other apps on the same domain never receive it.
const COOKIE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/* ---------------------------- passwords ---------------------------- */

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ----------------------------- sessions ----------------------------- */

export const userInclude = {
  addresses: { orderBy: { isDefault: "desc" as const } },
  seller: { select: { id: true } },
} satisfies Prisma.UserInclude;

export type UserRecord = Prisma.UserGetPayload<{ include: typeof userInclude }>;

// The browser gets a random token in an httpOnly cookie; the database only
// stores its hash, so a leaked database cannot be used to hijack sessions.
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { sessionToken: sha256(token), userId, expires } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    expires,
  });
}

export async function getSessionUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: sha256(token) },
    include: { user: { include: userInclude } },
  });
  if (!session) return null;
  if (session.expires.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { sessionToken: sha256(token) } });
  // A cookie is only removed when the path matches the one it was set with.
  jar.delete({ name: SESSION_COOKIE, path: COOKIE_PATH });
}

/* ------------------------------ profile ------------------------------ */

export function toProfile(u: UserRecord): Profile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.toLowerCase() as Profile["role"],
    status: u.status.toLowerCase() as Profile["status"],
    phone: u.phone ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    walletBalance: Number(u.walletBalance),
    rewardPoints: u.rewardPoints,
    sellerId: u.seller?.id,
    addresses: u.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      district: a.district,
      area: a.area,
      street: a.street,
      isDefault: a.isDefault,
    })),
    createdAt: u.createdAt.toISOString(),
  };
}