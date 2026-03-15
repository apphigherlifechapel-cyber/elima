import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Order, OrderStatus } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";

function statusTone(status: string) {
  if (status === "PAID" || status === "DELIVERED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PENDING" || status === "PROCESSING") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "CANCELLED" || status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  type OrderStatusCount = { status: OrderStatus; _count: { _all: number } };
  type RecentOrderRow = Order & { user: { email: string } | null };
  const [dailyPaidOrders, ordersByStatus, lowStockCount, recentOrders, activeQuotes, wholesalePending]: [
    { _sum: { total: number | null }; _count: { _all: number } },
    OrderStatusCount[],
    number,
    RecentOrderRow[],
    number,
    number
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: startOfDay } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.count({
      where: {
        isAvailable: true,
        stockTotal: { lte: 10 },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true } } },
    }),
    prisma.quote.count({ where: { status: { in: ["SUBMITTED", "REVIEWING"] } } }),
    prisma.wholesaleApplication.count({ where: { status: "PENDING" } }),
  ]);

  const modules = [
    { href: "/admin/products", label: "Products", desc: "Catalog, pricing, stock, media" },
    { href: "/admin/orders", label: "Orders", desc: "Payment and fulfillment operations" },
    { href: "/admin/quotes", label: "Quotes", desc: "Review, price, convert wholesale quotes" },
    { href: "/admin/wholesale-applications", label: "Wholesale", desc: "Approve or reject reseller applications" },
    { href: "/admin/customers", label: "Customers", desc: "Account and lifetime value overview" },
    { href: "/admin/inventory", label: "Inventory", desc: "Low-stock monitoring and adjustments" },
    { href: "/admin/discounts", label: "Discounts", desc: "Campaign and coupon management" },
    { href: "/admin/settings", label: "Settings", desc: "Store configuration and banners" },
    { href: "/admin/reports", label: "Reports", desc: "30-day performance and sales mix" },
    { href: "/admin/observability", label: "Observability", desc: "Request IDs, warnings, errors, and alert thresholds" },
  ];

  return (
    <div className="space-y-8">
      <section className="soft-card rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Control Center</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
          Live operations snapshot for orders, stock, wholesale approvals, and quote activity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="soft-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Today Sales</p>
          <p className="mt-2 text-2xl font-black">{formatCedis(dailyPaidOrders._sum.total ?? 0)}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{dailyPaidOrders._count._all} paid order(s)</p>
        </div>
        <div className="soft-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Low Stock Alerts</p>
          <p className="mt-2 text-2xl font-black">{lowStockCount}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Items at or under threshold</p>
        </div>
        <div className="soft-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Wholesale Pipeline</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold">{wholesalePending} pending applications</p>
            <p className="font-semibold">{activeQuotes} active quotes</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Recent Orders</h2>
            <Link href="/admin/orders" className="btn-secondary text-xs">View All</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border-soft)]">
                    <td className="px-2 py-3 font-mono text-xs">{order.id.slice(0, 10)}...</td>
                    <td className="px-2 py-3">{order.user?.email || "-"}</td>
                    <td className="px-2 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-semibold">{formatCedis(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-black">Orders by Status</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {ordersByStatus.map((row) => (
              <span key={row.status} className={`inline-flex rounded-full border px-3 py-1.5 font-bold ${statusTone(row.status)}`}>
                {row.status}: {row._count._all}
              </span>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-black uppercase tracking-[0.13em] text-[var(--muted-foreground)]">Modules</h3>
          <div className="mt-3 grid gap-2">
            {modules.map((module) => (
              <Link key={module.href} href={module.href} className="group rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 hover:bg-[var(--surface-2)]">
                <p className="text-sm font-bold">{module.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{module.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
