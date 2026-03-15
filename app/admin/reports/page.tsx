import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { AccountType, OrderType, QuoteStatus } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";

type OrderTypeCount = { type: OrderType; _count: { _all: number } };
type QuoteStatusCount = { status: QuoteStatus; _count: { _all: number } };
type AccountTypeCount = { accountType: AccountType; _count: { _all: number } };
  type TopProductRow = { productId: string; _sum: { quantity: number | null; totalPrice: number | null } };
  type PaidSummary = { _sum: { total: number | null }; _avg: { total: number | null }; _count: { _all: number } };
  type ProductLabel = { id: string; title: string };
  type AnalyticsCount = { name: string; _count: { _all: number } };

function tone(status: string) {
  if (["PAID", "APPROVED", "RETAIL", "WHOLESALE"].includes(status)) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (["PENDING", "REVIEWING"].includes(status)) return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(now.getDate() - 30);

  const [paidSummary, ordersByType, topProducts, quoteSummary, customerSummary, recommendationEvents]: [
    PaidSummary,
    OrderTypeCount[],
    TopProductRow[],
    QuoteStatusCount[],
    AccountTypeCount[],
    AnalyticsCount[]
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: last30 } },
      _sum: { total: true },
      _avg: { total: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["type"],
      _count: { _all: true },
      where: { createdAt: { gte: last30 } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
      where: {
        order: {
          createdAt: { gte: last30 },
          status: { in: ["PAID", "PENDING"] },
        },
      },
    }),
    prisma.quote.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: last30 } },
    }),
    prisma.user.groupBy({
      by: ["accountType"],
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      _count: { _all: true },
      where: {
        createdAt: { gte: last30 },
        name: { in: ["recommendation_impression", "recommendation_click"] },
      },
    }),
  ]);

  const productIds = topProducts.map((row) => row.productId);
  const productLabels: ProductLabel[] = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });
  const productMap = new Map(productLabels.map((p: ProductLabel) => [p.id, p.title]));
  const recImpressions = recommendationEvents.find((row) => row.name === "recommendation_impression")?._count._all ?? 0;
  const recClicks = recommendationEvents.find((row) => row.name === "recommendation_click")?._count._all ?? 0;
  const recCtr = recImpressions > 0 ? Math.round((recClicks / recImpressions) * 10000) / 100 : 0;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Insights</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Reports (Last 30 Days)</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Paid Orders</p>
          <p className="mt-2 text-2xl font-black">{paidSummary._count._all}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Revenue</p>
          <p className="mt-2 text-2xl font-black">{formatCedis(paidSummary._sum.total ?? 0)}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Average Order Value</p>
          <p className="mt-2 text-2xl font-black">{formatCedis(paidSummary._avg.total ?? 0)}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Recommendation Impressions</p>
          <p className="mt-2 text-2xl font-black">{recImpressions}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Recommendation Clicks</p>
          <p className="mt-2 text-2xl font-black">{recClicks}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Recommendation CTR</p>
          <p className="mt-2 text-2xl font-black">{recCtr}%</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Orders by Type</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {ordersByType.map((row) => (
              <span key={row.type} className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${tone(row.type)}`}>
                {row.type}: {row._count._all}
              </span>
            ))}
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Quotes by Status</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {quoteSummary.map((row) => (
              <span key={row.status} className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${tone(row.status)}`}>
                {row.status}: {row._count._all}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Top Products by Units</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Units</th>
                  <th className="px-2 py-2">Sales</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row) => (
                  <tr key={row.productId} className="border-t border-[var(--border-soft)]">
                    <td className="px-2 py-3">{productMap.get(row.productId) || row.productId}</td>
                    <td className="px-2 py-3 font-semibold">{row._sum.quantity ?? 0}</td>
                    <td className="px-2 py-3 font-semibold">{formatCedis(row._sum.totalPrice ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5">
          <h2 className="text-lg font-black">Customers by Account Type</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {customerSummary.map((row) => (
              <span key={row.accountType} className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${tone(row.accountType)}`}>
                {row.accountType}: {row._count._all}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
