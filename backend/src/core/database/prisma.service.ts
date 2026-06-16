import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

/**
 * Creates the correct Prisma driver adapter for the configured database URL.
 * Local PostgreSQL uses the pg adapter, while Neon-hosted URLs use the Neon serverless adapter.
 */
function createPrismaAdapter(connectionString: string) {
  const hostname = new URL(connectionString).hostname;
  const isNeonHost = hostname.includes("neon.tech");

  if (isNeonHost) {
    return new PrismaNeon({ connectionString });
  }

  return new PrismaPg(connectionString);
}

const adapter = createPrismaAdapter(databaseUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
