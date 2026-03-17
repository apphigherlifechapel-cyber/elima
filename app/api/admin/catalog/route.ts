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

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/catalog");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, parentId: true },
        orderBy: [{ name: "asc" }],
        take: 500,
      }),
      prisma.brand.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: [{ name: "asc" }],
        take: 500,
      }),
    ]);

    return apiJson(ctx, { categories, brands });
  } catch (error) {
    logApiError(baseCtx, "Failed to load catalog", error);
    return apiJson(baseCtx, { error: "Failed to load catalog" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/catalog");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-catalog:${ip}`, 40, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many catalog changes. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "createCategory" | "deleteCategory" | "createBrand" | "deleteBrand";
      id?: string;
      name?: string;
      slug?: string;
      parentId?: string | null;
    };

    if (body.action === "createCategory") {
      if (!body.name?.trim()) return apiJson(ctx, { error: "name is required" }, { status: 400 });
      const slug = toSlug(body.slug?.trim() || body.name);

      if (body.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
        if (!parent) return apiJson(ctx, { error: "Parent category not found" }, { status: 404 });
      }

      const category = await prisma.category.create({
        data: {
          name: body.name.trim(),
          slug,
          parentId: body.parentId || null,
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "CATEGORY_CREATE",
          entity: "Category",
          entityId: category.id,
          changes: JSON.stringify({ name: category.name, slug: category.slug, parentId: category.parentId }),
        },
      });

      return apiJson(ctx, { category }, { status: 201 });
    }

    if (body.action === "deleteCategory") {
      if (!body.id) return apiJson(ctx, { error: "id is required" }, { status: 400 });

      const category = await prisma.category.findUnique({ where: { id: body.id } });
      if (!category) return apiJson(ctx, { error: "Category not found" }, { status: 404 });

      const usage = await prisma.product.count({ where: { categoryId: body.id } });
      if (usage > 0) {
        return apiJson(ctx, { error: "Cannot delete category with products" }, { status: 409 });
      }

      await prisma.category.delete({ where: { id: body.id } });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "CATEGORY_DELETE",
          entity: "Category",
          entityId: body.id,
          changes: JSON.stringify({ name: category.name, slug: category.slug }),
        },
      });

      return apiJson(ctx, { ok: true });
    }

    if (body.action === "createBrand") {
      if (!body.name?.trim()) return apiJson(ctx, { error: "name is required" }, { status: 400 });
      const slug = toSlug(body.slug?.trim() || body.name);

      const brand = await prisma.brand.create({
        data: {
          name: body.name.trim(),
          slug,
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "BRAND_CREATE",
          entity: "Brand",
          entityId: brand.id,
          changes: JSON.stringify({ name: brand.name, slug: brand.slug }),
        },
      });

      return apiJson(ctx, { brand }, { status: 201 });
    }

    if (body.action === "deleteBrand") {
      if (!body.id) return apiJson(ctx, { error: "id is required" }, { status: 400 });

      const brand = await prisma.brand.findUnique({ where: { id: body.id } });
      if (!brand) return apiJson(ctx, { error: "Brand not found" }, { status: 404 });

      const usage = await prisma.product.count({ where: { brandId: body.id } });
      if (usage > 0) {
        return apiJson(ctx, { error: "Cannot delete brand assigned to products" }, { status: 409 });
      }

      await prisma.brand.delete({ where: { id: body.id } });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "BRAND_DELETE",
          entity: "Brand",
          entityId: body.id,
          changes: JSON.stringify({ name: brand.name, slug: brand.slug }),
        },
      });

      return apiJson(ctx, { ok: true });
    }

    return apiJson(ctx, { error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    logApiError(baseCtx, "Failed to mutate catalog", error);
    return apiJson(baseCtx, { error: "Failed to update catalog" }, { status: 500 });
  }
}
