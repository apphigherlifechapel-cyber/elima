import { NextRequest } from "next/server";
import { apiJson, createApiContext } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/health");
  return apiJson(ctx, {
    ok: true,
    service: "elima-store",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    env: process.env.NODE_ENV || "development",
  });
}
