import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTrackedEvents } from "@/lib/analytics.events";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

type EventLike = { name: string };

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/reports");
  try {
    const days = Math.max(1, Math.min(120, Number(req.nextUrl.searchParams.get("days") || 30)));
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [paidOrders, allOrders, quotes, users] = await Promise.all([
      prisma.order.count({ where: { status: "PAID", createdAt: { gte: from } } }),
      prisma.order.count({ where: { createdAt: { gte: from } } }),
      prisma.quote.count({ where: { createdAt: { gte: from } } }),
      prisma.user.count(),
    ]);

    const events = await getTrackedEvents(500);
    const funnel = {
      product_view: events.filter((event: EventLike) => event.name === "product_view").length,
      add_to_bag: events.filter((event: EventLike) => event.name === "add_to_bag").length,
      begin_checkout: events.filter((event: EventLike) => event.name === "begin_checkout").length,
      purchase: events.filter((event: EventLike) => event.name === "purchase").length,
    };

    return apiJson(ctx, {
      periodDays: days,
      summary: {
        users,
        allOrders,
        paidOrders,
        quotes,
        conversionRate: allOrders > 0 ? Math.round((paidOrders / allOrders) * 10000) / 100 : 0,
      },
      funnel,
    });
  } catch (error) {
    logApiError(ctx, "Failed to generate reports", error);
    return apiJson(ctx, { error: "Failed to generate reports" }, { status: 500 });
  }
}
