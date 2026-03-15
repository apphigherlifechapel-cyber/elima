import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";

type SegmentStats = {
  segment: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

type TopRecProduct = {
  productId: string;
  clicks: number;
  title: string;
};

type ProductLite = {
  id: string;
  title: string;
  slug: string;
};

function parseMetadata(metadata: unknown): { segment?: string; productId?: string } {
  if (!metadata || typeof metadata !== "object") return {};
  const raw = metadata as Record<string, unknown>;
  return {
    segment: typeof raw.segment === "string" ? raw.segment : undefined,
    productId: typeof raw.productId === "string" ? raw.productId : undefined,
  };
}

type AdminRecommendationsPageProps = {
  searchParams?: Promise<{ days?: string }>;
};

export default async function AdminRecommendationsPage({ searchParams }: AdminRecommendationsPageProps) {
  const validRanges = new Set([7, 30, 90]);
  const defaultDays = 30;
  const params = (await searchParams) || {};
  const requestedDays = Number(params.days || defaultDays);
  const days = validRanges.has(requestedDays) ? requestedDays : defaultDays;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const from = new Date();
  from.setDate(from.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: from },
      name: { in: ["recommendation_impression", "recommendation_click"] },
    },
    select: {
      name: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20000,
  });

  const segmentMap = new Map<string, { impressions: number; clicks: number }>();
  const clickByProduct = new Map<string, number>();

  for (const event of events) {
    const meta = parseMetadata(event.metadata);
    const segment = (meta.segment || "UNKNOWN").toUpperCase();

    if (!segmentMap.has(segment)) segmentMap.set(segment, { impressions: 0, clicks: 0 });
    const current = segmentMap.get(segment)!;

    if (event.name === "recommendation_impression") {
      current.impressions += 1;
    }

    if (event.name === "recommendation_click") {
      current.clicks += 1;
      if (meta.productId) {
        clickByProduct.set(meta.productId, (clickByProduct.get(meta.productId) || 0) + 1);
      }
    }
  }

  const segmentStats: SegmentStats[] = Array.from(segmentMap.entries())
    .map(([segment, counts]) => ({
      segment,
      impressions: counts.impressions,
      clicks: counts.clicks,
      ctr: counts.impressions > 0 ? Math.round((counts.clicks / counts.impressions) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const topProductIds = Array.from(clickByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);

  const products: ProductLite[] = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, title: true, slug: true } })
    : [];
  const productMap = new Map(products.map((p: ProductLite): [string, ProductLite] => [p.id, p]));

  const topProducts: TopRecProduct[] = topProductIds
    .map((id) => ({
      productId: id,
      clicks: clickByProduct.get(id) || 0,
      title: productMap.get(id)?.title || id,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const totalImpressions = segmentStats.reduce((sum, row) => sum + row.impressions, 0);
  const totalClicks = segmentStats.reduce((sum, row) => sum + row.clicks, 0);
  const totalCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Recommendations Intelligence</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Recommendation Performance</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Last {days} days: segment-level engagement and top recommendation clicks.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[7, 30, 90].map((range) => (
            <Link
              key={range}
              href={`/admin/recommendations?days=${range}`}
              className={`rounded-full px-3 py-1 text-xs font-black ${
                days === range
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {range}d
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Impressions</p>
          <p className="mt-2 text-2xl font-black">{totalImpressions}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Clicks</p>
          <p className="mt-2 text-2xl font-black">{totalClicks}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Global CTR</p>
          <p className="mt-2 text-2xl font-black">{totalCtr}%</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">CTR by Segment</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Segment</th>
                  <th className="px-2 py-2">Impressions</th>
                  <th className="px-2 py-2">Clicks</th>
                  <th className="px-2 py-2">CTR</th>
                </tr>
              </thead>
              <tbody>
                {segmentStats.map((row) => (
                  <tr key={row.segment} className="border-t border-[var(--border-soft)]">
                    <td className="px-2 py-3 font-semibold">{row.segment.replaceAll("_", " ")}</td>
                    <td className="px-2 py-3">{row.impressions}</td>
                    <td className="px-2 py-3">{row.clicks}</td>
                    <td className="px-2 py-3 font-black">{row.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Top Recommended Products</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Clicks</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row) => {
                  const p = productMap.get(row.productId);
                  return (
                    <tr key={row.productId} className="border-t border-[var(--border-soft)]">
                      <td className="px-2 py-3">{row.title}</td>
                      <td className="px-2 py-3 font-black">{row.clicks}</td>
                      <td className="px-2 py-3">
                        {p?.slug ? (
                          <Link href={`/product/${p.slug}`} className="btn-secondary text-xs">Open</Link>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
