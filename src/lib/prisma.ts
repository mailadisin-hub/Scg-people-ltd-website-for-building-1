import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (url.startsWith("file:")) {
    // Local SQLite for development
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  }

  // Production: PostgreSQL (Neon) over the standard node-postgres driver.
  // Plain TCP — supports interactive transactions and works reliably in
  // Netlify serverless functions (no WebSocket runtime needed).
  const { PrismaPg } = require("@prisma/adapter-pg");
  // Pool size 3: enough for concurrent serverless requests without exhausting
  // Neon's free-tier connection limit (max 10).
  const adapter = new PrismaPg({ connectionString: url, max: 3 });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
