import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { reserveStock } from "@/lib/inventory";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { getDynamicPrice } from "@/lib/pricing.dynamic";
import { trackEvent } from "@/lib/analytics.events";
import { apiJson, createApiContext, logApi, logApiError, withUserContext } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/cart");
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email || "";
    const sessionUser = sessionEmail ? await prisma.user.findUnique({ where: { email: sessionEmail } }) : null;
    const userId = String(req.nextUrl.searchParams.get("userId") || sessionUser?.id || "");
    if (!userId) return apiJson(baseCtx, { error: "userId required" }, { status: 400 });

    const ctx = withUserContext(baseCtx, sessionUser?.id);
    const cart = await prisma.cart.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart) return apiJson(ctx, { items: [] });
    return apiJson(ctx, cart);
  } catch (error) {
    logApiError(baseCtx, "Failed to load cart", error);
    return apiJson(baseCtx, { error: "Failed to load cart" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/cart");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sessionUser) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, sessionUser.id);

    const body = await req.json();
    const { userId, productId, variantId, quantity } = body;
    const parsedQty = Number(quantity);
    const effectiveUserId = String(userId || sessionUser.id);
    if (effectiveUserId !== sessionUser.id) {
      return apiJson(ctx, { error: "Forbidden" }, { status: 403 });
    }

    if (!productId || !Number.isFinite(parsedQty) || parsedQty < 1) {
      return apiJson(ctx, { error: "Invalid payload: productId and numeric quantity >= 1 are required" }, { status: 400 });
    }

    const existingCart = await prisma.cart.findFirst({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: "desc" },
    });
    const cart =
      existingCart ||
      (await prisma.cart.create({
        data: { userId: effectiveUserId },
    }));

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return apiJson(ctx, { error: "Product not found" }, { status: 404 });

    const variant = variantId ? await prisma.productVariant.findUnique({ where: { id: variantId } }) : null;
    if (variantId && !variant) {
      return apiJson(ctx, { error: "Variant not found" }, { status: 404 });
    }
    if (variant && variant.productId !== product.id) {
      return apiJson(ctx, { error: "Variant does not belong to product" }, { status: 400 });
    }

    const existingItem = await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId: variantId || null, productId } });
    const targetQty = (existingItem?.quantity || 0) + parsedQty;

    if (variant && variant.stock - variant.stockReserved < targetQty) {
      return apiJson(ctx, { error: "Insufficient variant stock" }, { status: 400 });
    }
    if (!variant && product.stockTotal - product.stockReserved < targetQty) {
      return apiJson(ctx, { error: "Insufficient product stock" }, { status: 400 });
    }

    const basePrice = variant ? Number(variant.retailPrice) : Number(product.retailPrice);
    const unitPrice = getDynamicPrice({
      basePrice,
      accountType: sessionUser.accountType,
      quantity: targetQty,
      hasActiveCampaign: false,
      loyaltyTier: "NONE",
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: targetQty,
          unitPrice,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity: parsedQty,
          unitPrice,
        },
      });
    }

    if (variant) {
      const updated = reserveStock(variant.stock, variant.stockReserved, parsedQty);
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stockReserved: updated.stockReserved },
      });
    } else {
      const updated = reserveStock(product.stockTotal, product.stockReserved, parsedQty);
      await prisma.product.update({
        where: { id: product.id },
        data: { stockReserved: updated.stockReserved },
      });
    }

    await trackEvent({
      name: "add_to_bag",
      userId: sessionUser.id,
      metadata: {
        productId,
        variantId: variantId || null,
        quantityAdded: parsedQty,
        cartQuantity: targetQty,
        unitPrice,
      },
    });

    logApi("info", ctx, "Item added to cart", { productId, variantId: variantId || null, quantity: parsedQty });
    return apiJson(ctx, { message: "Added to cart", quantity: targetQty, unitPrice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add to cart";
    const status = message.toLowerCase().includes("insufficient stock") ? 400 : 500;
    logApiError(baseCtx, "Failed to add to cart", error);
    return apiJson(baseCtx, { error: message }, { status });
  }
}

