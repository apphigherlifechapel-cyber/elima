import { NextRequest } from "next/server";
import { createReturnRequest, listReturnRequests, updateReturnRequestStatus } from "@/lib/returns-engine";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/returns");
  try {
    const userId = String(req.nextUrl.searchParams.get("userId") || "");
    return apiJson(ctx, { requests: await listReturnRequests(userId || undefined) });
  } catch (error) {
    logApiError(ctx, "Failed to load return requests", error);
    return apiJson(ctx, { error: "Failed to load return requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/returns");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: "create" | "update";
      orderId?: string;
      userId?: string;
      reason?: string;
      id?: string;
      status?: "SUBMITTED" | "APPROVED" | "REJECTED" | "COMPLETED";
    };

    if (body.action === "update") {
      if (!body.id || !body.status) return apiJson(ctx, { error: "id and status required" }, { status: 400 });
      const updated = await updateReturnRequestStatus(body.id, body.status);
      if (!updated) return apiJson(ctx, { error: "Request not found" }, { status: 404 });
      return apiJson(ctx, { request: updated });
    }

    if (!body.orderId || !body.userId || !body.reason) {
      return apiJson(ctx, { error: "orderId, userId and reason are required" }, { status: 400 });
    }

    const request = await createReturnRequest({ orderId: body.orderId, userId: body.userId, reason: body.reason });
    return apiJson(ctx, { request });
  } catch (error) {
    logApiError(ctx, "Failed to mutate return requests", error);
    return apiJson(ctx, { error: "Failed to update return requests" }, { status: 500 });
  }
}
