import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

// PrismaPg uses pg.Pool over TCP/TLS — correct for a persistent Node.js server.
// Neon's serverless adapters (PrismaNeon/PrismaNeonHttp) target edge/serverless
// environments and break in a long-running process: PrismaNeon's WebSocket pool
// goes stale when Neon drops idle connections, and PrismaNeonHttp relies on
// globalThis.fetch (undici) which times out on Node.js v24 against Neon's endpoint.
const adapter = new PrismaPg(databaseUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
