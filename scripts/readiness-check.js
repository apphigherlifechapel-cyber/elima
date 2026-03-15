import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REQUIRED_ALWAYS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
const REQUIRED_PRODUCTION = ["PAYSTACK_SECRET_KEY", "PAYSTACK_WEBHOOK_SECRET", "CRON_SECRET"];
const RECOMMENDED = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL"];

function isMissing(name) {
  const value = process.env[name];
  return !value || !String(value).trim();
}

function getEnvReadiness() {
  const missingRequired = [...REQUIRED_ALWAYS].filter(isMissing);
  const missingRecommended = [...RECOMMENDED].filter(isMissing);
  const warnings = [];

  if (process.env.NODE_ENV === "production") {
    for (const name of REQUIRED_PRODUCTION) {
      if (isMissing(name)) missingRequired.push(name);
    }
  }

  if ((isMissing("UPSTASH_REDIS_REST_URL") || isMissing("UPSTASH_REDIS_REST_TOKEN")) && isMissing("REDIS_URL")) {
    warnings.push("No Redis provider configured. Rate limiting falls back to in-memory mode.");
  }

  if (!isMissing("NEXTAUTH_SECRET") && String(process.env.NEXTAUTH_SECRET).includes("change-in-prod") && process.env.NODE_ENV === "production") {
    warnings.push("NEXTAUTH_SECRET appears to be a placeholder. Rotate for production.");
  }

  return { missingRequired, missingRecommended, warnings };
}

async function main() {
  const env = getEnvReadiness();
  let dbOk = false;
  let dbError = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error) {
    dbOk = false;
    dbError = error instanceof Error ? error.message : "Database connection failed";
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  const ready = env.missingRequired.length === 0 && dbOk;
  const report = {
    ready,
    timestamp: new Date().toISOString(),
    checks: {
      env: { ok: env.missingRequired.length === 0, ...env },
      database: { ok: dbOk, error: dbError },
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (!ready) process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ready: false,
      error: error instanceof Error ? error.message : "Readiness check failed",
    })
  );
  process.exit(1);
});
