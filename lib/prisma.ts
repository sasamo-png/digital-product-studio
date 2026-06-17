import { PrismaClient } from "@prisma/client";

// Patrón singleton para evitar múltiples instancias de PrismaClient en
// desarrollo (hot-reload de Next.js recrearía el cliente en cada recarga).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
