import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { adjustInventoryByStaffOrAdmin } from "@/lib/admin-ops";
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
  const baseCtx = createApiContext(req, "/api/admin/inventory");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-inventory:${ip}`, 80, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many inventory updates. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireStaffOrAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      productId?: string;
      stockTotal?: number;
      stockReserved?: number;
      isAvailable?: boolean;
    };

    if (!body.productId) {
      return apiJson(ctx, { error: "productId is required" }, { status: 400 });
    }

    const result = await adjustInventoryByStaffOrAdmin({
      actorUserId: auth.user.id,
      productId: body.productId,
      stockTotal: body.stockTotal,
      stockReserved: body.stockReserved,
      isAvailable: body.isAvailable,
    });

    if ("error" in result) {
      return apiJson(ctx, { error: result.error }, { status: result.status });
    }

    return apiJson(ctx, { product: result.product });
  } catch (error) {
    logApiError(baseCtx, "Failed to update inventory", error);
    return apiJson(baseCtx, { error: "Failed to update inventory" }, { status: 500 });
  }
}
