import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/vendor/products");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: { vendor: true }
    });

    if (!user?.vendor) return apiJson(baseCtx, { error: "Vendor profile not found" }, { status: 403 });
    const ctx = withUserContext(baseCtx, user.id);

    const products = await prisma.product.findMany({
      where: { vendorId: user.vendor.id },
      include: { images: true, category: true },
      orderBy: { createdAt: "desc" }
    });

    return apiJson(ctx, { products });
  } catch (error) {
    logApiError(baseCtx, "Failed to load vendor products", error);
    return apiJson(baseCtx, { error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/vendor/products");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: { vendor: true }
    });

    if (!user?.vendor || !user.vendor.isVerified) {
       return apiJson(baseCtx, { error: "Unverified vendor profile" }, { status: 403 });
    }
    const ctx = withUserContext(baseCtx, user.id);

    const body = await req.json();
    const { title, description, categoryId, retailPrice, wholesalePrice, stockTotal } = body;

    const product = await prisma.product.create({
      data: {
        title,
        description,
        slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        categoryId,
        retailPrice: Number(retailPrice),
        wholesalePrice: Number(wholesalePrice),
        stockTotal: Number(stockTotal),
        vendorId: user.vendor.id,
        isRetail: true,
        isWholesale: true,
        isAvailable: true,
      }
    });

    return apiJson(ctx, { product }, { status: 201 });
  } catch (error) {
    logApiError(baseCtx, "Failed to create vendor product", error);
    return apiJson(baseCtx, { error: "Internal Server Error" }, { status: 500 });
  }
}
