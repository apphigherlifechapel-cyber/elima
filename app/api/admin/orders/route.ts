import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { FulfillmentStatus, OrderStatus } from "@prisma/client";
import { updateOrderByStaffOrAdmin } from "@/lib/admin-ops";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

async function requireStaffOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/orders");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-orders:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many order updates. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireStaffOrAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      orderId?: string;
      fulfillmentStatus?: FulfillmentStatus;
      orderStatus?: OrderStatus;
      carrier?: string;
      trackingNumber?: string | null;
    };

    if (!body.orderId) {
      return apiJson(ctx, { error: "orderId is required" }, { status: 400 });
    }

    const result = await updateOrderByStaffOrAdmin({
      actorUserId: auth.user.id,
      orderId: body.orderId,
      fulfillmentStatus: body.fulfillmentStatus,
      orderStatus: body.orderStatus,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
    });

    if ("error" in result) {
      return apiJson(ctx, { error: result.error }, { status: result.status });
    }

    return apiJson(ctx, { order: result.order });
  } catch (error) {
    logApiError(baseCtx, "Failed to update order", error);
    return apiJson(baseCtx, { error: "Failed to update order" }, { status: 500 });
  }
}
