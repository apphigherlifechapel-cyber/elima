/* eslint-disable @typescript-eslint/no-explicit-any */
import PrismaPackage from "@prisma/client";
const { PrismaClient } = PrismaPackage as any;

type PrismaClientType = any;

declare global {
  var prisma: PrismaClientType | undefined;
}

export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;
