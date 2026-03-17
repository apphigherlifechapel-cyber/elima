/* eslint-disable @typescript-eslint/no-explicit-any */
import PrismaPackage from "@prisma/client";
const { PrismaClient } = PrismaPackage as any;

type PrismaClientType = any;

declare global {
  var prisma: PrismaClientType | undefined;
}

function createPrismaClient(): PrismaClientType {
  if (!process.env.DATABASE_URL) {
    // Avoid hard-failing module evaluation during build when env vars are not injected yet.
    return new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not set. Configure it in your deployment environment.");
        },
      }
    ) as PrismaClientType;
  }

  return new PrismaClient();
}

export const prisma = global.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) global.prisma = prisma;
