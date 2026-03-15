import { prisma } from "@/lib/db/prisma";
import type { ApiLogEvent, ApiLogLevel } from "@/lib/utils/api-observability-store";
import type { Prisma } from "@prisma/client";

const OBS_EVENT_NAME = "api_observability";
const RETENTION_KEY = "observability.retentionHours";
const DEFAULT_RETENTION_HOURS = 24;

function normalizeRetentionHours(raw: number) {
  if (!Number.isFinite(raw)) return DEFAULT_RETENTION_HOURS;
  return Math.max(1, Math.min(24 * 30, Math.floor(raw)));
}

export async function getPersistedRetentionHours() {
  const setting = await prisma.setting.findUnique({ where: { key: RETENTION_KEY } });
  if (!setting) return DEFAULT_RETENTION_HOURS;
  return normalizeRetentionHours(Number(setting.value));
}

export async function setPersistedRetentionHours(hours: number) {
  const safe = normalizeRetentionHours(hours);
  await prisma.setting.upsert({
    where: { key: RETENTION_KEY },
    create: { key: RETENTION_KEY, value: String(safe) },
    update: { value: String(safe) },
  });
  return safe;
}

export async function persistApiLogEvent(event: ApiLogEvent) {
  await prisma.analyticsEvent.create({
    data: {
      name: OBS_EVENT_NAME,
      userId: event.userId || null,
      sessionId: event.requestId || null,
      path: event.route,
      ip: event.ip || null,
      metadata: {
        level: event.level,
        route: event.route,
        method: event.method || null,
        message: event.message,
        data: event.data || null,
        requestId: event.requestId || null,
        timestamp: event.timestamp,
      },
      createdAt: new Date(event.timestamp),
    },
  });
}

export async function cleanupExpiredPersistedEvents(retentionHours: number) {
  const cutoff = new Date(Date.now() - normalizeRetentionHours(retentionHours) * 60 * 60 * 1000);
  const result = await prisma.analyticsEvent.deleteMany({
    where: {
      name: OBS_EVENT_NAME,
      createdAt: { lt: cutoff },
    },
  });
  return { removed: result.count, cutoff };
}

export async function clearPersistedApiLogEvents() {
  const result = await prisma.analyticsEvent.deleteMany({
    where: { name: OBS_EVENT_NAME },
  });
  return { removed: result.count };
}

export async function listPersistedApiLogEvents(params?: {
  limit?: number;
  level?: ApiLogLevel | "all";
  route?: string;
  q?: string;
  retentionHours?: number;
}) {
  const limit = Math.max(1, Math.min(Number(params?.limit || 200), 1000));
  const level = params?.level || "all";
  const routeFilter = (params?.route || "").trim().toLowerCase();
  const q = (params?.q || "").trim().toLowerCase();
  const retentionHours = normalizeRetentionHours(Number(params?.retentionHours || DEFAULT_RETENTION_HOURS));
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

  const rows = await prisma.analyticsEvent.findMany({
    where: {
      name: OBS_EVENT_NAME,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(2000, limit * 5),
  });

  type AnalyticsEventRow = Prisma.AnalyticsEventGetPayload<Record<string, never>>;
  const mapped: ApiLogEvent[] = rows.map((row: AnalyticsEventRow) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return {
      timestamp: row.createdAt.toISOString(),
      level: (metadata.level as ApiLogLevel) || "info",
      route: String(metadata.route || row.path || ""),
      method: metadata.method ? String(metadata.method) : undefined,
      requestId: row.sessionId || undefined,
      ip: row.ip || undefined,
      userId: row.userId || null,
      message: String(metadata.message || row.name),
      data: (metadata.data as Record<string, unknown> | undefined) || undefined,
    };
  });

  const filtered = mapped.filter((event) => {
    if (level !== "all" && event.level !== level) return false;
    if (routeFilter && !event.route.toLowerCase().includes(routeFilter)) return false;
    if (q) {
      const hay = `${event.message} ${event.route} ${event.requestId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return filtered.slice(0, limit);
}
