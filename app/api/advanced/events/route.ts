import { NextRequest } from "next/server";
import { trackEvent, getTrackedEvents } from "@/lib/analytics.events";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/events");
  try {
    const limit = Math.max(1, Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 120)));
    const events = await getTrackedEvents(limit);
    return apiJson(ctx, { events });
  } catch (error) {
    logApiError(ctx, "Failed to load events", error);
    return apiJson(ctx, { error: "Failed to load events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/events");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.name) {
      return apiJson(ctx, { error: "Event name is required" }, { status: 400 });
    }

    await trackEvent({
      name: body.name,
      userId: body.userId,
      sessionId: body.sessionId,
      metadata: body.metadata || {},
    });

    return apiJson(ctx, { ok: true });
  } catch (error) {
    logApiError(ctx, "Failed to track event", error);
    return apiJson(ctx, { error: "Failed to track event" }, { status: 500 });
  }
}
