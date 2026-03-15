import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { getApiLogSettings, listApiLogEvents } from "@/lib/utils/api-observability-store";
import { getPersistedRetentionHours, listPersistedApiLogEvents } from "@/lib/utils/api-observability-db";
import Link from "next/link";
import ObservabilityControls from "@/components/admin/ObservabilityControls";

type SearchParams = {
  level?: string;
  route?: string;
  q?: string;
  limit?: string;
};

type ObservabilityPageProps = {
  searchParams?: Promise<SearchParams>;
};

type ObsEvent = {
  timestamp: string;
  level: "info" | "warn" | "error" | "alert";
  route: string;
  method?: string;
  requestId?: string;
  ip?: string;
  userId?: string | null;
  message: string;
  data?: Record<string, unknown>;
};

type CleanupAudit = {
  action: string;
  createdAt: Date;
  changes: string | null;
  user: { email: string } | null;
};

const levelTone: Record<ObsEvent["level"], string> = {
  info: "bg-sky-100 text-sky-700 border-sky-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
  alert: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
};

function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseCleanupChanges(raw: string | null) {
  if (!raw) return { removed: 0, retentionHours: null as number | null, cutoff: null as string | null };
  try {
    const parsed = JSON.parse(raw) as { removed?: number; retentionHours?: number; cutoff?: string };
    return {
      removed: Number(parsed.removed || 0),
      retentionHours: typeof parsed.retentionHours === "number" ? parsed.retentionHours : null,
      cutoff: typeof parsed.cutoff === "string" ? parsed.cutoff : null,
    };
  } catch {
    return { removed: 0, retentionHours: null as number | null, cutoff: null as string | null };
  }
}

function parseAuditChanges(raw: string | null) {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildMinuteBuckets(events: ObsEvent[], points = 24) {
  const now = Date.now();
  const bucketMs = 5 * 60 * 1000;
  const buckets = Array.from({ length: points }, (_, index) => {
    const start = now - bucketMs * (points - index);
    const end = start + bucketMs;
    return { label: new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), start, end, count: 0 };
  });

  for (const event of events) {
    const at = new Date(event.timestamp).getTime();
    const hit = buckets.find((bucket) => at >= bucket.start && at < bucket.end);
    if (hit) hit.count += 1;
  }

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return { buckets, max };
}

export default async function AdminObservabilityPage({ searchParams }: ObservabilityPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return <div className="p-8">Unauthorized</div>;

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") return <div className="p-8">Forbidden</div>;

  const params = (await searchParams) || {};
  const level = (params.level || "all").toLowerCase();
  const route = params.route || "";
  const q = params.q || "";
  const limit = Math.max(20, Math.min(500, Number(params.limit || 200)));

  let events = (await listPersistedApiLogEvents({
    limit,
    level: level as "all" | "info" | "warn" | "error" | "alert",
    route,
    q,
    retentionHours: await getPersistedRetentionHours(),
  })) as ObsEvent[];
  if (events.length === 0) {
    events = listApiLogEvents({
      limit,
      level: (level as "all" | "info" | "warn" | "error" | "alert"),
      route,
      q,
    }) as ObsEvent[];
  }
  const totals = {
    info: events.filter((e) => e.level === "info").length,
    warn: events.filter((e) => e.level === "warn").length,
    error: events.filter((e) => e.level === "error").length,
    alert: events.filter((e) => e.level === "alert").length,
  };
  const settings = getApiLogSettings();
  const persistedRetentionHours = await getPersistedRetentionHours();
  const retentionHours = Math.max(1, persistedRetentionHours || Math.round(settings.retentionMs / (60 * 60 * 1000)));
  const cleanupHistory = (await prisma.adminAuditLog.findMany({
    where: {
      action: { in: ["OBS_CLEANUP_RUN", "OBS_LOGS_CLEAR", "OBS_RETENTION_UPDATE"] },
      entity: "Observability",
    },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } },
    take: 10,
  })) as CleanupAudit[];
  const latestCleanup = cleanupHistory.find((row) => row.action === "OBS_CLEANUP_RUN") || null;
  const latestCleanupData = parseCleanupChanges(latestCleanup?.changes || null);
  const topRoutes = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      acc[event.route] = (acc[event.route] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const errorHotspots = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      if (["warn", "error", "alert"].includes(event.level)) {
        acc[event.route] = (acc[event.route] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const trend = buildMinuteBuckets(events, 24);
  const filterParams = new URLSearchParams({
    level,
    route,
    q,
    limit: String(limit),
  }).toString();

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Ops</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Observability</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Live request logs, warnings, errors, and alert thresholds.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Info</p><p className="mt-2 text-2xl font-black">{totals.info}</p></div>
        <div className="soft-card rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Warn</p><p className="mt-2 text-2xl font-black">{totals.warn}</p></div>
        <div className="soft-card rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Error</p><p className="mt-2 text-2xl font-black">{totals.error}</p></div>
        <div className="soft-card rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Alert</p><p className="mt-2 text-2xl font-black">{totals.alert}</p></div>
      </section>

      <section className="soft-card rounded-2xl p-4">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Last Cleanup Run</h2>
        {latestCleanup ? (
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[11px] text-[var(--muted-foreground)]">Time</p>
              <p className="text-sm font-bold">{latestCleanup.createdAt.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[11px] text-[var(--muted-foreground)]">Actor</p>
              <p className="text-sm font-bold">{latestCleanup.user?.email || "system"}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[11px] text-[var(--muted-foreground)]">Removed</p>
              <p className="text-sm font-bold">{latestCleanupData.removed}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[11px] text-[var(--muted-foreground)]">Retention</p>
              <p className="text-sm font-bold">{latestCleanupData.retentionHours ? `${latestCleanupData.retentionHours}h` : `${retentionHours}h`}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No cleanup run recorded yet.</p>
        )}
      </section>

      <section className="soft-card rounded-2xl p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <select name="level" defaultValue={level} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm">
            <option value="all">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="alert">Alert</option>
          </select>
          <input name="route" defaultValue={route} placeholder="Route contains..." className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <input name="q" defaultValue={q} placeholder="Search message/requestId..." className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <button className="btn-primary">Apply Filters</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/api/admin/observability?${filterParams}&format=json`} className="btn-secondary text-xs">Open JSON</Link>
          <Link href={`/api/admin/observability?${filterParams}&format=csv`} className="btn-secondary text-xs">Open CSV</Link>
          <Link href={`/api/admin/observability?${filterParams}&format=csv&download=1`} className="btn-secondary text-xs">Download CSV</Link>
        </div>
      </section>

      <ObservabilityControls initialRetentionHours={retentionHours} />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Request Trend (5-min buckets)</h2>
          <div className="mt-4 flex h-40 items-end gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-2">
            {trend.buckets.map((bucket) => {
              const heightPct = Math.max(4, Math.round((bucket.count / trend.max) * 100));
              return (
                <div key={bucket.label} className="group flex-1">
                  <div className="w-full rounded-sm bg-[var(--primary)]/80 transition-all group-hover:bg-[var(--primary)]" style={{ height: `${heightPct}%` }} title={`${bucket.label}: ${bucket.count}`} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--muted-foreground)]">
            <span>{trend.buckets[0]?.label}</span>
            <span>{trend.buckets[trend.buckets.length - 1]?.label}</span>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Top Routes</h2>
          <div className="mt-3 space-y-2">
            {topRoutes.map(([routeName, count]) => (
              <div key={routeName} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                <p className="font-mono text-xs">{routeName}</p>
                <p className="text-sm font-black">{count} events</p>
              </div>
            ))}
            {topRoutes.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No events yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Error Hotspots</h2>
          <div className="mt-3 space-y-2">
            {errorHotspots.map(([routeName, count]) => (
              <div key={routeName} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="font-mono text-xs text-rose-700">{routeName}</p>
                <p className="text-sm font-black text-rose-700">{count} warn/error/alert events</p>
              </div>
            ))}
            {errorHotspots.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No warning/error hotspots in this filter window.</p> : null}
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Cleanup History</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {cleanupHistory.map((row) => {
                  const details = parseAuditChanges(row.changes);
                  const removed = typeof details.removed === "number" ? details.removed : undefined;
                  const retention = typeof details.retentionHours === "number" ? details.retentionHours : undefined;
                  return (
                    <tr key={`${row.action}-${row.createdAt.toISOString()}`} className="border-t border-[var(--border-soft)] align-top">
                      <td className="px-2 py-3 whitespace-nowrap">{row.createdAt.toLocaleString()}</td>
                      <td className="px-2 py-3">
                        <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[11px] font-bold">
                          {row.action}
                        </span>
                      </td>
                      <td className="px-2 py-3">{row.user?.email || "system"}</td>
                      <td className="px-2 py-3 text-xs text-[var(--muted-foreground)]">
                        {removed !== undefined ? `removed=${removed}` : ""}
                        {removed !== undefined && retention !== undefined ? ", " : ""}
                        {retention !== undefined ? `retention=${retention}h` : ""}
                        {removed === undefined && retention === undefined ? "-" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {cleanupHistory.length === 0 ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">No cleanup history yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Level</th>
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">Message</th>
                <th className="px-2 py-2">Request</th>
                <th className="px-2 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={`${event.timestamp}-${event.requestId}-${event.message}`} className="border-t border-[var(--border-soft)] align-top">
                  <td className="px-2 py-3 whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="px-2 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${levelTone[event.level]}`}>{event.level}</span>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs">{event.method ? `${event.method} ` : ""}{event.route}</td>
                  <td className="px-2 py-3">{event.message}</td>
                  <td className="px-2 py-3 font-mono text-[11px]">{event.requestId || "-"}</td>
                  <td className="px-2 py-3 font-mono text-[11px] text-[var(--muted-foreground)] max-w-[360px] truncate">{event.data ? safeSerialize(event.data) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
