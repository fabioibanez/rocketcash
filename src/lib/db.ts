import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * In development, use the direct Postgres URL (port 5432) so we avoid Supabase
 * pooler limits (connection_limit=1) that break when Next.js prefetches routes
 * or renders layout + page concurrently. Production keeps the pooled URL.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === "development" && process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }
  return process.env.DATABASE_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
