import { NextRequest } from "next/server";
import { assessCheckoutRisk } from "@/lib/risk.engine";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/risk");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      subtotal?: number;
      itemCount?: number;
      isGuest?: boolean;
      shippingCountry?: string;
      email?: string;
    };

    const result = assessCheckoutRisk({
      subtotal: Number(body.subtotal || 0),
      itemCount: Number(body.itemCount || 0),
      isGuest: Boolean(body.isGuest),
      shippingCountry: String(body.shippingCountry || ""),
      email: body.email,
    });

    return apiJson(ctx, result);
  } catch (error) {
    logApiError(ctx, "Failed to assess checkout risk", error);
    return apiJson(ctx, { error: "Failed to assess risk" }, { status: 500 });
  }
}
