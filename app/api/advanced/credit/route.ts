import { NextRequest } from "next/server";
import { getCreditProfile, setCreditProfile, evaluateCreditAvailability } from "@/lib/credit-engine";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/credit");
  try {
    const userId = String(req.nextUrl.searchParams.get("userId") || "");
    if (!userId) return apiJson(ctx, { error: "userId required" }, { status: 400 });
    return apiJson(ctx, { profile: await getCreditProfile(userId) });
  } catch (error) {
    logApiError(ctx, "Failed to load credit profile", error);
    return apiJson(ctx, { error: "Failed to load credit profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/credit");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: "set" | "evaluate";
      userId?: string;
      limit?: number;
      used?: number;
      termsDays?: 15 | 30;
      active?: boolean;
      amount?: number;
    };

    if (!body.userId) return apiJson(ctx, { error: "userId required" }, { status: 400 });

    if (body.action === "evaluate") {
      return apiJson(ctx, { result: await evaluateCreditAvailability(body.userId, Number(body.amount || 0)) });
    }

    const profile = await setCreditProfile({
      userId: body.userId,
      limit: Number(body.limit || 0),
      used: Number(body.used || 0),
      termsDays: body.termsDays || 30,
      active: body.active ?? true,
    });

    return apiJson(ctx, { profile });
  } catch (error) {
    logApiError(ctx, "Failed to update credit profile", error);
    return apiJson(ctx, { error: "Failed to update credit profile" }, { status: 500 });
  }
}
