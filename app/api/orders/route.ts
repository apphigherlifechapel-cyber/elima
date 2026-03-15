import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

function parseLimit(raw: string | null): number {
  const parsed = Number(raw ?? 20);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/orders");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, user.id);

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

    const where =
      user.role === "ADMIN"
        ? {
            ...(status ? { status } : {}),
          }
        : {
            userId: user.id,
            ...(status ? { status } : {}),
          };

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        payment: true,
        shippingAddress: true,
        billingAddress: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiJson(ctx, { orders });
  } catch (error) {
    logApiError(baseCtx, "Failed to load orders", error);
    return apiJson(baseCtx, { error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/orders");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, user.id);

    const body = (await req.json().catch(() => ({}))) as { orderId?: string; action?: string };
    const orderId = body.orderId;
    const action = body.action || "cancel";

    if (!orderId) {
      return apiJson(ctx, { error: "orderId is required" }, { status: 400 });
    }

    if (action !== "cancel") {
      return apiJson(ctx, { error: "Unsupported action" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return apiJson(ctx, { error: "Order not found" }, { status: 404 });

    if (user.role !== "ADMIN" && existing.userId !== user.id) {
      return apiJson(ctx, { error: "Forbidden" }, { status: 403 });
    }

    if (existing.status !== "PENDING") {
      return apiJson(ctx, { error: "Only pending orders can be cancelled" }, { status: 409 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
      },
    });

    return apiJson(ctx, { order: updated });
  } catch (error) {
    logApiError(baseCtx, "Failed to mutate order", error);
    return apiJson(baseCtx, { error: "Failed to update order" }, { status: 500 });
  }
}
