import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; // 1. Import the driver adapter

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // 2. Instantiate the database adapter via your environment variable
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

    // 3. Inject the driver adapter into the constructor configuration
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(getPrismaClient(), property, receiver);
    return typeof value === "function" ? value.bind(getPrismaClient()) : value;
  },
});
