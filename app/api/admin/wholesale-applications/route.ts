import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/wholesale-applications");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      status?: "APPROVED" | "REJECTED";
      notes?: string;
    };

    if (!body.userId || !body.status) {
      return apiJson(ctx, { error: "userId and status are required" }, { status: 400 });
    }

    const application = await prisma.wholesaleApplication.findUnique({
      where: { userId: body.userId },
    });
    if (!application) {
      return apiJson(ctx, { error: "Wholesale application not found" }, { status: 404 });
    }

    const updatedApp = await prisma.wholesaleApplication.update({
      where: { userId: body.userId },
      data: {
        status: body.status,
        notes: body.notes || null,
        reviewedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: body.userId },
      data: {
        wholesaleStatus: body.status,
        accountType: body.status === "APPROVED" ? "WHOLESALE" : "RETAIL",
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "WHOLESALE_APPLICATION_REVIEW",
        entity: "WholesaleApplication",
        entityId: updatedApp.id,
        changes: JSON.stringify({
          applicantUserId: body.userId,
          status: body.status,
          notes: body.notes || null,
        }),
      },
    });

    return apiJson(ctx, { application: updatedApp });
  } catch (error) {
    logApiError(baseCtx, "Failed to review wholesale application", error);
    return apiJson(baseCtx, { error: "Failed to review wholesale application" }, { status: 500 });
  }
}
