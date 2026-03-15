type ReadinessReport = {
  missingRequired: string[];
  missingRecommended: string[];
  warnings: string[];
};

const REQUIRED_ALWAYS: string[] = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
const REQUIRED_PRODUCTION: string[] = ["PAYSTACK_SECRET_KEY", "PAYSTACK_WEBHOOK_SECRET", "CRON_SECRET"];
const RECOMMENDED: string[] = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL"];

function isMissing(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name];
  return !value || !value.trim();
}

export function getEnvReadiness(env: NodeJS.ProcessEnv = process.env): ReadinessReport {
  const missingRequired = [...REQUIRED_ALWAYS].filter((name) => isMissing(name, env));
  const missingRecommended = [...RECOMMENDED].filter((name) => isMissing(name, env));
  const warnings: string[] = [];

  if (env.NODE_ENV === "production") {
    for (const name of REQUIRED_PRODUCTION) {
      if (isMissing(name, env)) missingRequired.push(name);
    }
  }

  if ((isMissing("UPSTASH_REDIS_REST_URL", env) || isMissing("UPSTASH_REDIS_REST_TOKEN", env)) && isMissing("REDIS_URL", env)) {
    warnings.push("No Redis provider configured. Rate limiting falls back to in-memory mode.");
  }

  if (!isMissing("NEXTAUTH_SECRET", env) && String(env.NEXTAUTH_SECRET).includes("change-in-prod") && env.NODE_ENV === "production") {
    warnings.push("NEXTAUTH_SECRET appears to be a placeholder. Rotate for production.");
  }

  return {
    missingRequired,
    missingRecommended,
    warnings,
  };
}
