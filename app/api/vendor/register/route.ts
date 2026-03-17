import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/vendor/register");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, user.id);

    const body = await req.json();
    const { companyName, storeDescription, taxId } = body;

    if (!companyName || !storeDescription) {
      return apiJson(ctx, { error: "Company name and description are required" }, { status: 400 });
    }

    // Check for existing application
    const existing = await prisma.vendorApplication.findFirst({
      where: { userId: user.id, status: "PENDING" }
    });

    if (existing) {
      return apiJson(ctx, { error: "You already have a pending application" }, { status: 409 });
    }

    const application = await prisma.vendorApplication.create({
      data: {
        userId: user.id,
        companyName,
        storeDescription,
        taxId: taxId || null,
        status: "PENDING",
      }
    });

    return apiJson(ctx, { application }, { status: 201 });
  } catch (error) {
    logApiError(baseCtx, "Failed to submit vendor application", error);
    return apiJson(baseCtx, { error: "Internal Server Error" }, { status: 500 });
  }
}
