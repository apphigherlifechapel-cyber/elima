import "dotenv/config";
import { getPersistedRetentionHours, cleanupExpiredPersistedEvents } from "../lib/utils/api-observability-db";

async function main() {
  const arg = process.argv[2];
  const retentionHours = arg && Number(arg) > 0 ? Number(arg) : await getPersistedRetentionHours();
  const result = await cleanupExpiredPersistedEvents(retentionHours);

  // Keep output machine-friendly for schedulers.
  console.log(
    JSON.stringify({
      ok: true,
      retentionHours,
      removed: result.removed,
      cutoff: result.cutoff.toISOString(),
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "cleanup failed",
    })
  );
  process.exit(1);
});
