import { NextRequest } from "next/server";
import { getDynamicPrice } from "@/lib/pricing.dynamic";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/dynamic-pricing");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      basePrice?: number;
      accountType?: "RETAIL" | "WHOLESALE" | "HYBRID";
      quantity?: number;
      hasActiveCampaign?: boolean;
      loyaltyTier?: "NONE" | "BRONZE" | "SILVER" | "GOLD";
    };

    const price = getDynamicPrice({
      basePrice: Number(body.basePrice || 0),
      accountType: body.accountType || "RETAIL",
      quantity: Number(body.quantity || 1),
      hasActiveCampaign: Boolean(body.hasActiveCampaign),
      loyaltyTier: body.loyaltyTier || "NONE",
    });

    return apiJson(ctx, { price });
  } catch (error) {
    logApiError(ctx, "Failed to compute dynamic price", error);
    return apiJson(ctx, { error: "Failed to compute dynamic price" }, { status: 500 });
  }
}
