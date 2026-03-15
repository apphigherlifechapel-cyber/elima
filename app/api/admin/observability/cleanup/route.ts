import { NextRequest } from "next/server";
import { getPersistedRetentionHours, cleanupExpiredPersistedEvents } from "@/lib/utils/api-observability-db";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/admin/observability/cleanup");
  try {
    const configuredSecret = process.env.CRON_SECRET;
    if (!configuredSecret) {
      return apiJson(ctx, { error: "CRON_SECRET is not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token !== configuredSecret) {
      return apiJson(ctx, { error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { retentionHours?: number };
    const retentionHours = Number(body.retentionHours || 0) > 0 ? Number(body.retentionHours) : await getPersistedRetentionHours();
    const result = await cleanupExpiredPersistedEvents(retentionHours);

    return apiJson(ctx, {
      ok: true,
      retentionHours,
      removed: result.removed,
      cutoff: result.cutoff.toISOString(),
    });
  } catch (error) {
    logApiError(ctx, "Observability cleanup failed", error);
    return apiJson(ctx, { error: "Observability cleanup failed" }, { status: 500 });
  }
}
