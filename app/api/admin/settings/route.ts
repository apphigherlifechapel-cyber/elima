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
  const baseCtx = createApiContext(req, "/api/admin/settings");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const settings = await prisma.setting.findMany({
      orderBy: { key: "asc" },
      take: 500,
    });

    return apiJson(ctx, { settings });
  } catch (error) {
    logApiError(baseCtx, "Failed to load settings", error);
    return apiJson(baseCtx, { error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/settings");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-settings:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many settings changes. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      key?: string;
      value?: string;
    };

    const key = body.key?.trim();
    if (!key) return apiJson(ctx, { error: "key is required" }, { status: 400 });
    if (body.value === undefined) return apiJson(ctx, { error: "value is required" }, { status: 400 });

    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(body.value) },
      update: { value: String(body.value) },
    });

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "SETTING_UPSERT",
        entity: "Setting",
        entityId: setting.id,
        changes: JSON.stringify({ key: setting.key }),
      },
    });

    return apiJson(ctx, { setting });
  } catch (error) {
    logApiError(baseCtx, "Failed to update settings", error);
    return apiJson(baseCtx, { error: "Failed to update settings" }, { status: 500 });
  }
}
