import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/orders/track");
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");
    const email = req.nextUrl.searchParams.get("email");

    if (!orderId || !email) {
      return apiJson(ctx, { error: "orderId and email are required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true } },
        shipment: true,
        payment: true,
        items: true,
      },
    });

    if (!order || order.user.email?.toLowerCase() !== email.toLowerCase()) {
      return apiJson(ctx, { error: "Order not found" }, { status: 404 });
    }

    return apiJson(ctx, {
      order: {
        id: order.id,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        total: order.total,
        createdAt: order.createdAt,
        paymentStatus: order.payment?.status || null,
        shipmentStatus: order.shipment?.status || null,
        trackingNumber: order.shipment?.trackingNumber || null,
        itemCount: order.items.length,
      },
    });
  } catch (error) {
    logApiError(ctx, "Failed to track order", error);
    return apiJson(ctx, { error: "Failed to track order" }, { status: 500 });
  }
}


