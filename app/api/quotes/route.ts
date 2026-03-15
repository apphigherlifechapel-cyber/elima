import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Product } from "@prisma/client";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

type QuoteItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/quotes");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, user.id);

    const quotes =
      user.role === "ADMIN"
        ? await prisma.quote.findMany({
            include: { items: true, user: { select: { id: true, email: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        : await prisma.quote.findMany({
            where: { userId: user.id },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          });

    return apiJson(ctx, { quotes });
  } catch (error) {
    logApiError(baseCtx, "Failed to load quotes", error);
    return apiJson(baseCtx, { error: "Failed to load quotes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/quotes");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`quotes:${ip}`, 20, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many quote submissions. Please wait and try again." }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiJson(baseCtx, { error: "User not found" }, { status: 404 });
    const ctx = withUserContext(baseCtx, user.id);

    const body = (await req.json().catch(() => ({}))) as {
      items?: QuoteItemInput[];
      notes?: string;
    };

    if (!body.items || body.items.length === 0) {
      return apiJson(ctx, { error: "items are required" }, { status: 400 });
    }

    const normalizedItems = body.items
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.productId && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return apiJson(ctx, { error: "No valid quote items provided" }, { status: 400 });
    }

    const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, wholesalePrice: true, retailPrice: true },
    });
    const priceByProduct = new Map<string, number>(
      products.map((p: Pick<Product, "id" | "wholesalePrice" | "retailPrice">) => [p.id, Number(p.wholesalePrice || p.retailPrice || 0)])
    );

    const quoteItems = normalizedItems.map((item: { productId: string; variantId: string | null; quantity: number }) => {
      const unitPrice = Number(priceByProduct.get(item.productId) || 0);
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      };
    });

    const total = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const quote = await prisma.quote.create({
      data: {
        userId: user.id,
        status: "SUBMITTED",
        notes: body.notes?.trim() || null,
        total,
        items: {
          create: quoteItems,
        },
      },
      include: { items: true },
    });

    return apiJson(ctx, { quote }, { status: 201 });
  } catch (error) {
    logApiError(baseCtx, "Failed to submit quote", error);
    return apiJson(baseCtx, { error: "Failed to submit quote" }, { status: 500 });
  }
}

