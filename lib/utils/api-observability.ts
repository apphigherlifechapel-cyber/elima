import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/utils/rate-limit";
import { addApiLogEvent } from "@/lib/utils/api-observability-store";
import { persistApiLogEvent } from "@/lib/utils/api-observability-db";

type LogLevel = "info" | "warn" | "error";

type ApiContext = {
  route: string;
  method: string;
  requestId: string;
  ip: string;
  userId?: string;
};

type AlertCounter = {
  count: number;
  resetAt: number;
};

const alertCounters = new Map<string, AlertCounter>();

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const alertThreshold = parseIntEnv("API_LOG_ALERT_THRESHOLD", 5);
const alertWindowMs = parseIntEnv("API_LOG_ALERT_WINDOW_MS", 60_000);

function maybeEmitAlert(level: LogLevel, ctx: ApiContext, message: string) {
  if (level === "info") return;

  const now = Date.now();
  const key = `${ctx.route}:${level}:${message}`;
  const existing = alertCounters.get(key);

  if (!existing || existing.resetAt <= now) {
    alertCounters.set(key, { count: 1, resetAt: now + alertWindowMs });
    return;
  }

  existing.count += 1;
  alertCounters.set(key, existing);

  if (existing.count === alertThreshold) {
    const alertPayload = {
      timestamp: new Date().toISOString(),
      level: "alert",
      route: ctx.route,
      requestId: ctx.requestId,
      ip: ctx.ip,
      message: "API alert threshold reached",
      alertType: level,
      alertMessage: message,
      threshold: alertThreshold,
      windowMs: alertWindowMs,
    };
    console.error(alertPayload);
    addApiLogEvent({
      timestamp: alertPayload.timestamp,
      level: "alert",
      route: ctx.route,
      requestId: ctx.requestId,
      ip: ctx.ip,
      message: "API alert threshold reached",
      data: {
        alertType: level,
        alertMessage: message,
        threshold: alertThreshold,
        windowMs: alertWindowMs,
      },
    });
    persistEventAsync({
      timestamp: alertPayload.timestamp,
      level: "alert",
      route: ctx.route,
      requestId: ctx.requestId,
      ip: ctx.ip,
      message: "API alert threshold reached",
      data: {
        alertType: level,
        alertMessage: message,
        threshold: alertThreshold,
        windowMs: alertWindowMs,
      },
    });
  }
}

function persistEventAsync(event: {
  timestamp: string;
  level: "info" | "warn" | "error" | "alert";
  route: string;
  method?: string;
  requestId?: string;
  ip?: string;
  userId?: string | null;
  message: string;
  data?: Record<string, unknown>;
}) {
  void persistApiLogEvent(event).catch(() => {
    // best effort persistence, in-memory store remains primary fallback
  });
}

function safeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error", raw: error };
}

export function createApiContext(req: NextRequest, route: string): ApiContext {
  const providedRequestId = req.headers.get("x-request-id")?.trim();
  return {
    route,
    method: req.method,
    requestId: providedRequestId || crypto.randomUUID(),
    ip: getClientIp(req.headers),
  };
}

export function withUserContext(ctx: ApiContext, userId?: string): ApiContext {
  if (!userId) return ctx;
  return { ...ctx, userId };
}

export function logApi(level: LogLevel, ctx: ApiContext, message: string, extra?: Record<string, unknown>) {
  maybeEmitAlert(level, ctx, message);
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    route: ctx.route,
    method: ctx.method,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userId: ctx.userId || null,
    message,
    ...(extra || {}),
  };

  if (level === "error") {
    console.error(payload);
    addApiLogEvent({
      timestamp: payload.timestamp,
      level: "error",
      route: ctx.route,
      method: ctx.method,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userId: ctx.userId || null,
      message,
      data: extra,
    });
    persistEventAsync({
      timestamp: payload.timestamp,
      level: "error",
      route: ctx.route,
      method: ctx.method,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userId: ctx.userId || null,
      message,
      data: extra,
    });
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    addApiLogEvent({
      timestamp: payload.timestamp,
      level: "warn",
      route: ctx.route,
      method: ctx.method,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userId: ctx.userId || null,
      message,
      data: extra,
    });
    persistEventAsync({
      timestamp: payload.timestamp,
      level: "warn",
      route: ctx.route,
      method: ctx.method,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userId: ctx.userId || null,
      message,
      data: extra,
    });
    return;
  }

  console.info(payload);
  addApiLogEvent({
    timestamp: payload.timestamp,
    level: "info",
    route: ctx.route,
    method: ctx.method,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userId: ctx.userId || null,
    message,
    data: extra,
  });
  persistEventAsync({
    timestamp: payload.timestamp,
    level: "info",
    route: ctx.route,
    method: ctx.method,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userId: ctx.userId || null,
    message,
    data: extra,
  });
}

export function logApiError(ctx: ApiContext, message: string, error: unknown, extra?: Record<string, unknown>) {
  logApi("error", ctx, message, { error: safeError(error), ...(extra || {}) });
}

export function apiJson<T>(ctx: ApiContext, body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", ctx.requestId);
  return NextResponse.json(body, { ...init, headers });
}
