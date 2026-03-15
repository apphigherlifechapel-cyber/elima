import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") return { error: "Forbidden", status: 403 as const };
  return { user };
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/banners");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const banners = await prisma.banner.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return apiJson(ctx, { banners });
  } catch (error) {
    logApiError(baseCtx, "Failed to load banners", error);
    return apiJson(baseCtx, { error: "Failed to load banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/banners");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-banners:${ip}`, 40, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many banner changes. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "create" | "update" | "delete" | "toggle";
      id?: string;
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      link?: string | null;
      active?: boolean;
      priority?: number;
    };

    if (body.action === "delete") {
      if (!body.id) return apiJson(ctx, { error: "id is required" }, { status: 400 });
      const existing = await prisma.banner.findUnique({ where: { id: body.id } });
      if (!existing) return apiJson(ctx, { error: "Banner not found" }, { status: 404 });

      await prisma.banner.delete({ where: { id: body.id } });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "BANNER_DELETE",
          entity: "Banner",
          entityId: body.id,
          changes: JSON.stringify({ title: existing.title }),
        },
      });
      return apiJson(ctx, { ok: true });
    }

    if (body.action === "toggle") {
      if (!body.id) return apiJson(ctx, { error: "id is required" }, { status: 400 });
      const existing = await prisma.banner.findUnique({ where: { id: body.id } });
      if (!existing) return apiJson(ctx, { error: "Banner not found" }, { status: 404 });

      const updated = await prisma.banner.update({
        where: { id: body.id },
        data: { active: !existing.active },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "BANNER_TOGGLE",
          entity: "Banner",
          entityId: body.id,
          changes: JSON.stringify({ from: existing.active, to: updated.active }),
        },
      });
      return apiJson(ctx, { banner: updated });
    }

    if (body.action === "update") {
      if (!body.id || !body.title?.trim() || !body.imageUrl?.trim()) {
        return apiJson(ctx, { error: "id, title and imageUrl are required" }, { status: 400 });
      }

      const existing = await prisma.banner.findUnique({ where: { id: body.id } });
      if (!existing) return apiJson(ctx, { error: "Banner not found" }, { status: 404 });

      const updated = await prisma.banner.update({
        where: { id: body.id },
        data: {
          title: body.title.trim(),
          subtitle: body.subtitle?.trim() || null,
          imageUrl: body.imageUrl.trim(),
          link: body.link?.trim() || null,
          priority: Number(body.priority ?? existing.priority),
          active: body.active ?? existing.active,
        },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "BANNER_UPDATE",
          entity: "Banner",
          entityId: body.id,
          changes: JSON.stringify({ title: { from: existing.title, to: updated.title } }),
        },
      });
      return apiJson(ctx, { banner: updated });
    }

    if (!body.title?.trim() || !body.imageUrl?.trim()) {
      return apiJson(ctx, { error: "title and imageUrl are required" }, { status: 400 });
    }

    const banner = await prisma.banner.create({
      data: {
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() || null,
        imageUrl: body.imageUrl.trim(),
        link: body.link?.trim() || null,
        priority: Number(body.priority ?? 0),
        active: body.active ?? true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "BANNER_CREATE",
        entity: "Banner",
        entityId: banner.id,
        changes: JSON.stringify({ title: banner.title }),
      },
    });

    return apiJson(ctx, { banner }, { status: 201 });
  } catch (error) {
    logApiError(baseCtx, "Failed to mutate banners", error);
    return apiJson(baseCtx, { error: "Failed to update banners" }, { status: 500 });
  }
}
