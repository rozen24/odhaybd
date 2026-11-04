import { prisma } from "@/lib/prisma";
import { createSession, toProfile, userInclude, verifyPassword } from "@/lib/auth";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";

const isDev = process.env.NODE_ENV !== "production";

export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const email = str(body.email, 254).trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return fail("Email and password are required", 400);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: userInclude,
  });

  const hasHash = !!user?.passwordHash;
  const valid = hasHash ? await verifyPassword(password, user!.passwordHash!) : false;

  // Dev-only: shows the real reason in the terminal. Never sent to the client.
  if (isDev && (!user || !valid)) {
    const reason = !user
      ? "USER_NOT_FOUND"
      : !hasHash
        ? "NO_PASSWORD_HASH"
        : "PASSWORD_MISMATCH";
    console.warn("[login debug]", {
      reason,
      email,                                  // normalized email that was searched
      passwordLength: password.length,        // helps spot autofill or trailing spaces
      hashPrefix: user?.passwordHash?.slice(0, 7), // "$2b$10$" = bcrypt, "$argon2" = argon2
    });
  }

  // Same message for "no such user" and "wrong password" so accounts can't be probed.
  if (!user || !valid) return fail("Invalid email or password", 401);
  if (user.status !== "ACTIVE") return fail("This account has been suspended", 403);

  await createSession(user.id);
  return ok(toProfile(user));
});