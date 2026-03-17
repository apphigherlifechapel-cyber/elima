import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";
import { clearApiLogEvents, getApiLogSettings, listApiLogEvents, setApiLogRetentionHours } from "@/lib/utils/api-observability-store";
import {
  cleanupExpiredPersistedEvents,
  clearPersistedApiLogEvents,
  getPersistedRetentionHours,
  listPersistedApiLogEvents,
  setPersistedRetentionHours,
} from "@/lib/utils/api-observability-db";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/observability");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const limit = Math.max(1, Math.min(1000, Number(req.nextUrl.searchParams.get("limit") || 200)));
    const level = (req.nextUrl.searchParams.get("level") || "all") as "all" | "info" | "warn" | "error" | "alert";
    const route = req.nextUrl.searchParams.get("route") || "";
    const q = req.nextUrl.searchParams.get("q") || "";
    const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();
    const download = req.nextUrl.searchParams.get("download") === "1";

    let retentionHours = await getPersistedRetentionHours();
    await cleanupExpiredPersistedEvents(retentionHours);

    let events = await listPersistedApiLogEvents({ limit, level, route, q, retentionHours });
    if (events.length === 0) {
      const memory = listApiLogEvents({ limit, level, route, q });
      events = memory;
      retentionHours = Math.max(1, Math.round(getApiLogSettings().retentionMs / (60 * 60 * 1000)));
    }
    const totals = {
      info: events.filter((e) => e.level === "info").length,
      warn: events.filter((e) => e.level === "warn").length,
      error: events.filter((e) => e.level === "error").length,
      alert: events.filter((e) => e.level === "alert").length,
    };

    if (format === "csv") {
      const escapeCsv = (value: unknown) => {
        const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
        const escaped = raw.replace(/"/g, "\"\"");
        return `"${escaped}"`;
      };

      const header = ["timestamp", "level", "route", "method", "message", "requestId", "userId", "ip", "data"].join(",");
      const rows = events.map((event) =>
        [
          escapeCsv(event.timestamp),
          escapeCsv(event.level),
          escapeCsv(event.route),
          escapeCsv(event.method || ""),
          escapeCsv(event.message),
          escapeCsv(event.requestId || ""),
          escapeCsv(event.userId || ""),
          escapeCsv(event.ip || ""),
          escapeCsv(event.data || {}),
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");
      const headers = new Headers({
        "content-type": "text/csv; charset=utf-8",
        "x-request-id": ctx.requestId,
      });
      if (download) {
        headers.set("content-disposition", "attachment; filename=observability-events.csv");
      }
      return new NextResponse(csv, { status: 200, headers });
    }

    return apiJson(ctx, {
      totals,
      events,
      settings: { ...getApiLogSettings(), retentionHours, source: "database" },
      filters: { limit, level, route, q },
    });
  } catch (error) {
    logApiError(baseCtx, "Failed to load observability events", error);
    return apiJson(baseCtx, { error: "Failed to load observability events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/observability");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "setRetention" | "clearLogs" | "runCleanup";
      retentionHours?: number;
      confirm?: string;
    };

    if (body.action === "setRetention") {
      const retentionHours = Number(body.retentionHours || 24);
      setApiLogRetentionHours(retentionHours);
      const persistedHours = await setPersistedRetentionHours(retentionHours);
      await cleanupExpiredPersistedEvents(persistedHours);
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "OBS_RETENTION_UPDATE",
          entity: "Observability",
          entityId: "api-log-store",
          changes: JSON.stringify({ retentionHours: persistedHours }),
        },
      });
      return apiJson(ctx, {
        ok: true,
        settings: { ...getApiLogSettings(), retentionHours: persistedHours },
      });
    }

    if (body.action === "clearLogs") {
      if (body.confirm !== "CLEAR") {
        return apiJson(ctx, { error: "Confirmation required. Send confirm='CLEAR'" }, { status: 400 });
      }
      const result = clearApiLogEvents();
      const persisted = await clearPersistedApiLogEvents();
      const removed = (result.removed || 0) + (persisted.removed || 0);
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "OBS_LOGS_CLEAR",
          entity: "Observability",
          entityId: "api-log-store",
          changes: JSON.stringify({ removed }),
        },
      });
      return apiJson(ctx, { ok: true, removed, settings: getApiLogSettings() });
    }

    if (body.action === "runCleanup") {
      const retentionHours = Number(body.retentionHours || 0) > 0 ? Number(body.retentionHours) : await getPersistedRetentionHours();
      const result = await cleanupExpiredPersistedEvents(retentionHours);
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "OBS_CLEANUP_RUN",
          entity: "Observability",
          entityId: "api-log-store",
          changes: JSON.stringify({ retentionHours, removed: result.removed, cutoff: result.cutoff.toISOString() }),
        },
      });
      return apiJson(ctx, {
        ok: true,
        removed: result.removed,
        cutoff: result.cutoff.toISOString(),
        retentionHours,
      });
    }

    return apiJson(ctx, { error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    logApiError(baseCtx, "Failed to mutate observability settings", error);
    return apiJson(baseCtx, { error: "Failed to update observability settings" }, { status: 500 });
  }
}
