import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ hasAuthenticators: false });
  }

  const count = await prisma.authenticator.count({
    where: { userId },
  });

  return NextResponse.json({ hasAuthenticators: count > 0 });
}
