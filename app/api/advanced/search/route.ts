import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runSmartSearch, type SearchProduct } from "@/lib/search.engine";
import type { Prisma } from "@prisma/client";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/search");
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("limit") || 20)));

    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      include: { brand: true, category: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    });

    type SearchProductRecord = Prisma.ProductGetPayload<{ include: { brand: true; category: true } }>;

    const mapped: SearchProduct[] = products.map((product: SearchProductRecord) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      brandName: product.brand?.name || null,
      categoryName: product.category?.name || null,
      retailPrice: Number(product.retailPrice),
      stockTotal: product.stockTotal,
      isWholesale: product.isWholesale,
      createdAt: product.createdAt,
    }));

    const ranked = runSmartSearch(q, mapped).slice(0, limit);
    return apiJson(ctx, { query: q, results: ranked });
  } catch (error) {
    logApiError(ctx, "Failed to run search", error);
    return apiJson(ctx, { error: "Search failed" }, { status: 500 });
  }
}
