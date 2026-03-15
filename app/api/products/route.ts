import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApi, logApiError, withUserContext } from "@/lib/utils/api-observability";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/products");
  const auth = await requireAdmin();
  if ("error" in auth) {
    logApi("warn", baseCtx, "Unauthorized products read attempt");
    const status = auth.error?.status || 401;
    return apiJson(baseCtx, { error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
  const ctx = withUserContext(baseCtx, auth.user.id);

  const onlyAvailable = req.nextUrl.searchParams.get("available") === "1";
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 50)));

  try {
    const products = await prisma.product.findMany({
      where: onlyAvailable ? { isAvailable: true } : undefined,
      include: {
        images: true,
        brand: true,
        category: true,
        variants: true,
        priceTiers: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    logApi("info", ctx, "Products list loaded", { count: products.length, onlyAvailable, limit });
    return apiJson(ctx, { products });
  } catch (error) {
    logApiError(ctx, "Failed to load products", error, { onlyAvailable, limit });
    return apiJson(ctx, { error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-products:${ip}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many product changes. Try again shortly." }, { status: 429 });
  }

  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as {
    action?: "create" | "update" | "delete";
    id?: string;
    title?: string;
    slug?: string;
    categoryId?: string;
    brandId?: string | null;
    description?: string;
    isRetail?: boolean;
    isWholesale?: boolean;
    retailPrice?: number;
    wholesalePrice?: number;
    moq?: number;
    stockTotal?: number;
    packSize?: number;
    isAvailable?: boolean;
    imageUrl?: string;
  };

  const action = body.action || "create";

  if (action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: body.id } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: body.id } }),
      prisma.priceTier.deleteMany({ where: { productId: body.id } }),
      prisma.productVariant.deleteMany({ where: { productId: body.id } }),
      prisma.product.delete({ where: { id: body.id } }),
      prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "PRODUCT_DELETE",
          entity: "Product",
          entityId: body.id,
          changes: JSON.stringify({ title: product.title, slug: product.slug }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.product.findUnique({
      where: { id: body.id },
      include: { images: true },
    });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const nextTitle = body.title?.trim() || existing.title;
    const nextSlug = body.slug?.trim() || existing.slug;
    const nextCategoryId = body.categoryId || existing.categoryId;
    const nextDescription = body.description?.trim() || existing.description;

    const category = await prisma.category.findUnique({ where: { id: nextCategoryId } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    if (body.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
      if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        title: nextTitle,
        slug: nextSlug,
        categoryId: nextCategoryId,
        brandId: body.brandId || null,
        description: nextDescription,
        isRetail: body.isRetail ?? existing.isRetail,
        isWholesale: body.isWholesale ?? existing.isWholesale,
        retailPrice: Number(body.retailPrice ?? existing.retailPrice),
        wholesalePrice: Number(body.wholesalePrice ?? existing.wholesalePrice),
        moq: Number(body.moq ?? existing.moq),
        stockTotal: Number(body.stockTotal ?? existing.stockTotal),
        packSize: Number(body.packSize ?? existing.packSize),
        isAvailable: body.isAvailable ?? existing.isAvailable,
      },
      include: { images: true, category: true, brand: true },
    });

    if (body.imageUrl !== undefined) {
      const firstImage = existing.images[0];
      if (body.imageUrl) {
        if (firstImage) {
          await prisma.productImage.update({
            where: { id: firstImage.id },
            data: { url: body.imageUrl, altText: body.title },
          });
        } else {
          await prisma.productImage.create({
            data: { productId: body.id, url: body.imageUrl, altText: body.title },
          });
        }
      } else if (firstImage) {
        await prisma.productImage.delete({ where: { id: firstImage.id } });
      }
    }

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "PRODUCT_UPDATE",
        entity: "Product",
        entityId: body.id,
        changes: JSON.stringify({
          title: { from: existing.title, to: product.title },
          slug: { from: existing.slug, to: product.slug },
          retailPrice: { from: existing.retailPrice, to: product.retailPrice },
          wholesalePrice: { from: existing.wholesalePrice, to: product.wholesalePrice },
          stockTotal: { from: existing.stockTotal, to: product.stockTotal },
          isAvailable: { from: existing.isAvailable, to: product.isAvailable },
        }),
      },
    });

    return NextResponse.json({ product });
  }

  if (!body.title || !body.slug || !body.categoryId || !body.description) {
    return NextResponse.json({ error: "title, slug, categoryId and description are required" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  if (body.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const product = await prisma.product.create({
    data: {
      title: body.title,
      slug: body.slug,
      categoryId: body.categoryId,
      brandId: body.brandId || null,
      description: body.description,
      isRetail: body.isRetail ?? true,
      isWholesale: body.isWholesale ?? false,
      retailPrice: Number(body.retailPrice ?? 0),
      wholesalePrice: Number(body.wholesalePrice ?? body.retailPrice ?? 0),
      moq: Number(body.moq ?? 1),
      stockTotal: Number(body.stockTotal ?? 0),
      packSize: Number(body.packSize ?? 1),
      isAvailable: body.isAvailable ?? true,
      images: body.imageUrl
        ? {
            create: [{ url: body.imageUrl, altText: body.title }],
          }
        : undefined,
    },
    include: { images: true, category: true, brand: true },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId: auth.user.id,
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      changes: JSON.stringify({ title: product.title, slug: product.slug }),
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}

