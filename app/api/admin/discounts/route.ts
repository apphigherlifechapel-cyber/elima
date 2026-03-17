import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") return { error: "Forbidden", status: 403 as const };
  return { user };
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/discounts");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return apiJson(ctx, { discounts });
  } catch (error) {
    logApiError(baseCtx, "Failed to load discounts", error);
    return apiJson(baseCtx, { error: "Failed to load discounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/discounts");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-discounts:${ip}`, 30, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many discount changes. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "create" | "toggle";
      id?: string;
      name?: string;
      code?: string;
      discountType?: string;
      value?: number;
      startsAt?: string;
      endsAt?: string | null;
      active?: boolean;
    };

    if (body.action === "toggle") {
      if (!body.id) return apiJson(ctx, { error: "id is required" }, { status: 400 });

      const discount = await prisma.discount.findUnique({ where: { id: body.id } });
      if (!discount) return apiJson(ctx, { error: "Discount not found" }, { status: 404 });

      const updated = await prisma.discount.update({
        where: { id: body.id },
        data: { active: !discount.active },
      });

      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "DISCOUNT_TOGGLE",
          entity: "Discount",
          entityId: updated.id,
          changes: JSON.stringify({ active: { from: discount.active, to: updated.active } }),
        },
      });

      return apiJson(ctx, { discount: updated });
    }

    if (!body.name || !body.code || !body.discountType || body.value === undefined || !body.startsAt) {
      return apiJson(ctx, { error: "name, code, discountType, value, and startsAt are required" }, { status: 400 });
    }

    const created = await prisma.discount.create({
      data: {
        name: body.name,
        code: body.code,
        discountType: body.discountType,
        value: Number(body.value),
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        active: body.active ?? true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "DISCOUNT_CREATE",
        entity: "Discount",
        entityId: created.id,
        changes: JSON.stringify({ code: created.code, value: created.value, discountType: created.discountType }),
      },
    });

    return apiJson(ctx, { discount: created }, { status: 201 });
  } catch (error) {
    logApiError(baseCtx, "Failed to mutate discounts", error);
    return apiJson(baseCtx, { error: "Failed to update discounts" }, { status: 500 });
  }
}
