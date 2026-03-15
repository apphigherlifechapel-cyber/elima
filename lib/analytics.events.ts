import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type TrackEventInput = {
  name: string;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackEvent(input: TrackEventInput) {
  let ip: string | null = null;
  let path: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for") || h.get("x-real-ip") || null;
    path = h.get("x-invoke-path") || null;
  } catch {
    // In tests or non-request contexts, headers() is unavailable. Persist event without request metadata.
  }

  await prisma.analyticsEvent.create({
    data: {
      name: input.name,
      userId: input.userId || null,
      sessionId: input.sessionId || null,
      metadata: input.metadata || {},
      path,
      ip,
    },
  });
}

export async function getTrackedEvents(limit = 200) {
  const safeLimit = Math.max(1, Math.min(limit, 2000));
  const events = await prisma.analyticsEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  type AnalyticsEventRow = Prisma.AnalyticsEventGetPayload<Record<string, never>>;

  return events.map((event: AnalyticsEventRow) => ({
    name: event.name,
    userId: event.userId,
    sessionId: event.sessionId,
    metadata: (event.metadata as Record<string, unknown> | null) || {},
    at: event.createdAt.toISOString(),
    path: event.path,
    ip: event.ip,
  }));
}
