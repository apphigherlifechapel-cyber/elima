import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const application = await prisma.wholesaleApplication.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    accountType: user.accountType,
    wholesaleStatus: user.wholesaleStatus,
    application,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { companyName?: string; website?: string };
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  const application = await prisma.wholesaleApplication.upsert({
    where: { userId: user.id },
    update: {
      companyName: body.companyName.trim(),
      website: body.website?.trim() || null,
      status: "PENDING",
      notes: null,
      reviewedAt: null,
    },
    create: {
      userId: user.id,
      companyName: body.companyName.trim(),
      website: body.website?.trim() || null,
      status: "PENDING",
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      wholesaleStatus: "PENDING",
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
