import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";
import { getEnvReadiness } from "@/lib/config/readiness";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/readiness");
  try {
    const env = getEnvReadiness();

    let dbOk = false;
    let dbError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (error) {
      dbOk = false;
      dbError = error instanceof Error ? error.message : "Database connection failed";
    }

    const ready = env.missingRequired.length === 0 && dbOk;
    return apiJson(
      ctx,
      {
        ready,
        timestamp: new Date().toISOString(),
        checks: {
          env: {
            ok: env.missingRequired.length === 0,
            ...env,
          },
          database: {
            ok: dbOk,
            error: dbError,
          },
        },
      },
      { status: ready ? 200 : 503 }
    );
  } catch (error) {
    logApiError(ctx, "Readiness check failed", error);
    return apiJson(ctx, { ready: false, error: "Readiness check failed" }, { status: 500 });
  }
}
