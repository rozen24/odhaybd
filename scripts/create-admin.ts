 // Creates an ADMIN user, or resets the password and role of an existing one.
// Uses the same password format as src/lib/auth.ts (scrypt).
//
// Usage (from the project root):
//   npx tsx scripts/create-admin.ts you@example.com "YourPassword123" "Your Name"

import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function main() {
  const [emailArg, password, nameArg] = process.argv.slice(2);
  if (!emailArg || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> ["Full Name"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    });
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Updated ${existing.email}: password reset, role set to ADMIN.`);
  } else {
    const user = await prisma.user.create({
      data: { name: nameArg?.trim() || "Admin", email, passwordHash, role: "ADMIN" },
    });
    console.log(`Created admin ${user.email}.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());