import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { getTrackedEvents } from "@/lib/analytics.events";
import { listWarehouses } from "@/lib/warehouse-routing";

async function getAdvancedSummary() {
  const days = 30;
  const from = new Date();
  from.setDate(from.getDate() - days);

  const [paidOrders, allOrders, quotes, users] = await Promise.all([
    prisma.order.count({ where: { status: "PAID", createdAt: { gte: from } } }),
    prisma.order.count({ where: { createdAt: { gte: from } } }),
    prisma.quote.count({ where: { createdAt: { gte: from } } }),
    prisma.user.count(),
  ]);

  const events = await getTrackedEvents(300);

  return {
    eventCount: events.length,
    reports: {
      summary: {
        users,
        allOrders,
        paidOrders,
        quotes,
        conversionRate: allOrders > 0 ? Math.round((paidOrders / allOrders) * 10000) / 100 : 0,
      },
    },
    warehouses: listWarehouses(),
  };
}

export default async function AdminAdvancedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const data = await getAdvancedSummary();

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Advanced Stack</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Automation & Intelligence</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Operational console for search, risk, analytics, returns, credit terms, and fulfillment routing.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Tracked Events</p>
          <p className="mt-2 text-2xl font-black">{data.eventCount}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">30-Day Orders</p>
          <p className="mt-2 text-2xl font-black">{data.reports?.summary?.allOrders ?? 0}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">30-Day Paid</p>
          <p className="mt-2 text-2xl font-black">{data.reports?.summary?.paidOrders ?? 0}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Warehouses</p>
          <p className="mt-2 text-2xl font-black">{data.warehouses.length}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/returns" className="soft-card rounded-2xl p-4 hover:bg-[var(--surface-2)]">
          <p className="text-sm font-black">Returns Automation</p>
          <p className="text-xs text-[var(--muted-foreground)]">Review and process return requests.</p>
        </Link>
        <Link href="/admin/credit" className="soft-card rounded-2xl p-4 hover:bg-[var(--surface-2)]">
          <p className="text-sm font-black">B2B Credit Terms</p>
          <p className="text-xs text-[var(--muted-foreground)]">Set net terms and credit limits for wholesale users.</p>
        </Link>
      </section>
    </div>
  );
}

