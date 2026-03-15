import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user };
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/wishlist");
  try {
    const auth = await requireUser();
    if ("error" in auth) {
      const status = auth.error?.status || 401;
      return apiJson(baseCtx, { error: status === 404 ? "User not found" : "Unauthorized" }, { status });
    }
    const ctx = withUserContext(baseCtx, auth.user.id);

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: auth.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { sortOrder: "asc" } },
              },
            },
            variant: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return apiJson(ctx, { items: wishlist?.items || [] });
  } catch (error) {
    logApiError(baseCtx, "Failed to load wishlist", error);
    return apiJson(baseCtx, { error: "Failed to load wishlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/wishlist");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`wishlist:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many wishlist changes. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireUser();
    if ("error" in auth) {
      const status = auth.error?.status || 401;
      return apiJson(baseCtx, { error: status === 404 ? "User not found" : "Unauthorized" }, { status });
    }
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "add" | "remove";
      productId?: string;
      variantId?: string | null;
      wishlistItemId?: string;
    };

    const action = body.action || "add";
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: auth.user.id },
      update: {},
      create: { userId: auth.user.id },
    });

    if (action === "remove") {
      if (body.wishlistItemId) {
        await prisma.wishlistItem.deleteMany({ where: { id: body.wishlistItemId, wishlistId: wishlist.id } });
      } else if (body.productId) {
        await prisma.wishlistItem.deleteMany({
          where: {
            wishlistId: wishlist.id,
            productId: body.productId,
            variantId: body.variantId || null,
          },
        });
      } else {
        return apiJson(ctx, { error: "wishlistItemId or productId is required for remove" }, { status: 400 });
      }

      return apiJson(ctx, { ok: true });
    }

    if (!body.productId) {
      return apiJson(ctx, { error: "productId is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return apiJson(ctx, { error: "Product not found" }, { status: 404 });

    if (body.variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: body.variantId } });
      if (!variant || variant.productId !== body.productId) {
        return apiJson(ctx, { error: "Variant not found for product" }, { status: 404 });
      }
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: body.productId,
        variantId: body.variantId || null,
      },
    });

    if (!existing) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: body.productId,
          variantId: body.variantId || null,
        },
      });
    }

    return apiJson(ctx, { ok: true });
  } catch (error) {
    logApiError(baseCtx, "Failed to update wishlist", error);
    return apiJson(baseCtx, { error: "Failed to update wishlist" }, { status: 500 });
  }
}

