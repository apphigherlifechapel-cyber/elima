import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/reviews");
  try {
    const productId = String(req.nextUrl.searchParams.get("productId") || "");
    if (!productId) {
      return apiJson(baseCtx, { error: "productId is required" }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const summary = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return apiJson(baseCtx, {
      reviews,
      averageRating: Number(summary._avg.rating ?? 0),
      count: summary._count._all,
    });
  } catch (error) {
    logApiError(baseCtx, "Failed to load reviews", error);
    return apiJson(baseCtx, { error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/reviews");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`reviews:${ip}`, 20, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many review submissions. Try again shortly." }, { status: 429 });
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
      productId?: string;
      rating?: number;
      title?: string;
      comment?: string;
    };

    if (!body.productId || !body.rating) {
      return apiJson(ctx, { error: "productId and rating are required" }, { status: 400 });
    }

    const rating = Math.max(1, Math.min(5, Math.floor(Number(body.rating))));
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return apiJson(ctx, { error: "Product not found" }, { status: 404 });

    const hasPurchased = await prisma.orderItem.count({
      where: {
        productId: body.productId,
        order: {
          userId: user.id,
          status: "PAID",
        },
      },
    });

    if (hasPurchased === 0) {
      return apiJson(ctx, { error: "Only customers who purchased this product can review" }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { userId: user.id, productId: body.productId },
    });

    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: {
            rating,
            title: body.title?.trim() || null,
            comment: body.comment?.trim() || null,
          },
        })
      : await prisma.review.create({
          data: {
            userId: user.id,
            productId: body.productId,
            rating,
            title: body.title?.trim() || null,
            comment: body.comment?.trim() || null,
          },
        });

    return apiJson(ctx, { review });
  } catch (error) {
    logApiError(baseCtx, "Failed to submit review", error);
    return apiJson(baseCtx, { error: "Failed to submit review" }, { status: 500 });
  }
}
