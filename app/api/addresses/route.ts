import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: "create" | "delete" | "setDefault";
    label?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    isDefault?: boolean;
  };

  const action = body.action || "create";

  if (action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const address = await prisma.address.findUnique({ where: { id: body.id } });
    if (!address || address.userId !== user.id) return NextResponse.json({ error: "Address not found" }, { status: 404 });
    await prisma.address.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "setDefault") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const address = await prisma.address.findUnique({ where: { id: body.id } });
    if (!address || address.userId !== user.id) return NextResponse.json({ error: "Address not found" }, { status: 404 });
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: body.id }, data: { isDefault: true } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (!body.label || !body.line1 || !body.city || !body.state || !body.country || !body.postalCode) {
    return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
  }

  const shouldSetDefault = Boolean(body.isDefault);
  if (shouldSetDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      label: body.label,
      line1: body.line1,
      line2: body.line2 || null,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
      isDefault: shouldSetDefault,
    },
  });

  return NextResponse.json({ address }, { status: 201 });
}
